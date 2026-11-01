BEGIN;
-- Mailbox-scoped, user-entered reminders. No inferred billing or external scheduler.
CREATE TABLE mail_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id varchar(32) NOT NULL REFERENCES merchants(id),
  mailbox_id uuid NOT NULL REFERENCES mail_mailboxes(id) ON DELETE CASCADE,
  title text NOT NULL,
  due_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mail_reminders_mailbox_due_idx ON mail_reminders(tenant_id,mailbox_id,due_date,id);
COMMIT;
