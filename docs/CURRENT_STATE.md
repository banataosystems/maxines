# MAXINES — Verified Current State

Observed 2026-08-10 (Asia/Manila). This file records provider evidence because Pandora Memory is currently unavailable (404 / connector absent). It contains no credentials or customer data.

## Identity

- Product: MAXINES Telegram Mini App commerce.
- GitHub: `banataosystems/maxines`.
- Vercel project: `prj_Lf08luz6HGMnZXMpGodt7Cfo3WVC`.
- Production domain: `https://maxines.vercel.app`.
- Supabase project: `uweqyehikjliykjzgdgm` (`maxistyle`, ap-northeast-1).
- Telegram bot: `@maxinespain_bot`, Bot API id `8840952317`.
- Exact original recovery artifact: `MAXINES-Telegram-MiniApp-2026-08-10-v4.zip`.
- Original artifact SHA-256: `ca4681ccc7e3089a6bbaa0517dc01ecde4b78553a229df62b590010ef757ecd8`.
- Original v4 source test result: 16/16 passed before deployment transport changes.

## Truth stages

### Documented

- Source-backed 13 visible purchasable SKU/price records are preserved; the source blueprint claims 41 raw inventory images but the additional 28 purchasable SKU records were not fabricated.
- `TON` remains a source display label only. No TON-to-fiat conversion is invented.
- Production activation requires verified variants/stock, owner-approved settlement prices/currency, shipping policy, Telegram payment-provider credentials, and explicit checkout release authorization.

### Implemented

- Responsive storefront, search, category filters, product detail, variant UI, bag, Telegram WebApp boot and gated `openInvoice()` flow.
- Same-origin Vercel API proxy routes: catalog, health, session, checkout, order status, Telegram health.
- Supabase catalog/order/payment schema with RLS.
- Service-role-only inventory reservation, pre-checkout validation, cancellation and atomic payment-completion RPCs.
- Telegram `initData` HMAC-SHA256 validation with freshness checks.
- Telegram bot commands, menu button, secret-token webhook, pre-checkout handler and successful-payment finalization path.
- Provider secrets remain in Supabase Vault / Edge service context; no bot token, payment token, webhook secret or Supabase service key is committed to GitHub or returned to browsers.
- Commerce activation settings are fail-closed.

### Tested / provider-verified

- Supabase schema exists and RLS is enabled on all commerce/control tables.
- Mutation RPC ACLs were verified as executable only by `service_role` and `postgres`.
- Supabase security advisor reports no WARN/ERROR findings; remaining `rls_enabled_no_policy` entries are INFO and intentional deny-by-default boundaries.
- Production database state verified: 13 products, 13 variants, 0 payment prices, 0 checkout-enabled products, 0 orders, 0 payments.
- Telegram Bot API `getMe` verified `@maxinespain_bot`.
- Telegram bootstrap evidence is `completed`: webhook URL matches the Supabase webhook function, pending updates = 0, last error = null, menu type = `web_app`, menu text = `Shop MAXINES`, menu URL = `https://maxines.vercel.app/`, commands = `start`, `shop`, `help`.
- One-time Telegram bootstrap endpoint was redeployed inert after completion (`410` behavior).
- Vercel reported no runtime error clusters during the verification window.
- Live `/api/catalog` returns 13 database-backed products and exposes only `inStock` booleans, not exact stock counts.
- Live `/api/health` reports the full backend is fail-closed.

### Deployed

- Runtime implementation commit: `0b44e627f0a2fb2f2e2d2061307997da76077ff2` (`feat: wire MAXINES gated Telegram checkout UX`).
- Matching production deployment: `dpl_6wEAP4UgBZxXPkCdTh8oV7dmok9F`, READY, alias includes `maxines.vercel.app`.
- Subsequent Git commits only preserve provider migrations/rollback/evidence unless a later state record says otherwise.
- Supabase Edge Function `maxines-api`: version 3, ACTIVE, provider SHA-256 `e7da3146abaa9aa7bbfa00dfcc8d83014fd4d7092b6186eeefdf39456e3e4a63`.
- Supabase Edge Function `maxines-telegram-webhook`: version 2, ACTIVE, provider SHA-256 `abffb2aed1c97d12952f6b62a7e77359a84ad1d1b34ec36c4371cbb044488973`.
- One-time `maxines-telegram-bootstrap`: version 4 is inert after successful configuration, provider SHA-256 `e94a7918adb84bb288c71581d5c1fa749728a210b46e79fd1f33186ba3edc38c`.

### Production-verified

Verified now:

- `https://maxines.vercel.app` responds successfully.
- Same-origin database-backed catalog and health APIs respond successfully.
- Vercel deployment provenance is bound to the exact Git commit.
- Telegram bot identity and bot configuration are provider-verified.
- Production gate is closed: `paymentProviderConfigured=false`, `releaseAuthorized=false`, `paymentCurrencyConfigured=false`, `shippingConfigured=false`, `inventoryConfigured=false`, `checkoutActivated=false`.

Not yet production-verified:

- Real authenticated Telegram user `initData` through an actual phone Mini App launch.
- Real `/start` or `/shop` webhook delivery from a human Telegram account.
- Owner-approved real sizes and stock.
- Owner-approved provider settlement prices/currency.
- Shipping amount/policy.
- Telegram payment-provider token.
- Real invoice, pre-checkout and successful-payment journey.
- Independent mobile visual review of the current production UI.

## Supabase applied migration history

1. `20260810143847` — `maxines_commerce_foundation`
2. `20260810144157` — `harden_touch_updated_at_search_path`
3. `20260810144240` — `telegram_vault_bridge`
4. `20260810144300` — `backend_capabilities_probe`
5. `20260810145140` — `telegram_webhook_secret_bridge`
6. `20260810145217` — `enable_sync_http_for_telegram_control` (temporary)
7. `20260810145247` — `telegram_bot_bootstrap_control` (temporary)
8. `20260810145348` — `telegram_bootstrap_state`
9. `20260810145720` — `retire_telegram_bootstrap_transports`
10. `20260810145832` — `commerce_activation_gates`

Temporary synchronous/async database HTTP bootstrap transports were removed after Telegram configuration succeeded.

## Rollback

- Fast commerce kill switch: `supabase/rollback/disable_checkout.sql` only sets `checkout_release_authorized=false`; it does not destroy products, stock, orders, payments or evidence.
- Previous Vercel production rollback candidate before the checkout-UX change: `dpl_FyCQZDSzbxhpPLTAYPiCCpMxFmEK` at Git commit `52c5a8c7b563c75b7cf5d13075d1adca26d8ebbc`.
- Exact original v4 ZIP remains the content-addressed recovery authority.

## Current phase

**Production storefront + database + Telegram control plane deployed; commerce activation fail-closed.**

## Current blockers / owner or external inputs

1. Verified real product variants and stock.
2. Approved settlement currency and per-product provider prices.
3. Approved shipping policy/amount.
4. Telegram-compatible physical-goods payment provider token.
5. Explicit commerce release authorization after the above are reviewed.
6. Human Android/Telegram Mini App proof and independent visual/payment review before any claim of end-to-end production completion.
7. Pandora Memory restoration so this provider evidence can be reconciled back into the authoritative project memory.

## Next safe action

Keep checkout closed. Continue automated read/security/provenance checks and source mirroring; once the missing business/payment inputs are genuinely verified, load them without enabling release, validate the exact configured candidate, obtain required review, then separately authorize commerce activation.
