import type {Express, Request, Response} from "express";
import {createHash,createHmac,randomBytes,randomUUID} from "node:crypto";
import type {PoolClient} from "pg";
import {z} from "zod";
import {pool} from "../db";
import {encryptMailField,decryptMailField} from "./crypto";
import {hashMailPassword} from "./password";
import {sendResendMail,MailProviderError} from "./provider";

export const onboardingEnabled=()=>process.env.CHATVICE_MAIL_APP_ROLE==="isolated-mail" && process.env.CHATVICE_MAIL_ONBOARDING_ENABLED==="true";
export const routerDomains=()=> (process.env.CHATVICE_MAIL_ROUTER_DOMAINS||"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);
export const tokenHash=(token:string)=>createHash("sha256").update(token).digest("hex");
export function onboardingConfigured(domain:string){
  return onboardingEnabled() && routerDomains().includes(domain.toLowerCase()) &&
    /^[0-9a-f]{64}$/i.test(process.env.CHATVICE_MAIL_ROUTER_SECRET||"") &&
    /^https:\/\/[a-z0-9.-]+$/.test(process.env.CHATVICE_MAIL_APP_ORIGIN||"") &&
    !!process.env.CHATVICE_MAIL_ROUTER_FORWARD_TO && process.env.CHATVICE_MAIL_OUTBOUND_ENABLED==="true" && !!process.env.RESEND_API_KEY;
}
export class OnboardingError extends Error {constructor(public status:number,message:string){super(message);}}
const uuid=z.string().uuid();
const creation=z.object({domainId:uuid,localPart:z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9._+-]{0,63}$/),displayName:z.string().max(120).default("")});
const activation=z.object({token:z.string().regex(/^[0-9a-f]{64}$/),password:z.string().min(16).max(256)});
function probe(tenant:string){
  const id=randomUUID(),token=randomBytes(32).toString("hex");
  return {id,hash:tokenHash(token),secret:encryptMailField(tenant,id,"message-text",token)};
}
async function invite(c:PoolClient,tenant:string,box:string,login:string){
  const token=randomBytes(32).toString("hex");
  await c.query("UPDATE mail_account_invitations SET used_at=now() WHERE login_id=$1 AND used_at IS NULL",[login]);
  const q=await c.query(`INSERT INTO mail_account_invitations(token_hash,tenant_id,mailbox_id,login_id,expires_at)
    VALUES($1,$2,$3,$4,now()+interval '24 hours') RETURNING expires_at`,[tokenHash(token),tenant,box,login]);
  return {activationUrl:process.env.CHATVICE_MAIL_APP_ORIGIN+"/activate#token="+token,expiresAt:q.rows[0].expires_at};
}
export async function createStandaloneMailbox(tenant:string,input:unknown){
  const d=creation.parse(input),c=await pool.connect();
  try{
    await c.query("BEGIN");
    const q=await c.query("SELECT domain,status FROM mail_domains WHERE id=$1 AND tenant_id=$2 FOR UPDATE",[d.domainId,tenant]);
    if(!q.rowCount)throw new OnboardingError(404,"Domain not found");
    const domain=q.rows[0];
    if(domain.status!=="verified"||!onboardingConfigured(domain.domain))throw new OnboardingError(409,"Automatic setup is not connected for this domain yet");
    const address=d.localPart+"@"+domain.domain;
    const duplicate=await c.query(`SELECT 1 FROM mail_aliases WHERE domain_id=$1 AND local_part=$2
      UNION ALL SELECT 1 FROM mail_mailboxes WHERE domain_id=$1 AND local_part=$2
      UNION ALL SELECT 1 FROM mail_login_users WHERE email=$3 LIMIT 1`,[d.domainId,d.localPart,address]);
    if(duplicate.rowCount)throw new OnboardingError(409,"This address already exists; no duplicate was created");
    const id=randomUUID(),login=randomUUID(),user="mail-"+randomUUID(),p=probe(tenant);
    await c.query("INSERT INTO mail_mailboxes(id,tenant_id,domain_id,local_part,display_name) VALUES($1,$2,$3,$4,$5)",[id,tenant,d.domainId,d.localPart,d.displayName]);
    await c.query("INSERT INTO supervisors(id,merchant_id) VALUES($1,$2)",[user,tenant]);
    // This deliberately invalid password hash cannot authenticate. The owner sets the first password.
    await c.query(`INSERT INTO mail_login_users(id,tenant_id,user_id,email,password_hash,is_admin,enabled)
      VALUES($1,$2,$3,$4,'scrypt1.pending',false,false)`,[login,tenant,user,address]);
    await c.query("INSERT INTO mail_memberships(id,tenant_id,mailbox_id,user_id,role) VALUES($1,$2,$3,$4,'member')",[randomUUID(),tenant,id,user]);
    await c.query(`INSERT INTO mail_mailbox_provisioning(mailbox_id,tenant_id,login_id,probe_id,probe_hash,probe_secret)
      VALUES($1,$2,$3,$4,$5,$6)`,[id,tenant,login,p.id,p.hash,p.secret]);
    const invitation=await invite(c,tenant,id,login);
    await c.query("COMMIT");
    return {id,address,enabled:true,accountMode:"standalone",status:"pending",...invitation};
  }catch(e){await c.query("ROLLBACK");throw e;}finally{c.release();}
}

