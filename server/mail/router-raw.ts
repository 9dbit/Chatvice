import express, {type Express} from "express";
import {createHash, timingSafeEqual} from "node:crypto";
import PostalMime, {type Address} from "postal-mime";
import {ingestIncomingMail} from "./ingest";
import {persistInboundMailAttachments} from "./attachments";
import {cleanMailFilename} from "./resend-attachments";
import {normalizeEmail} from "./security";
import {MAX_MAIL_INBOUND_ATTACHMENTS, MAX_MAIL_INBOUND_ATTACHMENT_BYTES} from "../../shared/mail-policy";

// Narrow compatibility path for the existing hello mailbox. The Worker invokes
// this only after the SMTP upstream explicitly rejects a line as too long.
export const RAW_ROUTER_RECIPIENT="hello@chatvice.app";
export const RAW_ROUTER_LIMIT=25*1024*1024;
function addresses(values:Address[]=[]):string[]{
  return values.flatMap(value=>value.group ? addresses(value.group) :
    value.address ? [value.address] : []).slice(0,50);
}
export async function parseRouterMail(raw:Buffer,recipient:string){
  if(recipient!==RAW_ROUTER_RECIPIENT||!raw.length||raw.length>RAW_ROUTER_LIMIT)
    throw new Error("Invalid router message");
  const mail=await PostalMime.parse(raw,{maxNestingDepth:30,maxHeadersSize:256*1024,forceRfc822Attachments:true});
  const from=normalizeEmail(mail.from?.address);
  if(!from)throw new Error("Invalid sender");
  if(mail.attachments.length>MAX_MAIL_INBOUND_ATTACHMENTS)throw new Error("Too many attachments");
  let total=0;
  const files=mail.attachments.map((file,index)=>{
    if(typeof file.content==="string")throw new Error("Invalid binary attachment");
    const bytes=Buffer.from(file.content);
    total+=bytes.length;
    if(total>MAX_MAIL_INBOUND_ATTACHMENT_BYTES)throw new Error("Attachments too large");
    return {providerId:"cfraw-"+index+"-"+createHash("sha256").update(bytes).digest("hex"),
      filename:cleanMailFilename(file.filename),mediaType:file.mimeType.slice(0,100),bytes};
  });
  // Retries use the same source event, regardless of the Worker's invocation ID.
  const digest=createHash("sha256").update(recipient+"\0").update(raw).digest("hex");
  return {files,data:{eventId:"cfraw:"+digest,from,to:addresses(mail.to),cc:addresses(mail.cc),
    envelopeRecipients:[recipient],subject:mail.subject||"",text:mail.text||"",html:mail.html||null,
    messageId:mail.messageId||null,inReplyTo:mail.inReplyTo||null}};
}
export function registerMailRouterRaw(app:Express){
  let active=0;
  app.post("/api/mail/router/raw",(req,res,next)=>{
    const secret=process.env.CHATVICE_MAIL_ROUTER_SECRET||"";
    const supplied=Buffer.from(req.get("authorization")||"");
    const expected=Buffer.from("Bearer "+secret);
    if(process.env.CHATVICE_MAIL_ENABLED!=="true"||!/^[a-f0-9]{64}$/i.test(secret)||
      supplied.length!==expected.length||!timingSafeEqual(supplied,expected))return res.sendStatus(401);
    if(req.get("x-chatvice-recipient")!==RAW_ROUTER_RECIPIENT)return res.sendStatus(403);
    if(!req.is("message/rfc822"))return res.sendStatus(415);
    if(active>=2){res.setHeader("Retry-After","5");return res.sendStatus(503);}
    active++;
    let released=false;
    const release=()=>{if(!released){released=true;active--;}};
    res.once("finish",release);res.once("close",release);next();
  },express.raw({type:"message/rfc822",limit:RAW_ROUTER_LIMIT,inflate:false}),async(req,res)=>{
    try{
      if(!Buffer.isBuffer(req.body))return res.sendStatus(400);
      const {data,files}=await parseRouterMail(req.body,req.get("x-chatvice-recipient")||"");
      if(files.length&&process.env.CHATVICE_MAIL_ATTACHMENTS_ENABLED!=="true")return res.sendStatus(503);
      const result=await ingestIncomingMail(data);
      if(result.unmatched)return res.sendStatus(503);
      await persistInboundMailAttachments(result.messages,files);
      // Never log message bodies, subjects, OTPs, or addresses.
      console.info("[Mail] raw router accepted",{saved:result.saved,duplicate:result.duplicate,attachments:files.length});
      return res.json({accepted:true,saved:result.saved,deduplicated:result.duplicate});
    }catch{return res.status(503).json({error:"Mail processing unavailable"});}
  });
}
