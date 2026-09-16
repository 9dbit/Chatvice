---
name: Effective plan limits
description: Convention for enforcing subscription limits that administrators can override.
---

Any merchant-facing feature limit that can be edited in the Master Control Panel must be calculated from the database-backed effective subscription plan. Static plan definitions are fallback defaults only.

**Why:** Admin overrides can differ from bundled defaults. Reading static definitions in merchant endpoints makes the admin UI appear saved while merchants remain subject to the old limit.

**How to apply:** Use the shared effective-plan loader for summaries and every mutation that enforces the same quota. Apply merchant-purchased extra slots after resolving the effective base limit, and preserve `-1` as unlimited.