// The admin routes are registered after Mail session authentication and origin protection.
function admin(req:Request){const s=req.session as any;return s?.userType==="merchant"&&s.userId===s.merchantId?s.merchantId:null;}
const safe=(fn:(req:Request,res:Response)=>Promise<unknown>)=>(req:Request,res:Response)=>{void fn(req,res).catch(e=>{
  const status=e instanceof OnboardingError?e.status:e instanceof z.ZodError?400:(e as any)?.code==="23505"?409:503;
  res.status(status).json({error:e instanceof OnboardingError?e.message:status===400?"Invalid request":status===409?"Address already exists":"Mailbox setup temporarily unavailable"});
});};
export function registerMailOnboardingAdmin(app:Express){
  app.get("/api/mail/onboarding/status",safe(async(req,res)=>{
    const tenant=admin(req);if(!tenant)return res.sendStatus(403);
    if(!onboardingEnabled())return res.json({enabled:false,domains:[],mailboxes:[]});
    const q=await pool.query(`SELECT p.mailbox_id,p.state,p.last_error,p.inbound_verified_at,p.attempts,
      u.enabled AS login_enabled,b.enabled AS mailbox_enabled,d.domain,d.status AS domain_status,
      EXISTS(SELECT 1 FROM mail_account_invitations i WHERE i.login_id=u.id AND i.used_at IS NULL AND i.expires_at>now()) AS invitation_valid
      FROM mail_mailbox_provisioning p JOIN mail_login_users u ON u.id=p.login_id AND u.tenant_id=p.tenant_id
      JOIN mail_mailboxes b ON b.id=p.mailbox_id AND b.tenant_id=p.tenant_id
      JOIN mail_domains d ON d.id=b.domain_id AND d.tenant_id=b.tenant_id WHERE p.tenant_id=$1`,[tenant]);
    res.json({enabled:true,domains:routerDomains().filter(onboardingConfigured),inboundLimitBytes:25*1024*1024,
      mailboxes:q.rows.map(x=>({...x,status:!x.mailbox_enabled?"disabled":x.domain_status!=="verified"||!onboardingConfigured(x.domain)?"domain_unavailable":x.state!=="verified"?x.state:x.login_enabled?"ready":"awaiting_activation"}))});
  }));
  for(const action of ["invitation","retry"]){
    app.post(`/api/mail/mailboxes/:id/onboarding/${action}`,safe(async(req,res)=>{
      const tenant=admin(req);if(!tenant)return res.sendStatus(403);
      if(!onboardingEnabled())return res.sendStatus(404);
      const id=uuid.parse(req.params.id),c=await pool.connect();
      try{
        await c.query("BEGIN");
        const q=await c.query(`SELECT p.*,u.enabled,u.is_admin,u.credential_version,u.password_hash FROM mail_mailbox_provisioning p
          JOIN mail_login_users u ON u.id=p.login_id AND u.tenant_id=p.tenant_id
          WHERE p.mailbox_id=$1 AND p.tenant_id=$2 FOR UPDATE OF p,u`,[id,tenant]);
        if(!q.rowCount)throw new OnboardingError(404,"Managed mailbox not found");
        const row=q.rows[0];let result:unknown={status:row.state};
        if(action==="invitation"){
          if(row.enabled||row.is_admin||row.credential_version!==1||row.password_hash!=="scrypt1.pending")throw new OnboardingError(409,"Account already activated; this action cannot reset its password");
          result=await invite(c,tenant,id,row.login_id);
        }else{
          if(row.state==="verified")throw new OnboardingError(409,"Routing already verified");
          if(row.state!=="failed")throw new OnboardingError(409,"Automatic checks are still running");
          const p=probe(tenant);
          await c.query(`UPDATE mail_mailbox_provisioning SET state='pending',probe_id=$2,probe_hash=$3,probe_secret=$4,
            deadline=now()+interval '15 minutes',attempts=0,next_attempt_at=now(),lease_until=NULL,last_error=NULL,
            provider_id=NULL,inbound_verified_at=NULL,updated_at=now() WHERE mailbox_id=$1`,[id,p.id,p.hash,p.secret]);
          result={status:"pending"};
        }
        await c.query("COMMIT");res.json(result);
      }catch(e){await c.query("ROLLBACK");throw e;}finally{c.release();}
    }));
  }
}

