-- Additive, isolated Mail database only. Never use the main app session cookie.
BEGIN;
CREATE TABLE mail_login_users (
  id uuid PRIMARY KEY,
  tenant_id varchar(32) NOT NULL REFERENCES merchants(id),
  user_id varchar(64) NOT NULL,
  email text NOT NULL UNIQUE CHECK(email=lower(email)),
  password_hash text NOT NULL CHECK(password_hash LIKE 'scrypt1.%'),
  is_admin boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT true,
  credential_version integer NOT NULL DEFAULT 1 CHECK(credential_version>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id,user_id),
  CHECK(NOT is_admin OR user_id=tenant_id)
);
CREATE TABLE mail_login_sessions (
  token_hash char(64) PRIMARY KEY,
  login_id uuid NOT NULL REFERENCES mail_login_users(id) ON DELETE CASCADE,
  credential_version integer NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mail_login_sessions_expiry ON mail_login_sessions(expires_at);
CREATE INDEX mail_login_sessions_user ON mail_login_sessions(login_id);
CREATE TABLE mail_login_limits (
  key_hash char(64) NOT NULL,
  window_start timestamptz NOT NULL,
  attempts integer NOT NULL CHECK(attempts>0),
  PRIMARY KEY(key_hash,window_start)
);
COMMIT;
