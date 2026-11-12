-- Additive public self-signup. Run only via guarded isolated Chatvice Mail installer.
-- No existing mailbox, membership, identity, routing rule, or content is changed.
BEGIN;

CREATE TABLE mail_public_signups (
  token_hash char(64) PRIMARY KEY CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  tenant_id varchar(32) NOT NULL REFERENCES merchants(id),
  domain_id uuid NOT NULL REFERENCES mail_domains(id),
  local_part text NOT NULL,
  display_name text NOT NULL DEFAULT '',
  contact_key char(64) NOT NULL CHECK (contact_key ~ '^[0-9a-f]{64}$'),
  provider_id text,
  expires_at timestamptz NOT NULL,
  completed_at timestamptz,
  mailbox_id uuid UNIQUE REFERENCES mail_mailboxes(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((completed_at IS NULL AND mailbox_id IS NULL) OR
         (completed_at IS NOT NULL AND mailbox_id IS NOT NULL))
);
CREATE INDEX mail_public_signups_expiry_idx ON mail_public_signups(expires_at)
  WHERE completed_at IS NULL;
CREATE INDEX mail_public_signups_contact_idx ON mail_public_signups(contact_key,created_at DESC);
CREATE UNIQUE INDEX mail_public_signups_one_contact_idx ON mail_public_signups(contact_key)
  WHERE completed_at IS NOT NULL;

-- A separate, transactional quota for public accounts only. Existing tenants are unaffected.
CREATE TABLE mail_public_send_limits (
  mailbox_id uuid NOT NULL REFERENCES mail_mailboxes(id) ON DELETE CASCADE,
  window_start date NOT NULL,
  used integer NOT NULL CHECK(used BETWEEN 1 AND 10),
  PRIMARY KEY(mailbox_id,window_start)
);

COMMIT;
