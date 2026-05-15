-- Add fallback Google Sheet source to custom_data_intents
-- When a primary panel API lookup returns not_found or error and this column
-- is set, the backend fetches that sheet and uses GPT to answer instead.
ALTER TABLE "custom_data_intents" ADD COLUMN IF NOT EXISTS "fallback_source_id" varchar(32) REFERENCES "sources"("id") ON DELETE SET NULL;

-- Add fallback tracking columns to the audit log so merchants can see when
-- the sheet fallback was used and whether it succeeded.
ALTER TABLE "custom_data_audit_log" ADD COLUMN IF NOT EXISTS "fallback_used" boolean DEFAULT false;
ALTER TABLE "custom_data_audit_log" ADD COLUMN IF NOT EXISTS "fallback_outcome" text;
