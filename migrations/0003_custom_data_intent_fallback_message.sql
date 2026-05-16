-- Add merchant-configurable fallback message to custom_data_intents
-- When both the primary panel API lookup and the Google Sheet fallback fail
-- (or no sheet fallback is configured), the system shows this message to the
-- customer instead of the generic hardcoded error string.
ALTER TABLE "custom_data_intents" ADD COLUMN IF NOT EXISTS "fallback_message" text;
