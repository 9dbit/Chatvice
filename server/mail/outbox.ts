import { pool } from "../db";
import { MailProviderError, sendResendMail } from "./provider";
import { getPrivateAttachment, MAX_MAIL_ATTACHMENT_BYTES } from "./object-store";
import {mailAttachmentSizeError,shouldUseSecureMailLinks,MAIL_SHARE_LINK_DAYS} from "../../shared/mail-policy";
import {createMailShareToken} from "./attachments";
import { decryptMailField, isMailEncryptionReady } from "./crypto";

type Queued = {
  id: string; tenant_id:string; from_email: string; to_emails: string[]; cc_emails: string[];
  bcc_emails: string[]; subject: string; text_body: string;
  in_reply_to: string | null; retry_count: number; queued_at: Date;
};
let running=false;
export async function processMailOutboxOnce():Promise<{processed:number;sent:number;failed:number}> {
  if(process.env.CHATVICE_MAIL_ENABLED!=="true" ||
     process.env.CHATVICE_MAIL_OUTBOUND_ENABLED!=="true" ||
     process.env.CHATVICE_MAIL_PROVIDER!=="resend" ||
     !process.env.RESEND_API_KEY || !isMailEncryptionReady())return {processed:0,sent:0,failed:0};
  if(running)return {processed:0,sent:0,failed:0};
  running=true;
  let processed=0,sent=0,failed=0;
  try {
    // Never retry after the provider's deduplication window. Expire stale work
    // visibly, while leaving a live sending lease to its current worker.
    const expired=await pool.query(`
      WITH stale AS (
        SELECT id FROM mail_messages
        WHERE direction='outbound' AND status IN ('queued','sending')
          AND queued_at <= now()-interval '23 hours'
          AND (status='queued' OR (status='sending' AND
            (lock_acquired_at IS NULL OR lock_acquired_at < now()-interval '3 minutes')))
        ORDER BY queued_at ASC,id ASC
        LIMIT 100 FOR UPDATE SKIP LOCKED
      ) UPDATE mail_messages m SET status='failed',lock_acquired_at=NULL
        FROM stale WHERE m.id=stale.id RETURNING m.id
    `);
    processed+=expired.rowCount||0;
    failed+=expired.rowCount||0;
    const q=await pool.query<Queued>(`
      WITH claim AS (
        SELECT m.id FROM mail_messages m
        JOIN mail_mailboxes b ON b.id=m.mailbox_id AND b.tenant_id=m.tenant_id
        JOIN mail_domains d ON d.id=b.domain_id AND d.tenant_id=m.tenant_id
        WHERE m.direction='outbound' AND b.enabled=true AND d.status='verified'
        AND m.queued_at > now() - interval '23 hours'
        AND NOT EXISTS (SELECT 1 FROM mail_attachments a
          WHERE a.message_id=m.id AND a.tenant_id=m.tenant_id
            AND a.scan_status<>'clean')
        AND ((m.status='queued' AND m.next_attempt_at<=now())
          OR (m.status='sending' AND m.lock_acquired_at < now()-interval '3 minutes'))
        ORDER BY m.next_attempt_at ASC
        LIMIT 5 FOR UPDATE OF m SKIP LOCKED
      ) UPDATE mail_messages m SET status='sending', lock_acquired_at=now(),
        retry_count=m.retry_count+1
        FROM claim WHERE m.id=claim.id RETURNING m.id,m.tenant_id,m.from_email,m.to_emails,
        m.cc_emails,m.bcc_emails,m.subject,m.text_body,m.in_reply_to,
        m.retry_count,m.queued_at
    `);
    for(const m of q.rows) {
      processed++;
      try {
        const files=await pool.query<{id:string;object_key:string;original_filename:string;size_bytes:string;scan_status:string}>(`
          SELECT id,object_key,original_filename,size_bytes,scan_status FROM mail_attachments
          WHERE tenant_id=$1 AND message_id=$2 ORDER BY created_at ASC`,
          [m.tenant_id,m.id]);
        if(files.rowCount && process.env.CHATVICE_MAIL_ATTACHMENTS_ENABLED!=="true")throw new MailProviderError(0,false);
        if(mailAttachmentSizeError(files.rows.reduce((n,a)=>n+Number(a.size_bytes),0),files.rows.length))
          throw new MailProviderError(0,false);
        const text=decryptMailField(m.tenant_id,m.id,"message-text",m.text_body);
        const totalBytes=files.rows.reduce((n,a)=>n+Number(a.size_bytes),0);
        if(shouldUseSecureMailLinks(totalBytes,files.rows.length,Buffer.byteLength(text,"utf8"))){
          const expires=Math.floor(new Date(m.queued_at).getTime()/1000)+MAIL_SHARE_LINK_DAYS*86400;
          const origin=process.env.CHATVICE_MAIL_APP_ORIGIN||"";
          if(!/^https:\/\/[a-z0-9.-]+$/.test(origin))throw new MailProviderError(0,false);
          const lines=files.rows.map(a=>{
            if(a.scan_status!=="clean"||Number(a.size_bytes)>MAX_MAIL_ATTACHMENT_BYTES ||
               !a.object_key.startsWith(`mail/${m.tenant_id}/${m.id}/`))
              throw new MailProviderError(0,false);
            const token=createMailShareToken(a.id,m.id,expires);
            return a.original_filename+" ("+(Number(a.size_bytes)/1000000).toFixed(2)+" MB): "+origin+
              "/api/mail/shared/"+a.id+"?expires="+expires+"&token="+token;
          });
          const notice="\n\nPrivate files ("+(totalBytes/1000000).toFixed(2)+
            " MB total). Download links expire in "+MAIL_SHARE_LINK_DAYS+
            " days. Anyone holding a link can download that file:\n"+lines.join("\n");
          const providerId=await sendResendMail({
            id:m.id,from:m.from_email,to:m.to_emails||[],cc:m.cc_emails||[],bcc:m.bcc_emails||[],
            subject:decryptMailField(m.tenant_id,m.id,"message-subject",m.subject),
            text:text+notice,inReplyTo:m.in_reply_to,attachments:[],
          },process.env.RESEND_API_KEY!);
          await pool.query(`UPDATE mail_messages SET status='sent',provider_message_id=$2,
            lock_acquired_at=NULL WHERE id=$1 AND status='sending'`,[m.id,providerId]);
          sent++;continue;
        }
        const attachments:{filename:string;content:string}[]=[];
        let total=0;
        for(const a of files.rows){
          if(a.scan_status!=="clean" || Number(a.size_bytes)>MAX_MAIL_ATTACHMENT_BYTES)
            throw new MailProviderError(0,false);
          if(!a.object_key.startsWith(`mail/${m.tenant_id}/${m.id}/`))
            throw new MailProviderError(0,false);
          let contents:Buffer;
          try{contents=await getPrivateAttachment(a.object_key);}
          catch{throw new MailProviderError(0,true);}
          total+=contents.length;
          if(contents.length!==Number(a.size_bytes)||mailAttachmentSizeError(total,files.rows.length))
            throw new MailProviderError(0,false);
          attachments.push({filename:a.original_filename,content:contents.toString("base64")});
        }
        const providerId=await sendResendMail({
          id:m.id,from:m.from_email,to:m.to_emails||[],
          cc:m.cc_emails||[],bcc:m.bcc_emails||[],
          subject:decryptMailField(m.tenant_id,m.id,"message-subject",m.subject),
          text,
          inReplyTo:m.in_reply_to,attachments,
        },process.env.RESEND_API_KEY!);
        await pool.query(`UPDATE mail_messages SET status='sent',provider_message_id=$2,
          lock_acquired_at=NULL WHERE id=$1 AND status='sending'`,[m.id,providerId]);
        sent++;
      }catch(err){
        const retryable=err instanceof MailProviderError && err.retryable;
        const age=Date.now()-new Date(m.queued_at).getTime();
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
     process.env.CHATVICE_MAIL_PROVIDER!=="resend" || !process.env.RESEND_API_KEY || !isMailEncryptionReady())return;
  const tick=()=>processMailOutboxOnce().catch(()=>{
    // Deliberately no payload, token, email address or body in server logs.
    console.warn("[chatvice-mail] outbound cycle unavailable");
  });
  timer=setInterval(tick,15000);
  timer.unref?.();
  void tick();
}

