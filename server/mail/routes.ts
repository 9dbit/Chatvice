import type { Express, Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { pool } from "../db";
import { z } from "zod";
import { verifyNormalizedInboundSignature } from "./security";
import { ingestIncomingMail } from "./ingest";
import { registerResendWebhook } from "./resend-webhook";
import { registerMailAdminRoutes } from "./admin";
import { registerMailAIRoutes } from "./ai";
import { registerMailAttachmentRoutes } from "./attachments";
import { encryptMailField, decryptMailField, isMailEncryptionReady } from "./crypto";

const email = z.string().email().max(320).transform(v => v.toLowerCase());
const uuid = z.string().uuid();
const small = z.string().max(250);
const addressList = z.array(email).max(50);
const compose = z.object({
  mailboxId: uuid, to: addressList.min(1), cc: addressList.default([]),
  bcc: addressList.default([]), subject: small.default(""),
  text: z.string().max(500000).default(""), replyToId: uuid.optional(),
  draft: z.boolean().default(false)
});
type Principal = { tenantId: string; userId: string; isMerchant: boolean };

function principal(req: Request): Principal | null {
  const s = req.session as any;
  if (!s?.userId || !s?.merchantId || !["merchant","supervisor"].includes(s.userType)) return null;
  if (s.userType === "merchant" && s.userId !== s.merchantId) return null;
  return { tenantId: s.merchantId, userId: s.userId, isMerchant: s.userType === "merchant" };
}
function errors(res: Response, err: unknown) {
  if (err instanceof z.ZodError) return res.status(400).json({ error: "Invalid request", fields: err.flatten().fieldErrors });
  const code = (err as any)?.code;
  if (code === "23505") return res.status(409).json({ error: "Duplicate resource" });
  if (code === "23503") return res.status(409).json({ error: "Referenced resource missing" });
  return res.status(500).json({ error: "Mail service error" });
}
const wrap = (fn: (req: Request,res: Response) => Promise<unknown>) =>
  (req: Request,res: Response) => { Promise.resolve(fn(req,res)).catch(e => errors(res,e)); };
function protect(req: Request,res: Response,next: NextFunction) {
  res.setHeader("X-Robots-Tag","noindex, nofollow, nosnippet, noarchive");
  res.setHeader("Cache-Control","private, no-store");
  if (!principal(req)) return res.status(401).json({error:"Authentication required"});
  const origin = req.get("origin") || "";
  const allowlist = (process.env.CHATVICE_MAIL_ALLOWED_ORIGINS || "")
    .split(",").map(x => x.trim()).filter(Boolean);
  // Session cookies are bearer credentials. Never infer a trusted origin
  // from an attacker-supplied Host or X-Forwarded-Proto header.
  if (req.method !== "GET" && req.method !== "HEAD") {
    if (!origin || !allowlist.includes(origin)) {
      return res.status(403).json({ error: "Mail write origin not allowed" });
    }
  } else if (origin && !allowlist.includes(origin)) {
    return res.status(403).json({ error: "Mail read origin not allowed" });
  }
  next();
}
async function canAccess(p: Principal, box: string, write = false): Promise<boolean> {
  const q = await pool.query(`SELECT b.id FROM mail_mailboxes b
     WHERE b.id=$1 AND b.tenant_id=$2 AND b.enabled=true AND (
       $3::boolean OR EXISTS (
         SELECT 1 FROM mail_memberships m WHERE m.mailbox_id=b.id
         AND m.tenant_id=$2 AND m.user_id=$4 AND
         ($5::boolean=false OR m.role IN ('owner','member'))
       )) LIMIT 1`,[box,p.tenantId,p.isMerchant,p.userId,write]);
  return q.rowCount === 1;
}
export function registerMailRoutes(app: Express) {
  // This API is disabled until an operator explicitly enables mail after staging migration.
  app.use("/api/mail", (req,res,next) => {
    res.setHeader("X-Robots-Tag","noindex, nofollow, nosnippet, noarchive");
    res.setHeader("Cache-Control","private, no-store");
    if (process.env.CHATVICE_MAIL_ENABLED !== "true") return res.status(503).json({error:"Mail engine not enabled"});
    if (!isMailEncryptionReady()) return res.status(503).json({error:"Private mail encryption is not configured"});
    next();
  });
  app.post("/api/mail/inbound",wrap(async(req,res)=>{
    const secret=process.env.CHATVICE_MAIL_INBOUND_SECRET||"";
    const raw=req.rawBody;
    if(!Buffer.isBuffer(raw) ||
       !verifyNormalizedInboundSignature(raw,
         req.get("x-mail-timestamp")||"",req.get("x-mail-signature")||"",secret)) {
      return res.status(401).json({error:"Invalid inbound signature"});
    }
    const data=z.object({
      eventId:z.string().min(1).max(220),from:email,to:addressList.min(1),
      cc:addressList.default([]),bcc:addressList.default([]),
      subject:small.default(""),text:z.string().max(500000).default(""),
      html:z.string().max(1000000).optional(),
      messageId:z.string().max(512).optional(),
      inReplyTo:z.string().max(512).optional(),
    }).parse(req.body);
    const result=await ingestIncomingMail({
      eventId:"normalized:"+data.eventId,from:data.from,to:data.to,
      cc:data.cc,bcc:data.bcc,subject:data.subject,text:data.text,
      html:data.html,messageId:data.messageId,inReplyTo:data.inReplyTo,
    });
    res.status(202).json({accepted:true,saved:result.saved,deduplicated:result.duplicate});
  }));
  registerResendWebhook(app);
  app.use("/api/mail",protect);
  registerMailAIRoutes(app);
  registerMailAttachmentRoutes(app);
  app.get("/api/mail/mailboxes",wrap(async(req,res)=>{
    const p=principal(req)!;
    const q=await pool.query(`SELECT b.id,b.local_part,b.display_name,d.domain,b.enabled
       FROM mail_mailboxes b JOIN mail_domains d ON d.id=b.domain_id
       WHERE b.tenant_id=$1 AND ($2::boolean OR EXISTS
       (SELECT 1 FROM mail_memberships m WHERE m.mailbox_id=b.id AND m.user_id=$3 AND m.tenant_id=$1))
       ORDER BY d.domain,b.local_part`,[p.tenantId,p.isMerchant,p.userId]);
    res.json(q.rows);
  }));
  app.get("/api/mail/threads",wrap(async(req,res)=>{
    const p=principal(req)!;
    const box=uuid.parse(req.query.mailboxId);
    if(!await canAccess(p,box)) return res.sendStatus(403);
    const folder=z.enum(["inbox","sent","drafts","archive","spam","trash"]).default("inbox").parse(req.query.folder);
    const limit=z.coerce.number().int().min(1).max(100).default(40).parse(req.query.limit);
    const offset=z.coerce.number().int().min(0).max(100000).default(0).parse(req.query.offset);
    const q=await pool.query(`SELECT t.id,t.subject,t.updated_at,
       m.id AS message_id,m.from_email,m.text_body,m.is_read,m.is_starred,m.created_at,m.status
       FROM mail_threads t JOIN LATERAL
       (SELECT id,from_email,text_body,is_read,is_starred,created_at,status FROM mail_messages
        WHERE tenant_id=$1 AND mailbox_id=$2 AND thread_id=t.id AND folder=$3
        ORDER BY created_at DESC LIMIT 1) m ON true
       WHERE t.tenant_id=$1 AND t.mailbox_id=$2
       ORDER BY m.created_at DESC LIMIT $4 OFFSET $5`,[p.tenantId,box,folder,limit,offset]);
    res.json(q.rows.map(r=>({
      ...r,
      subject:decryptMailField(p.tenantId,r.id,"thread-subject",r.subject),
      text_body:decryptMailField(p.tenantId,r.message_id,"message-text",r.text_body).slice(0,220)
    })));
  }));
  app.get("/api/mail/threads/:id",wrap(async(req,res)=>{
    const p=principal(req)!;
    const id=uuid.parse(req.params.id);
    const q=await pool.query(`SELECT m.* FROM mail_messages m
      WHERE m.tenant_id=$1 AND m.thread_id=$2 AND EXISTS
      (SELECT 1 FROM mail_mailboxes b WHERE b.id=m.mailbox_id AND b.tenant_id=$1
       AND b.enabled=true AND ($3::boolean OR EXISTS
       (SELECT 1 FROM mail_memberships x WHERE x.mailbox_id=b.id AND x.tenant_id=$1 AND x.user_id=$4)))
      ORDER BY m.created_at ASC`,[p.tenantId,id,p.isMerchant,p.userId]);
    if(!q.rowCount) return res.sendStatus(404);
    // Expose the smallest field set to the client. No internal event IDs,
    // provider identifiers, retry/lock metadata, encrypted HTML or BCC lists.
    res.json(q.rows.map(m=>({
      id:m.id,thread_id:m.thread_id,direction:m.direction,
      folder:m.folder,status:m.status,from_email:m.from_email,
      to_emails:m.to_emails,cc_emails:m.cc_emails,
      subject:decryptMailField(p.tenantId,m.id,"message-subject",m.subject),
      text_body:decryptMailField(p.tenantId,m.id,"message-text",m.text_body),
      is_read:m.is_read,is_starred:m.is_starred,
      created_at:m.created_at,received_at:m.received_at
    })));
  }));
  app.post("/api/mail/compose",wrap(async(req,res)=>{
    const p=principal(req)!;
    const d=compose.parse(req.body);
    if(!await canAccess(p,d.mailboxId,true)) return res.sendStatus(403);
    const own=await pool.query(`SELECT b.local_part,d.domain,d.status FROM mail_mailboxes b
      JOIN mail_domains d ON d.id=b.domain_id WHERE b.id=$1 AND b.tenant_id=$2`,[d.mailboxId,p.tenantId]);
    if(!own.rowCount) return res.sendStatus(404);
    if(!d.draft && own.rows[0].status!=="verified") return res.status(409).json({error:"Domain is not verified"});
    if(!d.draft && (process.env.CHATVICE_MAIL_OUTBOUND_ENABLED!=="true" ||
      process.env.CHATVICE_MAIL_PROVIDER!=="resend" || !process.env.RESEND_API_KEY))
      return res.status(503).json({error:"Outbound delivery is not configured"});
    const from=`${own.rows[0].local_part}@${own.rows[0].domain}`;
    let threadId=randomUUID();
    let replyHeader:string|null=null;
    if(d.replyToId){
      const prior=await pool.query("SELECT thread_id,rfc_message_id FROM mail_messages WHERE id=$1 AND tenant_id=$2 AND mailbox_id=$3",[d.replyToId,p.tenantId,d.mailboxId]);
      if(!prior.rowCount) return res.sendStatus(404);
      threadId=prior.rows[0].thread_id;
      replyHeader=prior.rows[0].rfc_message_id;
    }
    const client=await pool.connect();
    try {
      await client.query("BEGIN");
      if(!d.replyToId) await client.query("INSERT INTO mail_threads(id,tenant_id,mailbox_id,subject) VALUES($1,$2,$3,$4)",[threadId,p.tenantId,d.mailboxId,encryptMailField(p.tenantId,threadId,"thread-subject",d.subject)]);
      const id=randomUUID();
      await client.query(`INSERT INTO mail_messages(id,tenant_id,mailbox_id,thread_id,direction,folder,status,from_email,to_emails,cc_emails,bcc_emails,subject,text_body,in_reply_to)
       VALUES($1,$2,$3,$4,'outbound',$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11,$12,$13)`,[
        id,p.tenantId,d.mailboxId,threadId,d.draft?"drafts":"sent",d.draft?"draft":"queued",from,JSON.stringify(d.to),JSON.stringify(d.cc),JSON.stringify(d.bcc),encryptMailField(p.tenantId,id,"message-subject",d.subject),
        encryptMailField(p.tenantId,id,"message-text",d.text),replyHeader
      ]);
      await client.query("UPDATE mail_threads SET updated_at=now() WHERE id=$1",[threadId]);
      await client.query("COMMIT"); res.status(201).json({id,threadId,status:d.draft?"draft":"queued"});
    } catch(e){await client.query("ROLLBACK");throw e;}finally{client.release();}
  }));
  app.patch("/api/mail/drafts/:id",wrap(async(req,res)=>{
    const p=principal(req)!;
    const id=uuid.parse(req.params.id);
    const data=z.object({
      to:addressList.min(1).optional(),cc:addressList.optional(),bcc:addressList.optional(),
      subject:small.optional(),text:z.string().max(500000).optional()
    }).refine(x=>Object.keys(x).length>0).parse(req.body);
    const q=await pool.query(`UPDATE mail_messages m SET
      to_emails=COALESCE($3::jsonb,m.to_emails),
      cc_emails=COALESCE($4::jsonb,m.cc_emails),
      bcc_emails=COALESCE($5::jsonb,m.bcc_emails),
      subject=COALESCE($6,m.subject),text_body=COALESCE($7,m.text_body)
      WHERE m.id=$1 AND m.tenant_id=$2 AND m.direction='outbound'
        AND m.status='draft' AND m.folder='drafts'
        AND EXISTS(SELECT 1 FROM mail_mailboxes b WHERE b.id=m.mailbox_id
          AND b.tenant_id=$2 AND b.enabled=true
          AND ($8::boolean OR EXISTS(SELECT 1 FROM mail_memberships mm
            WHERE mm.mailbox_id=b.id AND mm.tenant_id=$2 AND mm.user_id=$9
              AND mm.role IN('owner','member'))))
      RETURNING m.id,m.thread_id`,[
      id,p.tenantId,data.to?JSON.stringify(data.to):null,
      data.cc?JSON.stringify(data.cc):null,data.bcc?JSON.stringify(data.bcc):null,
      data.subject!==undefined ? encryptMailField(p.tenantId,id,"message-subject",data.subject) : null,
      data.text!==undefined ? encryptMailField(p.tenantId,id,"message-text",data.text) : null,p.isMerchant,p.userId
    ]);
    if(!q.rowCount)return res.sendStatus(404);
    if(data.subject!==undefined)await pool.query(
      "UPDATE mail_threads SET subject=$1 WHERE id=$2 AND tenant_id=$3",
      [encryptMailField(p.tenantId,q.rows[0].thread_id,"thread-subject",data.subject),q.rows[0].thread_id,p.tenantId]);
    res.json({id,status:"draft"});
  }));
  app.post("/api/mail/drafts/:id/send",wrap(async(req,res)=>{
    const p=principal(req)!;
    const id=uuid.parse(req.params.id);
    if(process.env.CHATVICE_MAIL_OUTBOUND_ENABLED!=="true" ||
       process.env.CHATVICE_MAIL_PROVIDER!=="resend" || !process.env.RESEND_API_KEY)
      return res.status(503).json({error:"Outbound delivery is not configured"});
    const c=await pool.connect();
    try{
      await c.query("BEGIN");
      const q=await c.query(`SELECT m.id,m.mailbox_id FROM mail_messages m
        JOIN mail_mailboxes b ON b.id=m.mailbox_id AND b.tenant_id=m.tenant_id
        JOIN mail_domains d ON d.id=b.domain_id AND d.tenant_id=m.tenant_id
        WHERE m.id=$1 AND m.tenant_id=$2 AND m.direction='outbound'
          AND m.status='draft' AND m.folder='drafts'
          AND b.enabled=true AND d.status='verified'
          AND ($3::boolean OR EXISTS(SELECT 1 FROM mail_memberships mm
            WHERE mm.mailbox_id=b.id AND mm.tenant_id=$2 AND mm.user_id=$4
              AND mm.role IN('owner','member')))
        FOR UPDATE OF m`,[id,p.tenantId,p.isMerchant,p.userId]);
      if(!q.rowCount){await c.query("ROLLBACK");return res.sendStatus(404);}
      const pending=await c.query(`SELECT count(*)::integer AS total,
        count(*) FILTER(WHERE scan_status<>'clean')::integer AS blocked
        FROM mail_attachments WHERE message_id=$1 AND tenant_id=$2`,[id,p.tenantId]);
      const count=pending.rows[0]?.total||0;
      if(count>0 && (process.env.CHATVICE_MAIL_ATTACHMENTS_ENABLED!=="true" ||
         pending.rows[0].blocked>0 || count>8)){
        await c.query("ROLLBACK");
        return res.status(409).json({error:"Attachments must be scanned and approved before sending"});
      }
      await c.query(`UPDATE mail_messages SET status='queued',folder='sent',
        queued_at=now(),next_attempt_at=now(),retry_count=0,lock_acquired_at=NULL
        WHERE id=$1 AND tenant_id=$2`,[id,p.tenantId]);
      await c.query("COMMIT");return res.json({id,status:"queued"});
    }catch(err){await c.query("ROLLBACK");throw err;}finally{c.release();}
  }));
  app.patch("/api/mail/messages/:id",wrap(async(req,res)=>{
    const p=principal(req)!;
    const id=uuid.parse(req.params.id);
    const d=z.object({isRead:z.boolean().optional(),isStarred:z.boolean().optional(),folder:z.enum(["inbox","archive","spam","trash"]).optional()}).refine(x=>Object.keys(x).length>0).parse(req.body);
    const q=await pool.query(`UPDATE mail_messages m SET
      is_read=COALESCE($3,m.is_read),is_starred=COALESCE($4,m.is_starred),folder=COALESCE($5,m.folder)
      WHERE m.id=$1 AND m.tenant_id=$2 AND EXISTS (
       SELECT 1 FROM mail_mailboxes b WHERE b.id=m.mailbox_id AND b.enabled=true
       AND ($6::boolean OR EXISTS(SELECT 1 FROM mail_memberships x WHERE x.mailbox_id=b.id
       AND x.tenant_id=$2 AND x.user_id=$7 AND x.role IN ('owner','member'))))
      RETURNING m.id`,[id,p.tenantId,d.isRead??null,d.isStarred??null,d.folder??null,p.isMerchant,p.userId]);
    if(!q.rowCount)return res.sendStatus(404);
    res.json({updated:true});
  }));
  app.get("/api/mail/threads/:id/context",wrap(async(req,res)=>{
    const p=principal(req)!;
    const thread=uuid.parse(req.params.id);
    const q=await pool.query(`SELECT t.mailbox_id,(
        SELECT m.from_email FROM mail_messages m WHERE m.thread_id=t.id
        AND m.tenant_id=t.tenant_id AND m.direction='inbound'
        ORDER BY m.created_at ASC LIMIT 1) AS sender
      FROM mail_threads t WHERE t.id=$1 AND t.tenant_id=$2`,[thread,p.tenantId]);
    if(!q.rowCount || !await canAccess(p,q.rows[0].mailbox_id))return res.sendStatus(404);
    const sender=q.rows[0].sender;
    if(!sender)return res.json({sender:null,lead:null});
    const lead=await pool.query(`SELECT id,customer_name,customer_email,stage,score,source,last_contact_at,
      created_at FROM leads WHERE merchant_id=$1 AND lower(customer_email)=$2
      ORDER BY updated_at DESC NULLS LAST LIMIT 1`,[p.tenantId,sender]);
    res.json({sender,lead:lead.rows[0]||null});
  }));
  app.post("/api/mail/threads/:id/convert-to-lead",wrap(async(req,res)=>{
    const p=principal(req)!;
    const thread=uuid.parse(req.params.id);
    const t=await pool.query(`SELECT t.mailbox_id,
      (SELECT m.from_email FROM mail_messages m WHERE m.thread_id=t.id
       AND m.direction='inbound' AND m.tenant_id=$2 ORDER BY m.created_at ASC LIMIT 1) AS sender
      FROM mail_threads t WHERE t.id=$1 AND t.tenant_id=$2`,[thread,p.tenantId]);
    if(!t.rowCount || !await canAccess(p,t.rows[0].mailbox_id,true))return res.sendStatus(404);
    const sender=t.rows[0].sender;
    if(!sender)return res.status(409).json({error:"No inbound sender"});
    const c=await pool.connect();
    try{
      await c.query("BEGIN");
      const existing=await c.query(`SELECT id FROM leads WHERE merchant_id=$1 AND lower(customer_email)=$2 ORDER BY created_at ASC LIMIT 1`,[p.tenantId,sender]);
      const leadId=existing.rows[0]?.id || ("lead_"+randomUUID().replace(/-/g,"").slice(0,24));
      if(!existing.rowCount) await c.query(`INSERT INTO leads(id,merchant_id,customer_email,stage,source,score)
        VALUES($1,$2,$3,'cold','mail',0)`,[leadId,p.tenantId,sender]);
      await c.query("UPDATE mail_threads SET customer_id=$1 WHERE id=$2 AND tenant_id=$3",[leadId,thread,p.tenantId]);
      await c.query("COMMIT");res.status(201).json({leadId,created:!existing.rowCount});
    }catch(e){await c.query("ROLLBACK");throw e;}finally{c.release();}
  }));
  app.get("/api/mail/domains",wrap(async(req,res)=>{
    const p=principal(req)!;
    if(!p.isMerchant)return res.sendStatus(403);
    const q=await pool.query("SELECT id,domain,status,verified_at,created_at FROM mail_domains WHERE tenant_id=$1 ORDER BY domain",[p.tenantId]);
    res.json(q.rows);
  }));
  app.post("/api/mail/domains",wrap(async(req,res)=>{
    const p=principal(req)!;
    if(!p.isMerchant)return res.sendStatus(403);
    const d=z.object({domain:z.string().trim().toLowerCase().regex(/^(?:[a-z0-9-]+\.)+[a-z]{2,}$/).max(253)}).parse(req.body);
    const id=randomUUID();
    await pool.query("INSERT INTO mail_domains(id,tenant_id,domain,verification_token) VALUES($1,$2,$3,$4)",[id,p.tenantId,d.domain,randomUUID()]);
    res.status(201).json({id,domain:d.domain,status:"pending"});
  }));
  app.post("/api/mail/mailboxes",wrap(async(req,res)=>{
    const p=principal(req)!;
    if(!p.isMerchant)return res.sendStatus(403);
    const d=z.object({domainId:uuid,localPart:z.string().trim().toLowerCase()
      .regex(/^[a-z0-9][a-z0-9._+-]{0,63}$/),displayName:z.string().max(120).default("")}).parse(req.body);
    const c=await pool.connect();
    try{
      await c.query("BEGIN");
      const domain=await c.query("SELECT domain FROM mail_domains WHERE id=$1 AND tenant_id=$2 FOR UPDATE",[d.domainId,p.tenantId]);
      if(!domain.rowCount){await c.query("ROLLBACK");return res.sendStatus(404);}
      const alias=await c.query("SELECT id FROM mail_aliases WHERE domain_id=$1 AND local_part=$2",[d.domainId,d.localPart]);
      if(alias.rowCount){await c.query("ROLLBACK");return res.status(409).json({error:"Address is already an alias"});}
      const id=randomUUID();
      await c.query("INSERT INTO mail_mailboxes(id,tenant_id,domain_id,local_part,display_name) VALUES($1,$2,$3,$4,$5)",[id,p.tenantId,d.domainId,d.localPart,d.displayName]);
      await c.query("COMMIT");
      res.status(201).json({id,address:d.localPart+"@"+domain.rows[0].domain,enabled:true});
    }catch(err){await c.query("ROLLBACK");throw err;}finally{c.release();}
  }));
  registerMailAdminRoutes(app);
}
