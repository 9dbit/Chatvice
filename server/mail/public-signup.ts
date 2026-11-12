/** Public Mail enrollment: verified external contact first, then atomic standalone onboarding.
 * Feature is disabled until the operator provides a verified sender and Turnstile credentials.
 * Only a selected pre-verified, managed domain may be provisioned; no public domain claims.
 */
import type {Express,Request,Response} from "express";
import type {PoolClient} from "pg";
import {createHash,createHmac,randomBytes,randomUUID} from "node:crypto";
import {z} from "zod";
import {pool} from "../db";
import {normalizeEmail} from "./security";
import {createStandaloneMailboxInTransaction,OnboardingError,onboardingConfigured,tokenHash} from "./onboarding";
import {sendResendMail} from "./provider";

const signupData=z.object({
  contactEmail:z.string().email().max(254).transform(v=>v.trim().toLowerCase()),
  localPart:z.string().trim().toLowerCase().regex(/^[a-z][a-z0-9._-]{2,31}$/),
  displayName:z.string().trim().max(80).default(""),
  turnstileToken:z.string().min(10).max(2048),
}).strict();
const verifyData=z.object({token:z.string().regex(/^[0-9a-f]{64}$/)}).strict();
const reserved=new Set([
  "admin","administrator","abuse","billing","chatvice","contact","help","hello",
  "hostmaster","info","legal","mail","mailer-daemon","master","no-reply","noreply",
  "postmaster","privacy","root","security","service","support","system","team",
  "webmaster","sales","press","office","staff","notifications","playground","64cor"
]);
const domainName=()=> (process.env.CHATVICE_MAIL_PUBLIC_SIGNUP_DOMAIN||"").toLowerCase().trim();
const appOrigin=()=>process.env.CHATVICE_MAIL_APP_ORIGIN||"";
const sender=()=> (process.env.CHATVICE_MAIL_PUBLIC_SIGNUP_FROM||"").trim().toLowerCase();
const secret=()=>process.env.CHATVICE_MAIL_SESSION_SECRET||"";
export function publicSignupConfigured(){
  const domain=domainName();
  return process.env.CHATVICE_MAIL_APP_ROLE==="isolated-mail" &&
    process.env.CHATVICE_MAIL_PUBLIC_SIGNUP_ENABLED==="true" &&
    domain==="chatvice.app" && onboardingConfigured(domain) &&
    !!process.env.CHATVICE_MAIL_INITIAL_TENANT &&
    /^[a-f0-9]{64}$/i.test(secret()) &&
    !!process.env.CHATVICE_MAIL_TURNSTILE_SITE_KEY &&
    !!process.env.CHATVICE_MAIL_TURNSTILE_SECRET &&
    sender()==="hello@chatvice.app";
}
export function safeSignupName(name:string){
  return /^[a-z][a-z0-9._-]{2,31}$/.test(name) &&
    !name.endsWith(".") && !name.startsWith(".") && !name.includes("..") &&
    !reserved.has(name) && !name.startsWith("chatvice") && !name.startsWith("admin");
}
function contactKey(address:string){
  return createHmac("sha256",secret()).update("mail-public-contact|"+address).digest("hex");
}
async function limit(key:string,maximum:number,window:"hour"|"day"){
  const now=new Date(),start=new Date(window==="hour"
    ? Math.floor(now.getTime()/3600000)*3600000
    : Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()));
  const digest=createHmac("sha256",secret()).update("mail-public-rate|"+key).digest("hex");
  const q=await pool.query(`INSERT INTO mail_login_limits(key_hash,window_start,attempts) VALUES($1,$2,1)
    ON CONFLICT(key_hash,window_start) DO UPDATE SET attempts=mail_login_limits.attempts+1
    RETURNING attempts`,[digest,start]);
  if(Number(q.rows[0].attempts)>maximum)throw new OnboardingError(429,"Too many requests. Please try again later.");
}
export async function verifySignupTurnstile(response:string,ip:string){
  const form=new URLSearchParams({
    secret:process.env.CHATVICE_MAIL_TURNSTILE_SECRET||"",
    response,
    remoteip:ip,
  });
  try{
    const result=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{
      method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},
      body:form,signal:AbortSignal.timeout(10000),
    });
    if(!result.ok)return false;
    const parsed=await result.json() as {success?:boolean;hostname?:string;action?:string};
    return parsed.success===true && parsed.hostname===new URL(appOrigin()).hostname &&
      parsed.action==="mail_signup";
  }catch{return false;}
}
export async function requestPublicSignup(data:unknown,ip:string){
  if(!publicSignupConfigured())throw new OnboardingError(503,"Public signup is not available yet.");
  const value=signupData.parse(data);
  const contact=normalizeEmail(value.contactEmail);
  if(!contact || contact!==value.contactEmail || contact.endsWith("@chatvice.app") ||
     !safeSignupName(value.localPart))throw new OnboardingError(400,"Use an existing external email and a different mailbox name.");
  if(!await verifySignupTurnstile(value.turnstileToken,ip))
    throw new OnboardingError(403,"Human verification failed. Please retry.");
  await limit("ip-hour|"+ip,3,"hour");
  await limit("ip-day|"+ip,10,"day");
  await limit("contact-day|"+contactKey(contact),3,"day");
  await limit("name-hour|"+value.localPart,5,"hour");
  const tenant=process.env.CHATVICE_MAIL_INITIAL_TENANT!;
  const q=await pool.query(`SELECT id FROM mail_domains WHERE tenant_id=$1 AND domain=$2 AND status='verified'`,[tenant,domainName()]);
  if(q.rowCount!==1)throw new OnboardingError(503,"Mail domain is temporarily unavailable.");
  const domainId=q.rows[0].id,contactDigest=contactKey(contact);
  const taken=await pool.query(`SELECT 1 WHERE
    EXISTS(SELECT 1 FROM mail_mailboxes WHERE domain_id=$1 AND local_part=$2) OR
    EXISTS(SELECT 1 FROM mail_aliases WHERE domain_id=$1 AND local_part=$2) OR
    EXISTS(SELECT 1 FROM mail_public_signups WHERE contact_key=$3 AND completed_at IS NOT NULL)`,[domainId,value.localPart,contactDigest]);
  // Do not enumerate existing addresses or contact registrations.
  if(taken.rowCount)return {accepted:true};
  const token=randomBytes(32).toString("hex"),id=randomUUID(),digest=tokenHash(token);
  await pool.query(`INSERT INTO mail_public_signups(token_hash,tenant_id,domain_id,local_part,display_name,contact_key,expires_at)
    VALUES($1,$2,$3,$4,$5,$6,now()+interval '30 minutes')`,[
    digest,tenant,domainId,value.localPart,value.displayName,contactDigest
  ]);
  try{
    const verifyUrl=appOrigin()+"/signup/verify#token="+token;
    const provider=await sendResendMail({
      id,from:sender(),to:[contact],cc:[],bcc:[],
      subject:"Confirm your Chatvice Mail signup",
      text:"Confirm the mailbox "+value.localPart+"@"+domainName()+" by opening this link within 30 minutes:\n"+
        verifyUrl+"\n\nIf you did not request a mailbox, ignore this message.",
    },process.env.RESEND_API_KEY!);
    await pool.query("UPDATE mail_public_signups SET provider_id=$2 WHERE token_hash=$1",[digest,provider]);
  }catch{
    await pool.query("DELETE FROM mail_public_signups WHERE token_hash=$1 AND completed_at IS NULL",[digest]);
    throw new OnboardingError(503,"Verification email is temporarily unavailable. Please retry.");
  }
  return {accepted:true};
}
export async function completePublicSignup(input:unknown,ip:string){
  if(!publicSignupConfigured())throw new OnboardingError(503,"Public signup is not available yet.");
  const value=verifyData.parse(input);
  await limit("verify-ip|"+ip,15,"hour");
  await limit("verify-token|"+createHash("sha256").update(value.token).digest("hex"),5,"hour");
  const c=await pool.connect();
  try{
    await c.query("BEGIN");
    const q=await c.query(`SELECT token_hash,tenant_id,domain_id,local_part,display_name,contact_key
      FROM mail_public_signups
      WHERE token_hash=$1 AND provider_id IS NOT NULL AND completed_at IS NULL AND expires_at>now()
      FOR UPDATE`,[tokenHash(value.token)]);
    if(!q.rowCount)throw new OnboardingError(410,"Verification link expired or already used. Please sign up again.");
    const row=q.rows[0];
    const used=await c.query("SELECT 1 FROM mail_public_signups WHERE contact_key=$1 AND completed_at IS NOT NULL",[row.contact_key]);
    if(used.rowCount)throw new OnboardingError(409,"This contact already has a mailbox.");
    const created=await createStandaloneMailboxInTransaction(c,row.tenant_id,{
      domainId:row.domain_id,localPart:row.local_part,displayName:row.display_name,
    });
    await c.query(`UPDATE mail_public_signups SET completed_at=now(),mailbox_id=$2 WHERE token_hash=$1`,[row.token_hash,created.id]);
    await c.query("COMMIT");
    return {address:created.address,activationUrl:created.activationUrl,status:"awaiting_activation"};
  }catch(e){
    await c.query("ROLLBACK");
    if((e as any)?.code==="23505")throw new OnboardingError(409,"Mailbox name is no longer available. Please sign up again.");
    throw e;
  }finally{c.release();}
}
/** Public accounts cannot upload attachments, even to drafts. */
export async function isPublicMailbox(mailboxId:string){
  const q=await pool.query("SELECT 1 FROM mail_public_signups WHERE mailbox_id=$1 AND completed_at IS NOT NULL",[mailboxId]);
  return !!q.rowCount;
}
/** Bound to a verified-public mailbox, not every account sharing the Mail tenant. */
export async function consumePublicSendAllowance(c:PoolClient,mailboxId:string,recipientCount:number,attachments:number){
  const q=await c.query(`SELECT token_hash FROM mail_public_signups
    WHERE mailbox_id=$1 AND completed_at IS NOT NULL FOR UPDATE`,[mailboxId]);
  if(!q.rowCount)return;
  if(recipientCount>3)throw new OnboardingError(429,"Public accounts can send to at most 3 recipients per message.");
  if(attachments>0)throw new OnboardingError(409,"Attachments are not available for public trial accounts.");
  const r=await c.query(`INSERT INTO mail_public_send_limits(mailbox_id,window_start,used)
    VALUES($1,(now() AT TIME ZONE 'UTC')::date,1)
    ON CONFLICT(mailbox_id,window_start) DO UPDATE SET used=mail_public_send_limits.used+1
    WHERE mail_public_send_limits.used<10 RETURNING used`,[mailboxId]);
  if(!r.rowCount)throw new OnboardingError(429,"Public trial daily sending limit reached (10 messages).");
}
const safe=(fn:(req:Request,res:Response)=>Promise<unknown>)=>(req:Request,res:Response)=>{
  void fn(req,res).catch(error=>{
    if(error instanceof OnboardingError)return res.status(error.status).json({error:error.message});
    if(error instanceof z.ZodError)return res.status(400).json({error:"Check the signup fields and retry."});
    return res.status(503).json({error:"Signup is temporarily unavailable."});
  });
};
export function registerMailPublicSignup(app:Express){
  app.get("/api/mail-auth/signup/config",(_req,res)=>{
    res.setHeader("Cache-Control","no-store");
    const enabled=publicSignupConfigured();
    res.json({enabled,domain:enabled?domainName():null,siteKey:enabled?process.env.CHATVICE_MAIL_TURNSTILE_SITE_KEY:null});
  });
  app.post("/api/mail-auth/signup/request",safe(async(req,res)=>{
    const result=await requestPublicSignup(req.body,req.ip||"unknown");
    res.status(202).json(result);
  }));
  app.post("/api/mail-auth/signup/verify",safe(async(req,res)=>{
    res.json(await completePublicSignup(req.body,req.ip||"unknown"));
  }));
}
