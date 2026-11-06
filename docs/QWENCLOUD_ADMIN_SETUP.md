# Manual AI provider selection: OpenAI, QwenCloud, OpenRouter and DeepSeek

Login at `/admin/login`, open **Settings → AI Provider & Models**.

- QwenCloud is the default provider as requested by the owner. Keyword knowledge retrieval is the default so it does not depend on OpenAI credit. Previously saved manual settings take precedence. No automatic provider fallback. A missing Qwen key is shown as a configuration warning; AI replies require a valid key.
- Select QwenCloud and the region matching a **pay-as-you-go** key (Singapore default).
- Enter exact text and image-understanding model IDs available in that account. Defaults: `qwen-plus`, `qwen3-vl-plus`. Model availability must be verified by the connection test.
- Enter the API key in the password field, or set `QWENCLOUD_API_KEY` in the service environment. OpenAI supports the same panel and `OPENAI_API_KEY`.
- OpenRouter and DeepSeek are also available in the same selector. Each provider has separate text/vision model fields and an independently encrypted API key. Adding these choices does not change the saved active provider or existing keys. Old settings load the new model defaults without a database migration.

| Provider | Initial text model | Initial vision model | Optional server variable |
| --- | --- | --- | --- |
| OpenRouter | `qwen/qwen3.8-flash` | `qwen/qwen3.8-flash` | `OPENROUTER_API_KEY` |
| DeepSeek | `deepseek-flash` | `deepseek-flash` | `DEEPSEEK_API_KEY` |

- OpenRouter uses `https://openrouter.ai/api/v1` and its own API key/credits. Enter an exact `provider/model` ID from its catalog. The selected image model must support images. OpenRouter may route that model among its upstream providers according to the account's policies; Chatvice does not switch the selected provider automatically.
- DeepSeek uses `https://api.deepseek.com` and its own API key/balance. `deepseek-v4-pro` is an optional text-only model; use `deepseek-flash` for vision. Both providers receive `max_tokens`, not `max_completion_tokens`.
- For normal support latency, QwenCloud receives `enable_thinking: false`, OpenRouter `reasoning: { enabled: false }`, and DeepSeek `thinking: { type: 'disabled' }`. Choose OpenRouter models that support non-thinking mode; models requiring reasoning need a separate reasoning-aware integration. Provider endpoints are fixed server-side and cannot be supplied in admin requests.
- Blank keys preserve existing keys. New keys are encrypted with AES-256-GCM using a purpose-derived key from `AI_SETTINGS_ENCRYPTION_KEY` or `SESSION_SECRET` (32+ characters). Keep the encryption secret stable or re-enter saved keys after rotation. API responses do not return stored keys, even to admins.
- Test text and vision with synthetic input before saving. The test uses the selected account's API quota but does not activate settings.
- Saving changes provider/model for new requests across the platform, including widget chat, tool-call continuations, image understanding, translation, refinement, crawler extraction, blog and guide generation. In-flight requests finish using their snapshot. Gemini image generation is unchanged.
- If OpenAI quota is exhausted, select **Keyword search** for knowledge retrieval. Existing vectors are preserved. Qwen embedding vectors are deliberately not mixed with the existing OpenAI index. This option is keyword retrieval, not Qwen semantic embedding support.
- The change stores one versioned JSON setting in existing `platform_settings`; no schema migration. That setting is blocked from the public single-key route, generic writes, and bulk settings responses.
- FAQ cache namespace changes with configuration. Returning to OpenAI requires only selecting it and saving.
- Token counts are recorded using the response model. Models outside the existing OpenAI price list are excluded (zero estimate) rather than priced at unrelated OpenAI rates. Provider invoices remain authoritative, including OpenRouter credit-purchase fees and DeepSeek peak/off-peak pricing.

## Validation

The provider and React tests cover all four providers, text/vision routing, tool continuation, token-limit conversion, separate encrypted keys, blank-key preservation, legacy settings, missing keys, redaction, no cross-provider fallback on 429, test-without-save, admin authentication and origin checks. Existing repository-wide TypeScript errors are tracked separately; compare diagnostics against the deployed base before release.

Live provider validation requires the corresponding account key and quota. Do not claim live connectivity from mocked tests. In admin, choose the provider, enter its key, run **Test text & vision**, then **Save AI settings** to activate it. Testing does not save the draft or switch the active provider.

## Provider documentation

- https://docs.qwencloud.com/developer-guides/getting-started/regions
- https://docs.qwencloud.com/developer-guides/getting-started/first-api-call
- https://openrouter.ai/docs/quickstart
- https://openrouter.ai/qwen/qwen3.8-flash
- https://openrouter.ai/docs/guides/best-practices/reasoning-tokens
- https://api-docs.deepseek.com/quick_start/pricing/
- https://api-docs.deepseek.com/guides/thinking_mode/
- https://api-docs.deepseek.com/guides/vision/

QwenCloud uses region-specific `https://{region}.maas.qwencloudapi.com/compatible-mode/v1`. Token Plan keys/endpoints are not interchangeable with pay-as-you-go.
