-- Additive follow-up to 20261026_chatvice_mail_v1.sql.
-- Provider attachment IDs are stable across webhook retries and required for
-- idempotent private-object reconciliation. Apply only after staging backup.
BEGIN;
ALTER TABLE mail_attachments ADD COLUMN IF NOT EXISTS provider_attachment_id text;
CREATE UNIQUE INDEX IF NOT EXISTS mail_attachments_provider_dedup
  ON mail_attachments(message_id,provider_attachment_id)
  WHERE provider_attachment_id IS NOT NULL;
COMMIT;
