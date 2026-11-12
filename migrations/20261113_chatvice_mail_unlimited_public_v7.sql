-- Reviewed public signup policy update: no lifetime limit on mailbox count
-- per verified contact. Existing public accounts and login credentials are preserved.
-- Existing mail_public_send_limits rows remain for audit/rollback; daily caps
-- are no longer enforced by the application after this release.
BEGIN;

DROP INDEX IF EXISTS mail_public_signups_one_contact_idx;

COMMIT;
