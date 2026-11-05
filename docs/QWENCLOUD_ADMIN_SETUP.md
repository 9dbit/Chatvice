# Manual AI provider selection

Login at `/admin/login`, open **Settings → AI Provider & Models**.

- QwenCloud is the default provider as requested by the owner. Keyword knowledge retrieval is the default so it does not depend on OpenAI credit. Previously saved manual settings take precedence. No automatic provider fallback. A missing Qwen key is shown as a configuration warning; AI replies require a valid key.
- Select QwenCloud and the region matching a **pay-as-you-go** key (Singapore default).
- Enter exact text and image-understanding model IDs available in that account. Defaults: `qwen-plus`, `qwen3-vl-plus`. Model availability must be verified by the connection test.
- Enter the API key in the password field, or set `QWENCLOUD_API_KEY` in the service environment. OpenAI supports the same panel and `OPENAI_API_KEY`.
- Blank keys preserve existing keys. New keys are encrypted with AES-256-GCM using a purpose-derived key from `AI_SETTINGS_ENCRYPTION_KEY` or `SESSION_SECRET` (32+ characters). Keep the encryption secret stable or re-enter saved keys after rotation. API responses do not return stored keys, even to admins.
- Test text and vision with synthetic input before saving. The test uses the selected account's API quota but does not activate settings.
- Saving changes provider/model for new requests across the platform, including widget chat, tool-call continuations, image understanding, translation, refinement, crawler extraction, blog and guide generation. In-flight requests finish using their snapshot. Gemini image generation is unchanged.
- If OpenAI quota is exhausted, select **Keyword search** for knowledge retrieval. Existing vectors are preserved. Qwen embedding vectors are deliberately not mixed with the existing OpenAI index. This option is keyword retrieval, not Qwen semantic embedding support.
- The change stores one versioned JSON setting in existing `platform_settings`; no schema migration. That setting is blocked from the public single-key route, generic writes, and bulk settings responses.
- FAQ cache namespace changes with configuration. Returning to OpenAI requires only selecting it and saving.
- Qwen token counts are recorded using the response model. Qwen/unknown model costs are excluded (zero estimate) rather than priced at OpenAI rates. Provider invoices remain authoritative.

## Validation

13 tests cover provider routing, images, tool continuation, max-token conversion, key encryption/redaction, missing keys, no fallback on 429, test-without-save, admin authentication, origin checks and the React settings flow. Production build passed. Existing repository-wide TypeScript errors are tracked separately; compare diagnostics against the deployed base before release.

Live Qwen validation requires an account key. Do not claim live connectivity from mocked tests.

## Provider documentation

- https://docs.qwencloud.com/developer-guides/getting-started/regions
- https://docs.qwencloud.com/developer-guides/getting-started/first-api-call

QwenCloud uses region-specific `https://{region}.maas.qwencloudapi.com/compatible-mode/v1`. Token Plan keys/endpoints are not interchangeable with pay-as-you-go.
