BEGIN;

-- Additive, isolated Mail app only. Existing accounts and routes are untouched.
CREATE TABLE mail_mailbox_provisioning (
  mailbox_id uuid PRIMARY KEY REFERENCES mail_mailboxes(id) ON DELETE CASCADE,
  tenant_id varchar(32) NOT NULL REFERENCES merchants(id),
  login_id uuid NOT NULL UNIQUE REFERENCES mail_login_users(id) ON DELETE CASCADE,
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','checking','verified','failed')),
  probe_id uuid NOT NULL UNIQUE,
  probe_hash char(64) NOT NULL CHECK (probe_hash ~ '^[0-9a-f]{64}$'),
  probe_secret text NOT NULL,
  deadline timestamptz NOT NULL DEFAULT now() + interval '15 minutes',
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  lease_until timestamptz,
  last_error text,
  provider_id text,
  inbound_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mail_provisioning_pending_idx ON mail_mailbox_provisioning(next_attempt_at)
  WHERE state IN ('pending','checking');

CREATE TABLE mail_account_invitations (
  token_hash char(64) PRIMARY KEY CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  tenant_id varchar(32) NOT NULL REFERENCES merchants(id),
  mailbox_id uuid NOT NULL REFERENCES mail_mailbox_provisioning(mailbox_id) ON DELETE CASCADE,
  login_id uuid NOT NULL REFERENCES mail_login_users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX mail_invitation_live_login_idx ON mail_account_invitations(login_id) WHERE used_at IS NULL;

COMMIT;
