-- Chatvice Mail Engine V1: additive, non-destructive migration.
-- Run on isolated Railway staging database FIRST. Do NOT use drizzle-kit push in production.
BEGIN;
CREATE TABLE IF NOT EXISTS mail_domains (
  id uuid PRIMARY KEY,
  tenant_id varchar(32) NOT NULL REFERENCES merchants(id),
  domain text NOT NULL,
  verification_token text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','disabled')),
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- A pending claim must NOT let one tenant squat on another tenant's domain.
CREATE UNIQUE INDEX IF NOT EXISTS mail_domains_unique_tenant_domain ON mail_domains(tenant_id,lower(domain));
CREATE UNIQUE INDEX IF NOT EXISTS mail_domains_unique_verified_domain ON mail_domains(lower(domain)) WHERE status='verified';
CREATE INDEX IF NOT EXISTS mail_domains_tenant_idx ON mail_domains (tenant_id);

CREATE TABLE IF NOT EXISTS mail_mailboxes (
  id uuid PRIMARY KEY,
  tenant_id varchar(32) NOT NULL REFERENCES merchants(id),
  domain_id uuid NOT NULL REFERENCES mail_domains(id) ON DELETE RESTRICT,
  local_part text NOT NULL,
  display_name text NOT NULL DEFAULT '',
  enabled boolean NOT NULL DEFAULT true,
  quota_bytes bigint NOT NULL DEFAULT 1073741824,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (domain_id, local_part)
);
CREATE INDEX IF NOT EXISTS mail_mailboxes_tenant_idx ON mail_mailboxes (tenant_id);

CREATE TABLE IF NOT EXISTS mail_memberships (
  id uuid PRIMARY KEY,
  tenant_id varchar(32) NOT NULL REFERENCES merchants(id),
  mailbox_id uuid NOT NULL REFERENCES mail_mailboxes(id) ON DELETE CASCADE,
  user_id varchar(64) NOT NULL,
  role text NOT NULL CHECK (role IN ('owner','member','viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mailbox_id, user_id)
);
CREATE INDEX IF NOT EXISTS mail_memberships_user_idx ON mail_memberships(tenant_id,user_id);

CREATE TABLE IF NOT EXISTS mail_aliases (
  id uuid PRIMARY KEY,
  tenant_id varchar(32) NOT NULL REFERENCES merchants(id),
  domain_id uuid NOT NULL REFERENCES mail_domains(id) ON DELETE CASCADE,
  mailbox_id uuid NOT NULL REFERENCES mail_mailboxes(id) ON DELETE CASCADE,
  local_part text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (domain_id, local_part)
);
CREATE INDEX IF NOT EXISTS mail_aliases_tenant_idx ON mail_aliases(tenant_id);

CREATE TABLE IF NOT EXISTS mail_threads (
  id uuid PRIMARY KEY,
  tenant_id varchar(32) NOT NULL REFERENCES merchants(id),
  mailbox_id uuid NOT NULL REFERENCES mail_mailboxes(id) ON DELETE CASCADE,
  subject text NOT NULL DEFAULT '',
  assigned_to varchar(64),
  snoozed_until timestamptz,
  customer_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mail_threads_box_latest_idx ON mail_threads(tenant_id,mailbox_id,updated_at DESC);

CREATE TABLE IF NOT EXISTS mail_messages (
  id uuid PRIMARY KEY,
  tenant_id varchar(32) NOT NULL REFERENCES merchants(id),
  mailbox_id uuid NOT NULL REFERENCES mail_mailboxes(id) ON DELETE CASCADE,
  thread_id uuid NOT NULL REFERENCES mail_threads(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('inbound','outbound')),
  folder text NOT NULL DEFAULT 'inbox' CHECK (folder IN ('inbox','sent','drafts','archive','spam','trash')),
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received','draft','queued','sending','sent','delivered','failed','bounced')),
  source_event_id text,
  rfc_message_id text,
  in_reply_to text,
  provider_message_id text,
  from_email text NOT NULL,
  to_emails jsonb NOT NULL DEFAULT '[]'::jsonb,
  cc_emails jsonb NOT NULL DEFAULT '[]'::jsonb,
  bcc_emails jsonb NOT NULL DEFAULT '[]'::jsonb,
  subject text NOT NULL DEFAULT '',
  text_body text NOT NULL DEFAULT '',
  html_body text,
  is_read boolean NOT NULL DEFAULT false,
  is_starred boolean NOT NULL DEFAULT false,
  retry_count integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  lock_acquired_at timestamptz,
  delivered_at timestamptz,
  received_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS mail_messages_inbound_dedup ON mail_messages(mailbox_id,source_event_id) WHERE source_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS mail_messages_thread_idx ON mail_messages(tenant_id,thread_id,created_at ASC);
CREATE INDEX IF NOT EXISTS mail_messages_folder_idx ON mail_messages(tenant_id,mailbox_id,folder,created_at DESC);
CREATE INDEX IF NOT EXISTS mail_messages_rfc_idx ON mail_messages(tenant_id,mailbox_id,rfc_message_id);
CREATE INDEX IF NOT EXISTS mail_messages_outbox_idx ON mail_messages(status,next_attempt_at) WHERE status IN ('queued','sending');
CREATE INDEX IF NOT EXISTS mail_messages_provider_id_idx ON mail_messages(provider_message_id) WHERE provider_message_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS mail_attachments (
  id uuid PRIMARY KEY,
  tenant_id varchar(32) NOT NULL REFERENCES merchants(id),
  message_id uuid NOT NULL REFERENCES mail_messages(id) ON DELETE CASCADE,
  object_key text NOT NULL,
  original_filename text NOT NULL,
  media_type text NOT NULL DEFAULT 'application/octet-stream',
  size_bytes bigint NOT NULL,
  scan_status text NOT NULL DEFAULT 'pending' CHECK (scan_status IN ('pending','clean','blocked')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mail_attachments_message_idx ON mail_attachments(tenant_id,message_id);

CREATE TABLE IF NOT EXISTS mail_delivery_events (
  id uuid PRIMARY KEY,
  tenant_id varchar(32) NOT NULL REFERENCES merchants(id),
  message_id uuid NOT NULL REFERENCES mail_messages(id) ON DELETE CASCADE,
  provider_event_id text NOT NULL,
  event_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id,provider_event_id)
);
COMMIT;