async function activationRate(req:Request,token:string){
  const secret=process.env.CHATVICE_MAIL_SESSION_SECRET||"";
  if(secret.length<32)throw new OnboardingError(503,"Account activation unavailable");
  const bucket=new Date(Math.floor(Date.now()/900000)*900000);
  for(const key of ["activation-ip|"+req.ip,"activation-token|"+tokenHash(token)]){
    const hash=createHmac("sha256",secret).update(key).digest("hex");
    const q=await pool.query(`INSERT INTO mail_login_limits(key_hash,window_start,attempts) VALUES($1,$2,1)
      ON CONFLICT(key_hash,window_start) DO UPDATE SET attempts=mail_login_limits.attempts+1 RETURNING attempts`,[hash,bucket]);
    if(q.rows[0].attempts>30)throw new OnboardingError(429,"Too many attempts; try again in 15 minutes");
  }
}
export async function activateMailbox(token:string,password:string){
  activation.parse({token,password});
  const c=await pool.connect();
  try{
    await c.query("BEGIN");
    // Same lock order as invitation rotation: provisioning, login, then invitation.
    const q=await c.query(`SELECT p.mailbox_id,p.tenant_id,u.id AS login_id,u.email,i.token_hash
      FROM mail_account_invitations i JOIN mail_mailbox_provisioning p ON p.mailbox_id=i.mailbox_id AND p.tenant_id=i.tenant_id AND p.login_id=i.login_id
      JOIN mail_login_users u ON u.id=p.login_id AND u.tenant_id=p.tenant_id
      JOIN mail_mailboxes b ON b.id=p.mailbox_id AND b.tenant_id=p.tenant_id
      JOIN mail_domains d ON d.id=b.domain_id AND d.tenant_id=b.tenant_id
      WHERE i.token_hash=$1 AND i.used_at IS NULL AND i.expires_at>now() AND u.enabled=false AND u.is_admin=false AND u.credential_version=1 AND u.password_hash='scrypt1.pending'
      AND b.enabled=true AND d.status='verified' AND EXISTS(SELECT 1 FROM mail_memberships m
        WHERE m.mailbox_id=b.id AND m.tenant_id=b.tenant_id AND m.user_id=u.user_id AND m.role='member')
      FOR UPDATE OF p,u,i`,[tokenHash(token)]);
    if(!q.rowCount)throw new OnboardingError(410,"Activation link expired or already used. Ask your administrator for a new link");
    const row=q.rows[0],hash=await hashMailPassword(password);
    await c.query("UPDATE mail_login_users SET password_hash=$2,enabled=true,credential_version=credential_version+1 WHERE id=$1",[row.login_id,hash]);
    await c.query("UPDATE mail_account_invitations SET used_at=now() WHERE token_hash=$1",[row.token_hash]);
    await c.query("COMMIT");return {email:row.email,activated:true};
  }catch(e){await c.query("ROLLBACK");throw e;}finally{c.release();}
}
export function registerMailActivation(app:Express){
  app.post("/api/mail-auth/activate",safe(async(req,res)=>{
    if(!onboardingEnabled())return res.sendStatus(404);
    const d=activation.parse(req.body);await activationRate(req,d.token);
    res.json(await activateMailbox(d.token,d.password));
  }));
}

