import type { Express, Request, Response } from "express";
import { pool } from "../db";
import { verifyResendSignature, extractReplyHeader } from "./security";
import { fetchResendReceived } from "./provider";
import { ingestIncomingMail } from "./ingest";

const DELIVERY_STATES: Record<string,string|undefined> = {
  "email.delivered": "delivered",
  "email.bounced": "bounced",
  "email.complained": "bounced",
  "email.failed": "failed",
};
type EventBody = {type?:unknown;data?:Record<string,unknown>};
function safeAddresses(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((a):a is string=>typeof a==="string").slice(0,50) : [];
}
async function applyDeliveryEvent(eventType:string, providerEmailId:string, webhookId:string):Promise<void> {
  const state=DELIVERY_STATES[eventType];
  if(!state) return;
  const client=await pool.connect();
  try {
    await client.query("BEGIN");
    const q=await client.query(`SELECT id,tenant_id,status FROM mail_messages
      WHERE provider_message_id=$1 AND direction='outbound' FOR UPDATE`,[providerEmailId]);
    for(const item of q.rows) {
      const event=await client.query(`INSERT INTO mail_delivery_events(id,tenant_id,message_id,provider_event_id,event_type)
        VALUES(gen_random_uuid(),$1,$2,$3,$4)
        ON CONFLICT(message_id,provider_event_id) DO NOTHING RETURNING id`,[
        item.tenant_id,item.id,webhookId,eventType
      ]);
      if(!event.rowCount)continue;
      if(item.status==="bounced" || item.status==="failed")continue;
      await client.query(`UPDATE mail_messages SET status=$1,
        delivered_at=CASE WHEN $1='delivered' THEN now() ELSE delivered_at END
        WHERE id=$2 AND tenant_id=$3`,[state,item.id,item.tenant_id]);
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
        const key=process.env.RESEND_API_KEY;
        if(!key) return res.sendStatus(503);
        // Do not acknowledge emails with attachments until a PRIVATE storage
        // adapter is configured, so the provider can retry and retain originals.
        const metadataAttachments=data.attachments;
        if(Array.isArray(metadataAttachments) && metadataAttachments.length>0) return res.sendStatus(503);
        const received=await fetchResendReceived(id,key) as Record<string,unknown>;
        if(Array.isArray(received.attachments) && received.attachments.length>0)return res.sendStatus(503);
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
        return res.json({accepted:true,saved:result.saved,deduplicated:result.duplicate});
      }
      if(DELIVERY_STATES[type]){
        const id=data.email_id;
        if(typeof id!=="string" || id.length>128)return res.sendStatus(400);
        await applyDeliveryEvent(type,id,webhookId);
      }
      return res.json({accepted:true});
    }catch(_err){
      // Never emit provider payload, message body or sender PII in logs.
      return res.status(503).json({error:"Mail processing unavailable"});
    }
  });
}
