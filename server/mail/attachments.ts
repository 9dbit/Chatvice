import {isPublicMailbox} from "./public-signup";
import type { Express, Request, Response, NextFunction } from "express";
import {createHmac,timingSafeEqual} from "node:crypto";
import multer from "multer";
import { pool } from "../db";
import { cleanMailFilename, type ResendReceivedAttachment } from "./resend-attachments";
import { scanMailAttachment } from "./scanner";
import {
  MAX_MAIL_ATTACHMENT_BYTES, getPrivateAttachment, putPrivateAttachment,
  newPrivateAttachmentKey, attachmentKeyFromProviderId, isMailObjectStorageConfigured,
  deletePrivateAttachment,
} from "./object-store";
import type { IngestedMessageRef } from "./ingest";
import { registerAttachment, MailAttachmentPolicyError } from "./attachment-quota";
import {MAIL_SHARE_LINK_DAYS,MAIL_ATTACHMENT_LIMIT_LABEL,MAX_MAIL_MESSAGE_ATTACHMENT_BYTES} from "../../shared/mail-policy";

function principal(req:Request):{tenantId:string;userId:string;merchant:boolean}|null{
  const s=req.session as any;
  if(!s?.userId || !s?.merchantId || !["merchant","supervisor"].includes(s.userType))return null;
  if(s.userType==="merchant" && s.userId!==s.merchantId)return null;
  return {tenantId:s.merchantId,userId:s.userId,merchant:s.userType==="merchant"};
}
function validId(id:unknown):id is string{
  return typeof id==="string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}
function reportError(res:Response):void{
  res.status(503).json({error:"Private attachment operation unavailable"});
}
async function checkMessage(req:Request,messageId:string,write:boolean):Promise<null|{tenantId:string;boxId:string;status:string}>{
  const p=principal(req);
  if(!p)return null;
  const q=await pool.query<{tenant_id:string;mailbox_id:string;status:string}>(`
    SELECT m.tenant_id,m.mailbox_id,m.status FROM mail_messages m
    JOIN mail_mailboxes b ON b.id=m.mailbox_id AND b.tenant_id=m.tenant_id
    WHERE m.id=$1 AND m.tenant_id=$2 AND b.enabled=true
      AND ($3::boolean OR EXISTS(
        SELECT 1 FROM mail_memberships mm WHERE mm.mailbox_id=b.id
        AND mm.tenant_id=$2 AND mm.user_id=$4
        AND ($5::boolean=false OR mm.role IN ('owner','member'))
      )) LIMIT 1`,
    [messageId,p.tenantId,p.merchant,p.userId,write]);
  return q.rowCount?{tenantId:q.rows[0].tenant_id,boxId:q.rows[0].mailbox_id,status:q.rows[0].status}:null;
}
async function allowedAttachment(req:Request,attachmentId:string,write:boolean){
  const p=principal(req);if(!p)return null;
  const q=await pool.query<{
    id:string;tenant_id:string;message_id:string;object_key:string;
    original_filename:string;media_type:string;size_bytes:string;scan_status:string;
  }>(`
    SELECT a.id,a.tenant_id,a.message_id,a.object_key,a.original_filename,a.media_type,
      a.size_bytes,a.scan_status
    FROM mail_attachments a
    JOIN mail_messages m ON m.id=a.message_id AND m.tenant_id=a.tenant_id
    JOIN mail_mailboxes b ON b.id=m.mailbox_id AND b.tenant_id=m.tenant_id
    WHERE a.id=$1 AND a.tenant_id=$2 AND b.enabled=true
      AND ($3::boolean OR EXISTS (
        SELECT 1 FROM mail_memberships mm WHERE mm.mailbox_id=b.id
        AND mm.tenant_id=$2 AND mm.user_id=$4
        AND ($5::boolean=false OR mm.role IN ('owner','member'))
      )) LIMIT 1`,[attachmentId,p.tenantId,p.merchant,p.userId,write]);
  return q.rows[0]||null;
}
const SHARE_WINDOW_SECONDS=MAIL_SHARE_LINK_DAYS*86400;
function shareSigningKey():Buffer{
  const value=process.env.CHATVICE_MAIL_ENCRYPTION_KEY||"";
  if(!/^[a-f0-9]{64}$/i.test(value))throw new Error("Mail share signing unavailable");
  return Buffer.from(value,"hex");
}
export function createMailShareToken(attachmentId:string,messageId:string,expiry:number):string{
  if(!validId(attachmentId)||!validId(messageId)||!Number.isSafeInteger(expiry)||expiry<1)throw new Error("Invalid mail share parameters");
  return createHmac("sha256",shareSigningKey()).update("chatvice-mail-share-v1|"+attachmentId+"|"+messageId+"|"+expiry).digest("hex");
}
function shareTokenValid(id:string,messageId:string,expiry:number,token:unknown):boolean{
  if(typeof token!=="string"||!/^[a-f0-9]{64}$/.test(token))return false;
  const expected=Buffer.from(createMailShareToken(id,messageId,expiry),"hex");
  return timingSafeEqual(expected,Buffer.from(token,"hex"));
}
function trustedObjectKey(key:string,tenantId:string,messageId:string){
  return key.startsWith(`mail/${tenantId}/${messageId}/`) &&
    /^mail\/[a-zA-Z0-9/_-]+$/.test(key);
}
function noActiveAttachment(filename:string){
  const ext=filename.toLowerCase().split(".").pop()||"";
  return !new Set(["exe","msi","bat","cmd","ps1","sh","vbs","js","mjs","html","htm","svg","scr","jar","lnk","url"]).has(ext);
}
export async function persistInboundMailAttachments(
  messages:IngestedMessageRef[], files:ResendReceivedAttachment[],
):Promise<{stored:number;duplicates:number}>{
  if(!files.length)return {stored:0,duplicates:0};
  if(!isMailObjectStorageConfigured())throw new Error("Private storage unavailable");
  let stored=0,duplicates=0;
  for(const message of messages)for(const file of files){
    const existing=await pool.query(`SELECT id FROM mail_attachments
      WHERE tenant_id=$1 AND message_id=$2 AND provider_attachment_id=$3`,[
      message.tenantId,message.id,file.providerId
    ]);
    if(existing.rowCount){duplicates++;continue;}
    const key=attachmentKeyFromProviderId(message.tenantId,message.id,file.providerId);
    const scan=noActiveAttachment(file.filename)?await scanMailAttachment(file.bytes):"blocked";
    // Malicious content must NEVER be written to retrievable object storage.
    if(scan!=="blocked")await putPrivateAttachment(key,file.bytes);
    const result=await registerAttachment({
      tenantId:message.tenantId,messageId:message.id,key,filename:file.filename,
      mediaType:file.mediaType,length:file.bytes.length,status:scan,
      providerId:file.providerId,expectedMessageStatus:"received"
    });
    if(result==="created")stored++;else duplicates++;
  }
  return {stored,duplicates};
}
const upload=multer({storage:multer.memoryStorage(),limits:{
  fileSize:MAX_MAIL_MESSAGE_ATTACHMENT_BYTES,files:1,fields:2,parts:3,fieldSize:2048
}});
// Per-worker burst guard. Mailbox quota is enforced transactionally in PostgreSQL.
// A distributed limiter should replace this when deploying multiple replicas.
const bursts=new Map<string,{count:number;until:number}>();
function uploadLimiter(req:Request,res:Response,next:NextFunction){
  const p=principal(req);
  if(!p)return res.sendStatus(401);
  const key=p.tenantId+":"+p.userId, now=Date.now();
  if(bursts.size>4096){
    for(const [k,v] of Array.from(bursts.entries())){if(v.until<now)bursts.delete(k);}
    if(bursts.size>4096)bursts.clear();
  }
  const previous=bursts.get(key),state=previous && previous.until>now
    ?{count:previous.count+1,until:previous.until}
    :{count:1,until:now+60000};
  bursts.set(key,state);
  if(state.count>120){
    res.setHeader("Retry-After",String(Math.max(1,Math.ceil((state.until-now)/1000))));
    return res.status(429).json({error:"Upload rate limit reached. Wait a moment, then add the remaining files."});
  }
  next();
}
// Limit simultaneous up to 40 MB legacy reads / 38 MB new uploads on this 500 MB single-replica
// Mail service. Shared DB mailbox quotas still handle aggregate stored bytes.
let activePrivateTransfers=0;
function limitMailTransfers() {
  return (_req:Request,res:Response,next:NextFunction)=>{
    // Shared global cap: a simultaneous 40 MB upload plus download must not
    // consume four large buffers on the 0.5 GB Mail service.
    if(activePrivateTransfers>=2){
      res.setHeader("Retry-After","5");
      return res.status(429).json({error:"Private file transfers are busy. Retry shortly."});
    }
    activePrivateTransfers++;
    let released=false;
    const release=()=>{
      if(released)return;
      released=true;activePrivateTransfers--;
    };
    res.once("finish",release);res.once("close",release);
    next();
  };
}
export function registerMailPublicShareRoute(app:Express):void{
  app.get("/api/mail/shared/:id",limitMailTransfers(),async(req,res)=>{
    res.setHeader("Cache-Control","private, no-store");
    res.setHeader("X-Robots-Tag","noindex, nofollow, noarchive");
    res.setHeader("X-Content-Type-Options","nosniff");
    const id=req.params.id,expires=Number(req.query.expires);
    if(!validId(id)||!Number.isSafeInteger(expires)||expires<=Math.floor(Date.now()/1000)||
       expires>Math.floor(Date.now()/1000)+SHARE_WINDOW_SECONDS)return res.sendStatus(404);
    try{
      const q=await pool.query<{id:string;message_id:string;tenant_id:string;object_key:string;original_filename:string;scan_status:string;status:string;queued_at:Date}>(`
        SELECT a.id,a.message_id,a.tenant_id,a.object_key,a.original_filename,a.scan_status,
          m.status,m.queued_at FROM mail_attachments a JOIN mail_messages m
          ON m.id=a.message_id AND m.tenant_id=a.tenant_id
          WHERE a.id=$1 AND m.direction='outbound' AND m.status IN ('sent','delivered')
          AND a.scan_status='clean' LIMIT 1`,[id]);
      const a=q.rows[0];
      if(!a||!a.queued_at||!shareTokenValid(id,a.message_id,expires,req.query.token)||
         expires!==Math.floor(new Date(a.queued_at).getTime()/1000)+SHARE_WINDOW_SECONDS||
         !trustedObjectKey(a.object_key,a.tenant_id,a.message_id))return res.sendStatus(404);
      const data=await getPrivateAttachment(a.object_key);
      const name=cleanMailFilename(a.original_filename),fallback=name.replace(/[^A-Za-z0-9._-]/g,"_").slice(0,120)||"attachment";
      res.setHeader("Content-Type","application/octet-stream");
      res.setHeader("Content-Disposition",`attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(name)}`);
      res.setHeader("Content-Length",String(data.length));
      return res.end(data);
    }catch{return res.sendStatus(404);}
  });
}
export function registerMailAttachmentRoutes(app:Express):void{
  app.get("/api/mail/messages/:id/attachments",async(req,res)=>{
    if(!validId(req.params.id))return res.sendStatus(400);
    try{
      const auth=await checkMessage(req,req.params.id,false);
      if(!auth)return res.sendStatus(404);
      const q=await pool.query(`SELECT id,original_filename,media_type,size_bytes,scan_status
        FROM mail_attachments WHERE message_id=$1 AND tenant_id=$2
        ORDER BY created_at ASC`,[req.params.id,auth.tenantId]);
      res.json(q.rows);
    }catch{reportError(res);}
  });
  app.post("/api/mail/messages/:id/attachments",uploadLimiter,limitMailTransfers(),async(req,res)=>{
    // XHR Abort cancels only this connection. A disconnected client must not
    // leave an invisible attachment in a draft after scanning/storage finish.
    let clientCancelled=false;
    const cancellation=new AbortController();
    res.once("close",()=>{
      if(!res.writableEnded){clientCancelled=true;cancellation.abort();}
    });
    if(process.env.CHATVICE_MAIL_ATTACHMENTS_ENABLED!=="true")
      return res.status(503).json({error:"Private attachment uploads are disabled"});
    if(!validId(req.params.id))return res.sendStatus(400);
    let auth:Awaited<ReturnType<typeof checkMessage>>;
    try{auth=await checkMessage(req,req.params.id,true);}
    catch{return reportError(res);}
    if(!auth)return res.sendStatus(404);
    try{if(await isPublicMailbox(auth.boxId))return res.status(403).json({error:"Attachments are not available for public trial accounts"});}
    catch{return reportError(res);}
    if(auth.status!=="draft")return res.status(409).json({error:"Attachments may only be added to drafts"});
    if(!isMailObjectStorageConfigured())return reportError(res);
    upload.single("file")(req,res,async err=>{
      if(clientCancelled)return;
      if(err)return res.status(413).json({error:err.code==="LIMIT_FILE_SIZE"?`Attachments exceed ${MAIL_ATTACHMENT_LIMIT_LABEL} total per email. Choose a smaller file.`:"Attachment exceeds upload policy"});
      if(!req.file?.buffer?.length)return res.status(400).json({error:"An attachment is required"});
      const filename=cleanMailFilename(req.file.originalname);
      const content=req.file.buffer;
      const key=newPrivateAttachmentKey(auth!.tenantId,req.params.id);
      let uploaded=false,storageAttempted=false,registered=false;
      try{
        const scan=noActiveAttachment(filename)?await scanMailAttachment(content,cancellation.signal):"blocked";
        if(clientCancelled)return;
        if(scan!=="blocked"){storageAttempted=true;await putPrivateAttachment(key,content,cancellation.signal);uploaded=true;}
        if(clientCancelled){
          if(uploaded)await deletePrivateAttachment(key).catch(()=>{});
          return;
        }
        await registerAttachment({
          tenantId:auth!.tenantId,messageId:req.params.id,key,filename,
          mediaType:(req.file?.mimetype||"application/octet-stream").slice(0,100),
          length:content.length,status:scan,expectedMessageStatus:"draft"
        });
        registered=true;
        const record=await pool.query(`SELECT id FROM mail_attachments
          WHERE tenant_id=$1 AND message_id=$2 AND object_key=$3 LIMIT 1`,[
          auth!.tenantId,req.params.id,key
        ]);
        if(clientCancelled){
          // If X was clicked while the DB was committing, revoke both the
          // exact upload row and its encrypted object. Never delete by name.
          await pool.query(`DELETE FROM mail_attachments
            WHERE tenant_id=$1 AND message_id=$2 AND object_key=$3`,
            [auth!.tenantId,req.params.id,key]).catch(()=>{});
          if(uploaded)await deletePrivateAttachment(key).catch(()=>{});
          return;
        }
        return res.status(201).json({id:record.rows[0]?.id,filename,sizeBytes:content.length,scanStatus:scan});
      }catch(err){
        if(registered){
          await pool.query(`DELETE FROM mail_attachments
            WHERE tenant_id=$1 AND message_id=$2 AND object_key=$3`,
            [auth!.tenantId,req.params.id,key]).catch(()=>{});
        }
        if(uploaded||storageAttempted)await deletePrivateAttachment(key).catch(()=>{});
        if(clientCancelled)return;
        if(err instanceof MailAttachmentPolicyError)
          return res.status(409).json({error:err.reason});
        return reportError(res);
      }
    });
  });
  app.get("/api/mail/attachments/:id/download",async(req,res)=>{
    if(!validId(req.params.id))return res.sendStatus(400);
    try{
      const a=await allowedAttachment(req,req.params.id,false);
      if(!a)return res.sendStatus(404);
      if(a.scan_status==="blocked")return res.status(410).json({error:"Attachment blocked"});
      if(a.scan_status!=="clean")return res.status(423).json({error:"Attachment awaiting security scan"});
      if(!trustedObjectKey(a.object_key,a.tenant_id,a.message_id))return reportError(res);
      const data=await getPrivateAttachment(a.object_key);
      const name=cleanMailFilename(a.original_filename);
      const fallback=name.replace(/[^A-Za-z0-9._-]/g,"_").slice(0,120)||"attachment";
      res.setHeader("Content-Type","application/octet-stream");
      res.setHeader("Content-Disposition",`attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(name)}`);
      res.setHeader("Cache-Control","private, no-store");
      res.setHeader("X-Content-Type-Options","nosniff");
      res.setHeader("Content-Length",String(data.length));
      return res.end(data);
    }catch{return reportError(res);}
  });
  app.delete("/api/mail/attachments/:id",async(req,res)=>{
    if(!validId(req.params.id))return res.sendStatus(400);
    try{
      const a=await allowedAttachment(req,req.params.id,true);
      if(!a)return res.sendStatus(404);
      const c=await pool.connect();
      try{
        await c.query("BEGIN");
        const m=await c.query("SELECT status FROM mail_messages WHERE id=$1 AND tenant_id=$2 FOR UPDATE",[a.message_id,a.tenant_id]);
        if(!m.rowCount||m.rows[0].status!=="draft"){
          await c.query("ROLLBACK");return res.status(409).json({error:"Only draft attachments can be removed"});
        }
        if(!trustedObjectKey(a.object_key,a.tenant_id,a.message_id))throw new Error("Invalid attachment key");
        if(a.scan_status!=="blocked")await deletePrivateAttachment(a.object_key);
        await c.query("DELETE FROM mail_attachments WHERE id=$1 AND tenant_id=$2 AND message_id=$3",[a.id,a.tenant_id,a.message_id]);
        await c.query("COMMIT");res.json({removed:true});
      }catch(e){await c.query("ROLLBACK");throw e;}finally{c.release();}
    }catch{reportError(res);}
  });
  app.post("/api/mail/attachments/:id/rescan",async(req,res)=>{
    if(process.env.CHATVICE_MAIL_ATTACHMENTS_ENABLED!=="true")
      return res.status(503).json({error:"Attachment scanning is disabled"});
    if(!validId(req.params.id))return res.sendStatus(400);
    try{
      const a=await allowedAttachment(req,req.params.id,true);
      if(!a)return res.sendStatus(404);
      if(a.scan_status==="blocked")return res.status(409).json({error:"Attachment was blocked"});
      if(!trustedObjectKey(a.object_key,a.tenant_id,a.message_id))return reportError(res);
      const data=await getPrivateAttachment(a.object_key);
      const verdict=noActiveAttachment(a.original_filename)?await scanMailAttachment(data):"blocked";
      if(verdict==="blocked")await deletePrivateAttachment(a.object_key).catch(()=>{});
      await pool.query("UPDATE mail_attachments SET scan_status=$1 WHERE id=$2 AND tenant_id=$3",
        [verdict,a.id,a.tenant_id]);
      res.json({scanStatus:verdict});
    }catch{return reportError(res);}
  });
}