export async function acceptProvisioningProbe(mailboxId:string,text:string){
  const match=/^CHATVICE-SETUP-V1:([0-9a-f-]{36}):([0-9a-f]{64})\s*$/m.exec(text);
  if(!match)return false;
  const q=await pool.query(`UPDATE mail_mailbox_provisioning SET state='verified',inbound_verified_at=COALESCE(inbound_verified_at,now()),
    probe_secret='',lease_until=NULL,last_error=NULL,updated_at=now()
    WHERE mailbox_id=$1 AND probe_id=$2 AND probe_hash=$3 AND (deadline>now() OR state='verified') RETURNING mailbox_id`,[mailboxId,match[1],tokenHash(match[2])]);
  return !!q.rowCount;
}
let working=false;
export async function runProvisioningChecks(){
  if(working||!onboardingEnabled())return;
  working=true;
  try{
    await pool.query(`UPDATE mail_mailbox_provisioning SET state='failed',last_error='Delivery check timed out. Check domain routing, then retry.',
      lease_until=NULL,updated_at=now() WHERE state IN ('pending','checking') AND deadline<=now()`);
    const q=await pool.query(`UPDATE mail_mailbox_provisioning p SET state='checking',lease_until=now()+interval '45 seconds',
      attempts=attempts+1,next_attempt_at=now()+interval '2 minutes',updated_at=now()
      WHERE mailbox_id=(SELECT p2.mailbox_id FROM mail_mailbox_provisioning p2
        JOIN mail_mailboxes b ON b.id=p2.mailbox_id AND b.tenant_id=p2.tenant_id
        JOIN mail_domains d ON d.id=b.domain_id AND d.tenant_id=b.tenant_id
        WHERE p2.state IN ('pending','checking') AND p2.deadline>now() AND p2.attempts<5
        AND p2.next_attempt_at<=now() AND (p2.lease_until IS NULL OR p2.lease_until<now())
        AND b.enabled=true AND d.status='verified' ORDER BY p2.next_attempt_at FOR UPDATE OF p2 SKIP LOCKED LIMIT 1)
      RETURNING p.*,(SELECT b.local_part||'@'||d.domain FROM mail_mailboxes b JOIN mail_domains d ON d.id=b.domain_id WHERE b.id=p.mailbox_id) AS address`);
    if(!q.rowCount)return;
    const row=q.rows[0];
    try{
      if(!onboardingConfigured(row.address.split("@")[1]))throw new OnboardingError(503,"Domain setup is unavailable");
      const token=decryptMailField(row.tenant_id,row.probe_id,"message-text",row.probe_secret);
      const result=await sendResendMail({id:row.probe_id,from:row.address,to:[row.address],cc:[],bcc:[],
        subject:"Chatvice Mail setup verification",text:`CHATVICE-SETUP-V1:${row.probe_id}:${token}`},process.env.RESEND_API_KEY!);
      await pool.query("UPDATE mail_mailbox_provisioning SET provider_id=$2,lease_until=NULL,last_error=NULL WHERE mailbox_id=$1 AND probe_id=$3 AND state='checking'",[row.mailbox_id,result,row.probe_id]);
    }catch(e){
      const permanent=e instanceof MailProviderError && !e.retryable;
      await pool.query(`UPDATE mail_mailbox_provisioning SET state=$2,last_error=$3,lease_until=NULL,updated_at=now()
        WHERE mailbox_id=$1 AND probe_id=$4 AND state='checking'`,[row.mailbox_id,permanent?"failed":"checking",
        permanent?"Sending provider rejected the setup check. Review provider configuration, then retry.":"Setup check is waiting for the mail service; retrying automatically.",row.probe_id]);
    }
  }finally{working=false;}
}
export function startMailProvisioningWorker(){
  if(!onboardingEnabled())return;
  const tick=()=>{void runProvisioningChecks().catch(()=>console.error("[Mail] provisioning check unavailable"));};
  tick();setInterval(tick,5000).unref();
}
