import express,{type Express} from "express";
import {createHmac,timingSafeEqual} from "node:crypto";
import {pool} from "../db";
import {normalizeEmail} from "./security";
import {onboardingEnabled,routerDomains} from "./onboarding";

export const ROUTE_HEADER="x-chatvice-route-v1";
export type RouteEnvelope={v:1;to:string;mid:string;id:string;ts:number};
export function verifyRouteEnvelope(value:unknown,messageId:unknown,secret:string,now=Date.now()):RouteEnvelope|null{
  if(typeof value!=="string"||value.length>1800||!/^[0-9a-f]{64}$/i.test(secret))return null;
  const match=/^([A-Za-z0-9_-]+)\.([a-f0-9]{64})$/.exec(value);if(!match)return null;
  const expected=createHmac("sha256",secret).update(match[1]).digest();
  if(!timingSafeEqual(Buffer.from(match[2],"hex"),expected))return null;
  try{
    const p=JSON.parse(Buffer.from(match[1],"base64url").toString("utf8"));
    if(p.v!==1||normalizeEmail(p.to)!==p.to||typeof p.mid!=="string"||p.mid.length>512||
      p.mid!==(typeof messageId==="string"?messageId:"")||!Number.isSafeInteger(p.ts)||
      p.ts>now+300000||p.ts<now-7*86400000||typeof p.id!=="string"||!/^[0-9a-f-]{36}$/.test(p.id))return null;
    return p;
  }catch{return null;}
}
export async function findManagedRecipient(address:string){
  if(normalizeEmail(address)!==address||!routerDomains().includes(address.split("@")[1]))return null;
  const q=await pool.query(`SELECT DISTINCT b.id,b.tenant_id FROM mail_mailbox_provisioning p
    JOIN mail_mailboxes b ON b.id=p.mailbox_id AND b.tenant_id=p.tenant_id
    JOIN mail_domains d ON d.id=b.domain_id AND d.tenant_id=b.tenant_id
    WHERE b.enabled=true AND d.status='verified' AND (b.local_part||'@'||d.domain=$1 OR EXISTS(
      SELECT 1 FROM mail_aliases a JOIN mail_domains ad ON ad.id=a.domain_id AND ad.tenant_id=a.tenant_id
      WHERE a.mailbox_id=b.id AND a.tenant_id=b.tenant_id AND ad.status='verified' AND a.local_part||'@'||ad.domain=$1))`,[address]);
  return q.rowCount===1?q.rows[0] as {id:string;tenant_id:string}:null;
}
export function registerMailRouterLookup(app:Express){
  // Authenticated before JSON parsing; this endpoint has no browser session access.
  app.post("/api/mail/router/recipient",(req,res,next)=>{
    const secret=process.env.CHATVICE_MAIL_ROUTER_SECRET||"",supplied=req.get("authorization")||"";
    const expected="Bearer "+secret;
    if(!onboardingEnabled()||!/^[a-f0-9]{64}$/i.test(secret)||supplied.length!==expected.length||
      !timingSafeEqual(Buffer.from(supplied),Buffer.from(expected)))return res.sendStatus(401);
    next();
  },express.json({limit:"2kb"}),async(req,res)=>{
    try{const address=typeof req.body?.address==="string"?req.body.address:"";
      const box=await findManagedRecipient(address);return res.sendStatus(box?204:404);
    }catch{return res.sendStatus(503);}
  });
}
export async function resolveRoutedRecipient(received:Record<string,unknown>){
  const headers=received.headers&&typeof received.headers==="object"?Object.entries(received.headers):[];
  const values=headers.filter(([k])=>k.toLowerCase()===ROUTE_HEADER).map(([,v])=>v);
  const destinations=[...(Array.isArray(received.received_for)?received.received_for:[]),...(Array.isArray(received.to)?received.to:[])];
  const central=process.env.CHATVICE_MAIL_ROUTER_FORWARD_TO||"";
  const isCentral=!!central&&destinations.some(x=>normalizeEmail(x)===central);
  if(!isCentral&&!values.length)return null; // Preserve existing exact-address routing.
  const envelope=values.length===1?verifyRouteEnvelope(values[0],received.message_id,process.env.CHATVICE_MAIL_ROUTER_SECRET||""):null;
  if(!envelope)return isCentral?{ignored:true as const}:null;
  if(!onboardingEnabled())throw new Error("Router temporarily unavailable");
  const box=await findManagedRecipient(envelope.to);
  if(!box)return {ignored:true as const};
  return {ignored:false as const,recipient:envelope.to,mailbox:box,eventId:"router:"+envelope.id};
}
