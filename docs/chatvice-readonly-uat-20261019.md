# Chatvice read-only post-cutover UAT

Command:

```bash
node scripts/chatvice-readonly-uat.mjs --base https://chatvice.app --www https://www.chatvice.app
```

This is a repeatable **public nonfinancial smoke suite**. It issues GET requests only, with no session cookies, no credentials, no order creation, and no database mutation. It checks the home page, health and database readiness, public session guards, top-up token negative paths, and a nonexistent media object response. Exit code 1 means at least one assertion failed.

## Scope exclusions

This script does **not** prove merchant login/logout persistence, real AI replies and chat logs, tenant isolation under authenticated identities, uploads or historical media completeness, real PayPal/12Pay callback idempotency, email delivery, or background scheduler ownership. These require a dedicated staging environment, consented test merchant/admin identities, isolated synthetic data and mock payment gateway events.

Never use production credentials, trigger live charges, activate background workers, change DNS, or alter the old Replit database while using this script. Keep these UAT gates separate from public smoke checks.
