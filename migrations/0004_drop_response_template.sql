-- Drop the response_template column from custom_data_intents (no longer used)
ALTER TABLE "custom_data_intents" DROP COLUMN IF EXISTS "response_template";
