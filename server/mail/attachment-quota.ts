import { randomUUID } from "node:crypto";
import { pool } from "../db";
import { MAX_MAIL_ATTACHMENTS, MAX_MAIL_ATTACHMENT_BYTES } from "./object-store";
import type { AttachmentScanStatus } from "./scanner";

const MAX_MESSAGE_BYTES=16*1024*1024;
export class MailAttachmentPolicyError extends Error {
  constructor(public readonly reason:string){super(reason);}
}
type AttachmentInput = {
  tenantId:string;messageId:string;key:string;filename:string;mediaType:string;
  length:number;status:AttachmentScanStatus;expectedMessageStatus:"draft"|"received";
  providerId?:string;
};
/** Atomic per-mailbox quota check and per-message attachment cap.
 *  The mailbox row lock serializes competing upload requests.
 */
export async function registerAttachment(input:AttachmentInput):Promise<"created"|"duplicate">{
  if(!input.length || input.length>MAX_MAIL_ATTACHMENT_BYTES ||
     input.filename.length>180 || input.key.length>300)
    throw new MailAttachmentPolicyError("Attachment exceeds policy");
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const locked=await client.query(`
      SELECT m.status,b.id AS mailbox_id,b.quota_bytes
      FROM mail_messages m
      JOIN mail_mailboxes b ON b.id=m.mailbox_id AND b.tenant_id=m.tenant_id
      WHERE m.id=$1 AND m.tenant_id=$2 AND b.enabled=true
      FOR UPDATE OF b,m
    `,[input.messageId,input.tenantId]);
    if(!locked.rowCount || locked.rows[0].status!==input.expectedMessageStatus)
      throw new MailAttachmentPolicyError("Message is not editable");
    if(input.providerId){
      const old=await client.query(`SELECT id FROM mail_attachments
        WHERE message_id=$1 AND tenant_id=$2 AND provider_attachment_id=$3`,
        [input.messageId,input.tenantId,input.providerId]);
      if(old.rowCount){await client.query("COMMIT");return "duplicate";}
    }
    const message=await client.query(`SELECT count(*)::integer AS n,
      COALESCE(sum(size_bytes),0)::bigint AS size
      FROM mail_attachments WHERE message_id=$1 AND tenant_id=$2`,
      [input.messageId,input.tenantId]);
    const mailbox=await client.query(`SELECT COALESCE(sum(a.size_bytes),0)::bigint AS size
      FROM mail_attachments a JOIN mail_messages m
      ON m.id=a.message_id AND m.tenant_id=a.tenant_id
      WHERE m.mailbox_id=$1 AND a.tenant_id=$2`,[
      locked.rows[0].mailbox_id,input.tenantId
    ]);
    if(Number(message.rows[0].n)>=MAX_MAIL_ATTACHMENTS ||
       Number(message.rows[0].size)+input.length>MAX_MESSAGE_BYTES ||
       Number(mailbox.rows[0].size)+input.length>Number(locked.rows[0].quota_bytes)){
      throw new MailAttachmentPolicyError("Mailbox or message attachment quota exceeded");
    }
    const inserted=await client.query(`INSERT INTO mail_attachments
       (id,tenant_id,message_id,object_key,original_filename,media_type,size_bytes,scan_status,provider_attachment_id)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (message_id,provider_attachment_id) WHERE provider_attachment_id IS NOT NULL
       DO NOTHING RETURNING id`,[
       randomUUID(),input.tenantId,input.messageId,input.key,input.filename,input.mediaType,
       input.length,input.status,input.providerId||null
    ]);
    await client.query("COMMIT");
    return inserted.rowCount?"created":"duplicate";
  }catch(err){await client.query("ROLLBACK");throw err;}
  finally{client.release();}
}
