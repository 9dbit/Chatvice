// Chatvice Mail V1 schema shadow of migrations/20261026_chatvice_mail_v1.sql.
// DO NOT use drizzle-kit push on production. Apply reviewed SQL migrations instead.
import { pgTable, uuid, varchar, text, boolean, bigint, integer, timestamp, jsonb, index, uniqueIndex, unique } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { merchants } from "./schema";

const time=(name:string)=>timestamp(name,{withTimezone:true});
export const mailDomains=pgTable("mail_domains",{
 id:uuid("id").primaryKey(),
 tenantId:varchar("tenant_id",{length:32}).notNull().references(()=>merchants.id),
 domain:text("domain").notNull(),
 verificationToken:text("verification_token").notNull(),
 status:text("status").notNull().default("pending"),
 verifiedAt:time("verified_at"),
 createdAt:time("created_at").notNull().defaultNow(),
},t=>[
 uniqueIndex("mail_domains_unique_tenant_domain").on(t.tenantId,sql`lower(${t.domain})`),
 uniqueIndex("mail_domains_unique_verified_domain").on(sql`lower(${t.domain})`).where(sql`${t.status} = 'verified'`),
 index("mail_domains_tenant_idx").on(t.tenantId)
]);
export const mailMailboxes=pgTable("mail_mailboxes",{
 id:uuid("id").primaryKey(),
 tenantId:varchar("tenant_id",{length:32}).notNull().references(()=>merchants.id),
 domainId:uuid("domain_id").notNull().references(()=>mailDomains.id),
 localPart:text("local_part").notNull(),
 displayName:text("display_name").notNull().default(""),
 enabled:boolean("enabled").notNull().default(true),
 quotaBytes:bigint("quota_bytes",{mode:"number"}).notNull().default(1073741824),
 createdAt:time("created_at").notNull().defaultNow(),
},t=>[
 unique("mail_mailboxes_domain_id_local_part_key").on(t.domainId,t.localPart),
 index("mail_mailboxes_tenant_idx").on(t.tenantId)
]);
export const mailMemberships=pgTable("mail_memberships",{
 id:uuid("id").primaryKey(),
 tenantId:varchar("tenant_id",{length:32}).notNull().references(()=>merchants.id),
 mailboxId:uuid("mailbox_id").notNull().references(()=>mailMailboxes.id,{onDelete:"cascade"}),
 userId:varchar("user_id",{length:64}).notNull(),
 role:text("role").notNull(),
 createdAt:time("created_at").notNull().defaultNow(),
},t=>[
 unique("mail_memberships_mailbox_id_user_id_key").on(t.mailboxId,t.userId),
 index("mail_memberships_user_idx").on(t.tenantId,t.userId)
]);
export const mailAliases=pgTable("mail_aliases",{
 id:uuid("id").primaryKey(),
 tenantId:varchar("tenant_id",{length:32}).notNull().references(()=>merchants.id),
 domainId:uuid("domain_id").notNull().references(()=>mailDomains.id,{onDelete:"cascade"}),
 mailboxId:uuid("mailbox_id").notNull().references(()=>mailMailboxes.id,{onDelete:"cascade"}),
 localPart:text("local_part").notNull(),
 createdAt:time("created_at").notNull().defaultNow(),
},t=>[
 unique("mail_aliases_domain_id_local_part_key").on(t.domainId,t.localPart),
 index("mail_aliases_tenant_idx").on(t.tenantId)
]);
export const mailThreads=pgTable("mail_threads",{
 id:uuid("id").primaryKey(),
 tenantId:varchar("tenant_id",{length:32}).notNull().references(()=>merchants.id),
 mailboxId:uuid("mailbox_id").notNull().references(()=>mailMailboxes.id,{onDelete:"cascade"}),
 subject:text("subject").notNull().default(""),
 assignedTo:varchar("assigned_to",{length:64}),
 snoozedUntil:time("snoozed_until"),
 customerId:text("customer_id"),
 createdAt:time("created_at").notNull().defaultNow(),
 updatedAt:time("updated_at").notNull().defaultNow(),
},t=>[index("mail_threads_box_latest_idx").on(t.tenantId,t.mailboxId,t.updatedAt.desc())]);
export const mailMessages=pgTable("mail_messages",{
 id:uuid("id").primaryKey(),
 tenantId:varchar("tenant_id",{length:32}).notNull().references(()=>merchants.id),
 mailboxId:uuid("mailbox_id").notNull().references(()=>mailMailboxes.id,{onDelete:"cascade"}),
 threadId:uuid("thread_id").notNull().references(()=>mailThreads.id,{onDelete:"cascade"}),
 direction:text("direction").notNull(),
 folder:text("folder").notNull().default("inbox"),
 status:text("status").notNull().default("received"),
 sourceEventId:text("source_event_id"),
 rfcMessageId:text("rfc_message_id"),
 inReplyTo:text("in_reply_to"),
 providerMessageId:text("provider_message_id"),
 fromEmail:text("from_email").notNull(),
 toEmails:jsonb("to_emails").notNull().default([]),
 ccEmails:jsonb("cc_emails").notNull().default([]),
 bccEmails:jsonb("bcc_emails").notNull().default([]),
 subject:text("subject").notNull().default(""),
 textBody:text("text_body").notNull().default(""),
 htmlBody:text("html_body"),
 isRead:boolean("is_read").notNull().default(false),
 isStarred:boolean("is_starred").notNull().default(false),
 retryCount:integer("retry_count").notNull().default(0),
 nextAttemptAt:time("next_attempt_at").notNull().defaultNow(),
 queuedAt:time("queued_at").notNull().defaultNow(),
 lockAcquiredAt:time("lock_acquired_at"),
 deliveredAt:time("delivered_at"),
 receivedAt:time("received_at").notNull().defaultNow(),
 createdAt:time("created_at").notNull().defaultNow(),
},t=>[
 uniqueIndex("mail_messages_inbound_dedup").on(t.mailboxId,t.sourceEventId).where(sql`${t.sourceEventId} IS NOT NULL`),
 index("mail_messages_thread_idx").on(t.tenantId,t.threadId,t.createdAt.asc()),
 index("mail_messages_folder_idx").on(t.tenantId,t.mailboxId,t.folder,t.createdAt.desc()),
 index("mail_messages_rfc_idx").on(t.tenantId,t.mailboxId,t.rfcMessageId),
 index("mail_messages_outbox_idx").on(t.status,t.nextAttemptAt).where(sql`${t.status} IN ('queued','sending')`),
 index("mail_messages_provider_id_idx").on(t.providerMessageId).where(sql`${t.providerMessageId} IS NOT NULL`)
]);
export const mailAttachments=pgTable("mail_attachments",{
 id:uuid("id").primaryKey(),
 tenantId:varchar("tenant_id",{length:32}).notNull().references(()=>merchants.id),
 messageId:uuid("message_id").notNull().references(()=>mailMessages.id,{onDelete:"cascade"}),
 objectKey:text("object_key").notNull(),
 providerAttachmentId:text("provider_attachment_id"),
 originalFilename:text("original_filename").notNull(),
 mediaType:text("media_type").notNull().default("application/octet-stream"),
 sizeBytes:bigint("size_bytes",{mode:"number"}).notNull(),
 scanStatus:text("scan_status").notNull().default("pending"),
 createdAt:time("created_at").notNull().defaultNow(),
},t=>[
 index("mail_attachments_message_idx").on(t.tenantId,t.messageId),
 uniqueIndex("mail_attachments_provider_dedup").on(t.messageId,t.providerAttachmentId).where(sql`${t.providerAttachmentId} IS NOT NULL`)
]);
export const mailDeliveryEvents=pgTable("mail_delivery_events",{
 id:uuid("id").primaryKey(),
 tenantId:varchar("tenant_id",{length:32}).notNull().references(()=>merchants.id),
 messageId:uuid("message_id").notNull().references(()=>mailMessages.id,{onDelete:"cascade"}),
 providerEventId:text("provider_event_id").notNull(),
 eventType:text("event_type").notNull(),
 recipientKeys:text("recipient_keys").array().notNull().default(sql`'{}'::text[]`),
 createdAt:time("created_at").notNull().defaultNow(),
},t=>[unique("mail_delivery_events_message_id_provider_event_id_key").on(t.messageId,t.providerEventId)]);
