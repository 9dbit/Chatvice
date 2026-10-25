import { randomUUID } from "node:crypto";
import { pool } from "../db";
import { normalizeEmail } from "./security";

export type IncomingMail = {
  eventId: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  text: string;
  html?: string | null;
  messageId?: string | null;
  inReplyTo?: string | null;
};

function addressArray(value: string[] | undefined): string[] {
  return (value || []).map(normalizeEmail).filter((v):v is string => !!v).slice(0,50);
}
/**
 * Route inbound mail by the ACTUAL verified recipient address rather than an
 * attacker-provided tenant or mailbox ID. A message to two permitted inboxes
 * gets two tenant-scoped copies; duplicates are suppressed per mailbox.
 */
export async function ingestIncomingMail(data: IncomingMail): Promise<{saved:number;duplicate:number;unmatched:boolean}> {
  const from=normalizeEmail(data.from);
  const to=addressArray(data.to), cc=addressArray(data.cc), bcc=addressArray(data.bcc);
  const recipients=[...new Set([...to,...cc,...bcc])];
  if (!from || !recipients.length || data.eventId.length>255 || data.eventId.length<1) {
    throw new Error("Invalid inbound email");
  }
  const boxes=await pool.query<{id:string;tenant_id:string}>(`
    SELECT DISTINCT b.id,b.tenant_id FROM mail_mailboxes b
    JOIN mail_domains d ON d.id=b.domain_id AND d.tenant_id=b.tenant_id
    WHERE b.enabled=true AND d.status='verified' AND (
      lower(b.local_part || '@' || d.domain) = ANY($1::text[]) OR EXISTS(
        SELECT 1 FROM mail_aliases a WHERE a.mailbox_id=b.id AND a.tenant_id=b.tenant_id
        AND a.domain_id=d.id AND lower(a.local_part || '@' || d.domain) = ANY($1::text[])
      ))
  `,[recipients]);
  let saved=0, duplicate=0;
  for(const box of boxes.rows) {
    const client=await pool.connect();
    try {
      await client.query("BEGIN");
      const exists=await client.query("SELECT id FROM mail_messages WHERE mailbox_id=$1 AND source_event_id=$2 LIMIT 1",[box.id,data.eventId]);
      if(exists.rowCount) { await client.query("COMMIT"); duplicate++; continue; }
      let thread:string|undefined;
      if(data.inReplyTo) {
        const prior=await client.query(`SELECT thread_id FROM mail_messages WHERE tenant_id=$1 AND mailbox_id=$2 AND rfc_message_id=$3 LIMIT 1`,[box.tenant_id,box.id,data.inReplyTo]);
        thread=prior.rows[0]?.thread_id;
      }
      if(!thread) {
        thread=randomUUID();
        await client.query("INSERT INTO mail_threads(id,tenant_id,mailbox_id,subject) VALUES ($1,$2,$3,$4)",[thread,box.tenant_id,box.id,data.subject.slice(0,250)]);
      }
      const id=randomUUID();
      const q=await client.query(`INSERT INTO mail_messages
        (id,tenant_id,mailbox_id,thread_id,direction,folder,status,source_event_id,rfc_message_id,in_reply_to,from_email,to_emails,cc_emails,bcc_emails,subject,text_body,html_body)
        VALUES ($1,$2,$3,$4,'inbound','inbox','received',$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11::jsonb,$12,$13,$14)
        ON CONFLICT (mailbox_id,source_event_id) WHERE source_event_id IS NOT NULL DO NOTHING RETURNING id`,[
          id,box.tenant_id,box.id,thread,data.eventId,data.messageId?.slice(0,512)||null,
          data.inReplyTo?.slice(0,512)||null,from,JSON.stringify(to),JSON.stringify(cc),
          JSON.stringify(bcc),data.subject.slice(0,250),data.text.slice(0,500000),
          data.html?.slice(0,1000000)||null
        ]);
      if(!q.rowCount) { await client.query("ROLLBACK"); duplicate++; continue; }
      await client.query("UPDATE mail_threads SET updated_at=now() WHERE id=$1 AND tenant_id=$2",[thread,box.tenant_id]);
      await client.query("COMMIT"); saved++;
    } catch(err) { await client.query("ROLLBACK"); throw err; }
    finally {client.release();}
  }
  return {saved,duplicate,unmatched:boxes.rowCount===0};
}
