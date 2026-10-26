import type { Express, Request, Response } from "express";
import { pool } from "../db";
import { verifyResendSignature, extractReplyHeader } from "./security";
import { fetchResendReceived } from "./provider";
import { ingestIncomingMail } from "./ingest";
import { loadResendReceivedAttachments } from "./resend-attachments";
import { persistInboundMailAttachments } from "./attachments";

const DELIVERY_STATES: Record<string,string|undefined> = {
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.bounced": "bounced",
  "email.complained": "bounced",
  "email.failed": "failed",
};
type EventBody = {type?:unknown;data?:Record<string,unknown>};
function safeAddresses(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((a):a is string=>typeof a==="string").slice(0,50) : [];
}
async function applyDeliveryEvent(
  eventType:string, providerEmailId:string, webhookId:string,
  taggedMessageId:string | undefined, rfcId:string | undefined,
):Promise<void> {
  const state=DELIVERY_STATES[eventType];
  if(!state) return;
  const client=await pool.connect();
  try {
    await client.query("BEGIN");
    const q=await client.query(`SELECT id,tenant_id,status FROM mail_messages
      WHERE direction='outbound' AND (provider_message_id=$1 OR
        ($2::uuid IS NOT NULL AND id=$2::uuid))
      FOR UPDATE`,[providerEmailId,taggedMessageId||null]);
    for(const item of q.rows) {
      const event=await client.query(`INSERT INTO mail_delivery_events(id,tenant_id,message_id,provider_event_id,event_type)
        VALUES(gen_random_uuid(),$1,$2,$3,$4)
        ON CONFLICT(message_id,provider_event_id) DO NOTHING RETURNING id`,[
        item.tenant_id,item.id,webhookId,eventType
      ]);
      if(!event.rowCount)continue;
      const nextStatus=(item.status==="delivered" || item.status==="bounced" || item.status==="failed")
        ? item.status : state;
      await client.query(`UPDATE mail_messages SET
        status=$1,provider_message_id=COALESCE(provider_message_id,$2),
        rfc_message_id=COALESCE(rfc_message_id,$3),
        delivered_at=CASE WHEN $1='delivered' THEN COALESCE(delivered_at,now()) ELSE delivered_at END
        WHERE id=$4 AND tenant_id=$5`,[nextStatus,providerEmailId,rfcId||null,item.id,item.tenant_id]);
    }
    await client.query("COMMIT");
  } catch(err){ await client.query("ROLLBACK"); throw err; }
  finally{client.release();}
}
export function registerResendWebhook(app:Express):void {
  // Do not allow generic anti-CSRF/session middleware to handle provider events.
  // Signature verifies the ORIGINAL bytes captured by the JSON body parser.
  app.post("/api/mail/provider/resend/webhook",async(req:Request,res:Response)=>{
    if(process.env.CHATVICE_MAIL_PROVIDER!=="resend")return res.sendStatus(503);
    const secret=process.env.RESEND_WEBHOOK_SECRET;
    const raw=req.rawBody;
    if(!secret || !Buffer.isBuffer(raw) ||
      !verifyResendSignature(raw,{
        id:req.get("svix-id"),timestamp:req.get("svix-timestamp"),
        signature:req.get("svix-signature"),
      },secret))return res.status(401).json({error:"Invalid webhook signature"});
    let event:EventBody;
    try { event=JSON.parse(raw.toString("utf8")) as EventBody; }
    catch{return res.sendStatus(400);}
    const type=event.type, data=event.data;
    if(typeof type!=="string" || !data || typeof data!=="object")return res.sendStatus(400);
    try {
      const webhookId=req.get("svix-id")||"";
      if(type==="email.received") {
        const id=data.email_id;
        if(typeof id!=="string" || !/^[a-z0-9_-]{8,128}$/i.test(id))return res.sendStatus(400);
        const key=process.env.RESEND_RECEIVING_API_KEY;
        if(!key) return res.sendStatus(503);
        const received=await fetchResendReceived(id,key) as Record<string,unknown>;
        // Load provider attachment bytes with strict SSRF and size limits BEFORE
        // acknowledging the event. If storage is unavailable, returning 503
        // allows a provider retry instead of silently dropping customer files.
        const attachments=await loadResendReceivedAttachments(id,key);
        const declared=(Array.isArray(received.attachments)?received.attachments:
          Array.isArray(data.attachments)?data.attachments:[]);
        if(declared.length>0 && attachments.length===0)
          return res.status(503).json({error:"Attachment inventory mismatch"});
        if(attachments.length && process.env.CHATVICE_MAIL_ATTACHMENTS_ENABLED!=="true")
          return res.status(503).json({error:"Private attachments not enabled"});
        const from=received.from??data.from;
        if(typeof from!=="string")return res.sendStatus(400);
        const text=typeof received.text==="string"?received.text:"";
        const html=typeof received.html==="string"?received.html:"";
        const result=await ingestIncomingMail({
          eventId:"resend:"+id, from, to:safeAddresses(received.to??data.to),
          cc:safeAddresses(received.cc),bcc:safeAddresses(received.bcc),
          subject:typeof received.subject==="string"?received.subject:"",text,
          html, messageId:typeof received.message_id==="string"?received.message_id:null,
          inReplyTo:extractReplyHeader(received.headers),
        });
        const files=await persistInboundMailAttachments(result.messages,attachments);
        return res.json({accepted:true,saved:result.saved,deduplicated:result.duplicate,
          attachmentsStored:files.stored,attachmentsDeduplicated:files.duplicates});
      }
      if(DELIVERY_STATES[type]){
        const id=data.email_id;
        if(typeof id!=="string" || id.length>128)return res.sendStatus(400);
        const tags=data.tags;
        const tagged=(tags && typeof tags==="object" && !Array.isArray(tags))
          ? (tags as Record<string,unknown>).chatvice_id : undefined;
        const taggedId=typeof tagged==="string" && /^[0-9a-f-]{36}$/i.test(tagged)?tagged:undefined;
        const rfc=typeof data.message_id==="string" && /^<[^<>\\r\\n]{1,500}>$/.test(data.message_id)
          ? data.message_id:undefined;
        await applyDeliveryEvent(type,id,webhookId,taggedId,rfc);
      }
      return res.json({accepted:true});
    }catch(_err){
      // Never emit provider payload, message body or sender PII in logs.
      return res.status(503).json({error:"Mail processing unavailable"});
    }
  });
}

