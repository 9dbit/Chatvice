#!/usr/bin/env bash
set -euo pipefail
# Disposable loopback-only database, with no production connection or credentials.
export PGDATA=/tmp/chatvice-onboarding-ci
initdb --auth=trust --no-locale --encoding=UTF8 > /tmp/chatvice-initdb.log
pg_ctl -l /tmp/chatvice-postgres.log -o '-h 127.0.0.1 -p 55432' start
trap 'pg_ctl stop -m fast >/dev/null 2>&1 || true' EXIT
export DATABASE_URL=postgresql://postgres@127.0.0.1:55432/postgres
export CHATVICE_MAIL_INTEGRATION_DB=isolated-ci
node --import tsx --test server/mail/app-schema.test.ts
node --import tsx --test server/mail/onboarding.integration.test.ts
node --import tsx --test server/mail/integration.test.ts
echo CHATVICE_MAIL_ONBOARDING_DATABASE_TESTS_PASSED
