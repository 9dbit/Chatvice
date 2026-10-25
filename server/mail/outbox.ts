import { pool } from "../db";
import { MailProviderError, sendResendMail } from "./provider";

type Queued = {
  id: string; from_email: string; to_emails: string[]; cc_emails: string[];
  bcc_emails: string[]; subject: string; text_body: string;
  in_reply_to: string | null; retry_count: number; created_at: Date;
};
let running=false;
export async function processMailOutboxOnce():Promise<{processed:number;sent:number;failed:number}> {
  if(process.env.CHATVICE_MAIL_ENABLED!=="true" ||
     process.env.CHATVICE_MAIL_OUTBOUND_ENABLED!=="true" ||
     process.env.CHATVICE_MAIL_PROVIDER!=="resend" ||
     !process.env.RESEND_API_KEY)return {processed:0,sent:0,failed:0};
  if(running)return {processed:0,sent:0,failed:0};
  running=true;
  let processed=0,sent=0,failed=0;
  try {
    const q=await pool.query<Queued>(`
      WITH claim AS (
        SELECT m.id FROM mail_messages m
        JOIN mail_mailboxes b ON b.id=m.mailbox_id AND b.tenant_id=m.tenant_id
        JOIN mail_domains d ON d.id=b.domain_id AND d.tenant_id=m.tenant_id
        WHERE m.direction='outbound' AND b.enabled=true AND d.status='verified'
        AND m.created_at > now() - interval '23 hours'
        AND ((m.status='queued' AND m.next_attempt_at<=now())
          OR (m.status='sending' AND m.lock_acquired_at < now()-interval '3 minutes'))
        ORDER BY m.next_attempt_at ASC
        LIMIT 5 FOR UPDATE OF m SKIP LOCKED
      ) UPDATE mail_messages m SET status='sending', lock_acquired_at=now(),
        retry_count=m.retry_count+1
        FROM claim WHERE m.id=claim.id RETURNING m.id,m.from_email,m.to_emails,
        m.cc_emails,m.bcc_emails,m.subject,m.text_body,m.in_reply_to,
        m.retry_count,m.created_at
    `);
    for(const m of q.rows) {
      processed++;
      try {
        const providerId=await sendResendMail({
          id:m.id,from:m.from_email,to:m.to_emails||[],
          cc:m.cc_emails||[],bcc:m.bcc_emails||[],
          subject:m.subject,text:m.text_body,inReplyTo:m.in_reply_to,
        },process.env.RESEND_API_KEY!);
        await pool.query(`UPDATE mail_messages SET status='sent',provider_message_id=$2,
          lock_acquired_at=NULL WHERE id=$1 AND status='sending'`,[m.id,providerId]);
        sent++;
      }catch(err){
        const retryable=err instanceof MailProviderError && err.retryable;
        const age=Date.now()-new Date(m.created_at).getTime();
        // Resend only deduplicates outbound calls for 24h. Stop automatic retries
        // before expiry to avoid duplicate delivery after an unknown timeout.
        const retry=retryable && m.retry_count<7 && age<22*3600*1000;
        const delaySeconds=Math.min(1800,Math.round(Math.pow(2,m.retry_count)*15));
        await pool.query(`UPDATE mail_messages SET status=$2,lock_acquired_at=NULL,
          next_attempt_at=CASE WHEN $2='queued'
           THEN now()+($3::integer * interval '1 second') ELSE next_attempt_at END
          WHERE id=$1 AND status='sending'`,[m.id,retry?"queued":"failed",delaySeconds]);
        if(!retry)failed++;
      }
    }
  } finally {running=false;}
  return {processed,sent,failed};
}
let timer: ReturnType<typeof setInterval>|null=null;
export function startMailOutboxWorker():void {
  if(timer || process.env.CHATVICE_MAIL_ENABLED!=="true" ||
     process.env.CHATVICE_MAIL_OUTBOUND_ENABLED!=="true" ||
     process.env.CHATVICE_MAIL_PROVIDER!=="resend" || !process.env.RESEND_API_KEY)return;
  const tick=()=>processMailOutboxOnce().catch(()=>{
    // Deliberately no payload, token, email address or body in server logs.
    console.warn("[chatvice-mail] outbound cycle unavailable");
  });
  timer=setInterval(tick,15000);
  timer.unref?.();
  void tick();
}
