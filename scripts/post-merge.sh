#!/bin/bash
set -e

npm install

# Apply any SQL migration files that drizzle-kit push would prompt interactively about.
# We do these first so db:push sees no outstanding changes for these constraints.
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
pool.query(\`
  DO \$\$
  BEGIN
    -- gaming_merchants unique constraint (triggers interactive prompt in drizzle-kit push)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'gaming_merchants_merchant_id_unique'
        AND table_name = 'gaming_merchants'
    ) THEN
      ALTER TABLE gaming_merchants ADD CONSTRAINT gaming_merchants_merchant_id_unique UNIQUE (merchant_id);
    END IF;

    -- custom_data_intents fallback source FK
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'custom_data_intents_fallback_source_id_fkey'
        AND table_name = 'custom_data_intents'
    ) THEN
      ALTER TABLE custom_data_intents
        ADD CONSTRAINT custom_data_intents_fallback_source_id_fkey
        FOREIGN KEY (fallback_source_id) REFERENCES sources(id) ON DELETE SET NULL;
    END IF;

    -- sessions limit_fallback column
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'sessions' AND column_name = 'limit_fallback'
    ) THEN
      ALTER TABLE sessions ADD COLUMN limit_fallback boolean DEFAULT false;
    END IF;

    -- custom_data_intents fallback_source_id column
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'custom_data_intents' AND column_name = 'fallback_source_id'
    ) THEN
      ALTER TABLE custom_data_intents ADD COLUMN fallback_source_id varchar(32);
    END IF;

    -- custom_data_audit_log fallback columns
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'custom_data_audit_log' AND column_name = 'fallback_used'
    ) THEN
      ALTER TABLE custom_data_audit_log ADD COLUMN fallback_used boolean DEFAULT false;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'custom_data_audit_log' AND column_name = 'fallback_outcome'
    ) THEN
      ALTER TABLE custom_data_audit_log ADD COLUMN fallback_outcome text;
    END IF;
  END
  \$\$;
\`).then(() => { console.log('[post-merge] SQL migrations applied'); pool.end(); })
  .catch(e => { console.error('[post-merge] SQL migration error:', e.message); pool.end(); process.exit(1); });
"

npm run db:push -- --force
