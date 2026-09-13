---
name: AI suspension on subscription expiry
description: How expired trials and subscriptions suspend AI without overwriting merchant agent settings.
---

Expired trials and subscriptions must block AI responses at request time for both new and existing chat sessions. Keep the agent's merchant-controlled active setting unchanged.

**Why:** The active setting represents the merchant's own agent configuration. Changing it during billing suspension would lose whether the merchant intended the agent to be active and could prevent automatic restoration after payment.

**How to apply:** Treat subscription access as a separate runtime gate on every AI response path. Expiry processing should update subscription status; successful payment restores access without changing agent configuration.