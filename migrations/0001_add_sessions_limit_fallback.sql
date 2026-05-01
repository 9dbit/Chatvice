-- Add limit_fallback column to sessions table
-- When a merchant's conversation quota is exhausted, sessions can be created in HUMAN mode
-- with this flag set to true so supervisors know the escalation reason.
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "limit_fallback" boolean DEFAULT false;
