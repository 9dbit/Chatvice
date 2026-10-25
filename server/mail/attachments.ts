import type { Express, Request, Response } from "express";
import multer from "multer";
import rateLimit from "express-rate-limit";
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
  fileSize:MAX_MAIL_ATTACHMENT_BYTES,files:1,fields:2,parts:3,fieldSize:2048
}});
const uploadLimiter=rateLimit({windowMs:60_000,limit:12,
  standardHeaders:"draft-7",legacyHeaders:false,
  message:{error:"Too many attachment upload attempts"}
});
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
  app.post("/api/mail/messages/:id/attachments",uploadLimiter,async(req,res)=>{
    if(!validId(req.params.id))return res.sendStatus(400);
    let auth:Awaited<ReturnType<typeof checkMessage>>;
    try{auth=await checkMessage(req,req.params.id,true);}
    catch{return reportError(res);}
    if(!auth)return res.sendStatus(404);
    if(auth.status!=="draft")return res.status(409).json({error:"Attachments may only be added to drafts"});
    if(!isMailObjectStorageConfigured())return reportError(res);
    upload.single("file")(req,res,async err=>{
      if(err)return res.status(413).json({error:"Attachment exceeds upload policy"});
      if(!req.file?.buffer?.length)return res.status(400).json({error:"An attachment is required"});
      const filename=cleanMailFilename(req.file.originalname);
      const content=req.file.buffer;
      const key=newPrivateAttachmentKey(auth!.tenantId,req.params.id);
      let uploaded=false;
      try{
        const scan=noActiveAttachment(filename)?await scanMailAttachment(content):"blocked";
        if(scan!=="blocked"){await putPrivateAttachment(key,content);uploaded=true;}
        await registerAttachment({
          tenantId:auth!.tenantId,messageId:req.params.id,key,filename,
          mediaType:(req.file?.mimetype||"application/octet-stream").slice(0,100),
          length:content.length,status:scan,expectedMessageStatus:"draft"
        });
        const record=await pool.query(`SELECT id FROM mail_attachments
          WHERE tenant_id=$1 AND message_id=$2 AND object_key=$3 LIMIT 1`,[
          auth!.tenantId,req.params.id,key
        ]);
        return res.status(201).json({id:record.rows[0]?.id,filename,sizeBytes:content.length,scanStatus:scan});
      }catch(err){
        // Random draft object keys cannot be shared with another valid upload.
        if(uploaded)await deletePrivateAttachment(key).catch(()=>{});
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
  app.post("/api/mail/attachments/:id/rescan",async(req,res)=>{
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
