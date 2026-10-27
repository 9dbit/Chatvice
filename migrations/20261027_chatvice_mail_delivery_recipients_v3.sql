-- Additive recipient outcome evidence. Existing reviewed migration hashes stay unchanged.
BEGIN;
ALTER TABLE mail_delivery_events
  ADD COLUMN IF NOT EXISTS recipient_keys text[] NOT NULL DEFAULT '{}'::text[];
-- Older summaries could call a whole multi-recipient message delivered after
-- only one recipient succeeded. Retain the mail and event history, but remove
-- that unsupported summary. 'sent' never re-enters the outbound queue.
UPDATE mail_messages m SET status='sent',delivered_at=NULL
WHERE m.direction='outbound' AND m.status='delivered'
  AND (SELECT count(DISTINCT lower(btrim(recipient.address)))
    FROM jsonb_array_elements_text(m.to_emails || m.cc_emails || m.bcc_emails) AS recipient(address)
    WHERE btrim(recipient.address)<>'')<>1
  AND NOT EXISTS (SELECT 1 FROM mail_delivery_events e
    WHERE e.message_id=m.id AND e.tenant_id=m.tenant_id AND cardinality(e.recipient_keys)>0);
-- The existing (message_id, provider_event_id) unique index scopes event reads
-- and retains one idempotent row per signed provider event. No addresses are stored.
COMMIT;
