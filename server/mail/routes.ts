import type { Express, Request, Response, NextFunction } from "express";
import { randomUUID, createHmac, timingSafeEqual } from "crypto";
import { pool } from "../db";
import { z } from "zod";

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
  const origin = req.get("origin");
  if (origin) {
    try {
      const expected = new URL(`${req.protocol}://${req.get("host")}`).origin;
      if (new URL(origin).origin !== expected) return res.status(403).json({error:"Cross-origin mail access denied"});
    } catch { return res.status(403).json({error:"Invalid origin"}); }
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
function matchHmac(value: string, expected: string) {
  const a=Buffer.from(value,"hex"), b=Buffer.from(expected,"hex");
  return a.length===b.length && timingSafeEqual(a,b);
}
const inboundSchema = z.object({
  eventId:z.string().min(1).max(255), mailboxId:uuid,
  from:email, to:addressList.min(1), subject:small.default(""),
  text:z.string().max(500000).default(""),
  messageId:z.string().max(512).optional(), inReplyTo:z.string().max(512).optional()
});
export function registerMailRoutes(app: Express) {
  // This API is disabled until an operator explicitly enables mail after staging migration.
  app.use("/api/mail", (req,res,next) => {
    res.setHeader("X-Robots-Tag","noindex, nofollow, nosnippet, noarchive");
    res.setHeader("Cache-Control","private, no-store");
    if (process.env.CHATVICE_MAIL_ENABLED !== "true") return res.status(503).json({error:"Mail engine not enabled"});
    next();
  });
  app.post("/api/mail/inbound", wrap(async(req,res) => {
    const secret=process.env.CHATVICE_MAIL_INBOUND_SECRET;
    if (!secret || secret.length<32) return res.status(503).json({error:"Inbound not configured"});
    const timestamp=req.get("x-mail-timestamp")||"";
    const signature=req.get("x-mail-signature")||"";
    if (!/^\d{10,13}$/.test(timestamp) || Math.abs(Date.now()-Number(timestamp))>300000) return res.sendStatus(401);
    const payload=JSON.stringify(req.body);
    const expected=createHmac("sha256",secret).update(timestamp+"."+payload).digest("hex");
    if (!matchHmac(signature,expected)) return res.sendStatus(401);
    const data=inboundSchema.parse(req.body);
    const box=await pool.query("SELECT tenant_id FROM mail_mailboxes WHERE id=$1 AND enabled=true",[data.mailboxId]);
    if (!box.rowCount) return res.sendStatus(404);
    const tenant=box.rows[0].tenant_id as string;
    const client=await pool.connect();
    try {
      await client.query("BEGIN");
      const prior=await client.query("SELECT id FROM mail_messages WHERE mailbox_id=$1 AND source_event_id=$2",[data.mailboxId,data.eventId]);
      if (prior.rowCount) { await client.query("COMMIT"); return res.json({id:prior.rows[0].id,deduplicated:true}); }
      let threadId:string|undefined;
      if (data.inReplyTo) {
        const reply=await client.query(`SELECT thread_id FROM mail_messages WHERE tenant_id=$1 AND mailbox_id=$2 AND rfc_message_id=$3 ORDER BY created_at DESC LIMIT 1`,[tenant,data.mailboxId,data.inReplyTo]);
        threadId=reply.rows[0]?.thread_id;
      }
      if (!threadId) {
        threadId=randomUUID();
        await client.query("INSERT INTO mail_threads(id,tenant_id,mailbox_id,subject) VALUES ($1,$2,$3,$4)",[threadId,tenant,data.mailboxId,data.subject]);
      }
      const id=randomUUID();
      await client.query(`INSERT INTO mail_messages
        (id,tenant_id,mailbox_id,thread_id,direction,folder,status,source_event_id,rfc_message_id,in_reply_to,from_email,to_emails,subject,text_body)
        VALUES ($1,$2,$3,$4,'inbound','inbox','received',$5,$6,$7,$8,$9::jsonb,$10,$11)`,[
        id,tenant,data.mailboxId,threadId,data.eventId,data.messageId||null,data.inReplyTo||null,data.from,JSON.stringify(data.to),data.subject,data.text
      ]);
      await client.query("UPDATE mail_threads SET updated_at=now() WHERE id=$1",[threadId]);
      await client.query("COMMIT"); return res.status(201).json({id,deduplicated:false});
    } catch(err) { await client.query("ROLLBACK"); if((err as any).code==="23505") return res.json({deduplicated:true}); throw err; }
    finally { client.release(); }
  }));
  app.use("/api/mail",protect);
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
    res.json(q.rows.map(r=>({...r,text_body:String(r.text_body||"").slice(0,220)})));
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
    res.json(q.rows);
  }));
  app.post("/api/mail/compose",wrap(async(req,res)=>{
    const p=principal(req)!;
    const d=compose.parse(req.body);
    if(!await canAccess(p,d.mailboxId,true)) return res.sendStatus(403);
    const own=await pool.query(`SELECT b.local_part,d.domain,d.status FROM mail_mailboxes b
      JOIN mail_domains d ON d.id=b.domain_id WHERE b.id=$1 AND b.tenant_id=$2`,[d.mailboxId,p.tenantId]);
    if(!own.rowCount) return res.sendStatus(404);
    if(!d.draft && own.rows[0].status!=="verified") return res.status(409).json({error:"Domain is not verified"});
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
      if(!d.replyToId) await client.query("INSERT INTO mail_threads(id,tenant_id,mailbox_id,subject) VALUES($1,$2,$3,$4)",[threadId,p.tenantId,d.mailboxId,d.subject]);
      const id=randomUUID();
      await client.query(`INSERT INTO mail_messages(id,tenant_id,mailbox_id,thread_id,direction,folder,status,from_email,to_emails,cc_emails,bcc_emails,subject,text_body,in_reply_to)
       VALUES($1,$2,$3,$4,'outbound',$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11,$12,$13)`,[
        id,p.tenantId,d.mailboxId,threadId,d.draft?"drafts":"sent",d.draft?"draft":"queued",from,JSON.stringify(d.to),JSON.stringify(d.cc),JSON.stringify(d.bcc),d.subject,d.text,replyHeader
      ]);
      await client.query("UPDATE mail_threads SET updated_at=now() WHERE id=$1",[threadId]);
      await client.query("COMMIT"); res.status(201).json({id,threadId,status:d.draft?"draft":"queued"});
    } catch(e){await client.query("ROLLBACK");throw e;}finally{client.release();}
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
    const d=z.object({domainId:uuid,localPart:z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9._+-]{0,63}$/),displayName:z.string().max(120).default("")}).parse(req.body);
    const domain=await pool.query("SELECT domain FROM mail_domains WHERE id=$1 AND tenant_id=$2",[d.domainId,p.tenantId]);
    if(!domain.rowCount)return res.sendStatus(404);
    const id=randomUUID();
    await pool.query("INSERT INTO mail_mailboxes(id,tenant_id,domain_id,local_part,display_name) VALUES($1,$2,$3,$4,$5)",[id,p.tenantId,d.domainId,d.localPart,d.displayName]);
    res.status(201).json({id,address:d.localPart+"@"+domain.rows[0].domain,enabled:true});
  }));
}
