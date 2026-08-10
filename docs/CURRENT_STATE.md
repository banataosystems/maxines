# MAXINES — Verified Current State

Observed 2026-08-10 (Asia/Manila). This file records durable provider evidence because Pandora Memory is currently unavailable through this ChatGPT connection. It contains no credentials or customer data.

## Identity and recovery

- Product: MAXINES Telegram Mini App commerce.
- GitHub: `banataosystems/maxines`.
- Production: `https://maxines.vercel.app`.
- Vercel project: `prj_Lf08luz6HGMnZXMpGodt7Cfo3WVC`.
- Supabase: `uweqyehikjliykjzgdgm` (`maxistyle`).
- Telegram: `@maxinespain_bot`, Bot API id `8840952317`.
- Canonical original artifact: `MAXINES-Telegram-MiniApp-2026-08-10-v4.zip`.
- Canonical artifact SHA-256: `ca4681ccc7e3089a6bbaa0517dc01ecde4b78553a229df62b590010ef757ecd8`.
- Exact v4 Supabase foundation is also mirrored to GitHub in `recovery/MAXINES-v4-supabase-foundation.tar.gz`.

## Implemented

- Database-backed 13-SKU storefront, search, collections, product sheets, variants and cart.
- Telegram Mini App bootstrap and Telegram `initData` HMAC/freshness validation.
- Telegram bot `/start`, `/shop`, `/help`, Web App menu and secret-token webhook.
- Supabase RLS commerce schema, inventory reservations, order/payment state and atomic payment settlement.
- Same-origin Vercel APIs for catalog, health, Telegram session, checkout, order status and Telegram health.
- Gated Telegram invoice path for physical-goods payments.
- CSP, HSTS, nosniff, strict referrer policy, restrictive permissions policy and SAMEORIGIN framing.
- Non-destructive commerce kill switch in `supabase/rollback/disable_checkout.sql`.
- Active Supabase Edge sources and recovery material mirrored into GitHub without secret values.

## Safe operational fallback

Because the connected sources contain no verified live stock, approved settlement prices/currency, shipping policy or Telegram physical-goods payment-provider token, paid checkout remains fail-closed.

To make the production system useful without inventing those inputs, MAXINES now has an authenticated **availability-request** path:

- Shown only to verified Telegram Mini App users when paid checkout is locked and the bag is non-empty.
- Creates an availability request only; it is explicitly **not a confirmed order**.
- Takes **no payment** and reserves **no inventory**.
- Telegram user receives a confirmation stating no payment was taken.
- Duplicate identical pending requests by the same user within ten minutes are reused.
- `availability_requests` has RLS and no direct `anon` or `authenticated` access.
- `create_availability_request(...)` is executable only by `service_role`.
- Same-origin routes: `POST /api/request`, `GET /api/requests`.
- Unauthenticated `/api/requests` is production-verified to return HTTP 401 `telegram_auth_required`.

Supabase Edge function `maxines-request` version 1 is ACTIVE with provider SHA-256 `bdabda3d78a6dce2d98840b60a73f7f4599893f0ca53728aae7b20080ffc4f37`.

## Production evidence

Verified runtime code candidate:

- Git runtime/test commit: `cc4d16a52d7a4f68a1848d3163268287b45fdc4a`.
- Matching production deployment: `dpl_BvqGqDCUyEMy5NULnzZyVQ3swYYL`, READY.
- Verification PR #1 used that exact production base plus this documentation-only state record.
- PR verification head: `9a5acc6758f816811c8b90b9835c4822d793c6b5`.
- GitHub Actions `Verify MAXINES` run `31405579570`: **completed / success**; `npm run verify` passed.
- PR #1 was squash-merged to `main` as `0376ddc3cfaaf012ae83f93da48a86b83dc4e9a7`.
- Matching merged production deployment: `dpl_3pFkXNGnEtMVwAfJAPoVicXdyCEH`, READY; GitHub commit verification reported `verified`.
- `/api/health`: HTTP 200.
- Health state: database connected; 13 products; Telegram configured; webhook secret configured; paid checkout disabled.
- Paid-commerce gates: payment provider false; release authorization false; settlement currency unset; shipping unset; verified inventory false; `checkoutActivated=false`.
- Database verification after fallback: 0 availability requests, 0 orders, 0 payments.
- Availability-request RLS: enabled.
- Direct availability table SELECT for `anon` and `authenticated`: false.
- Availability creation RPC execute for `anon`/`authenticated`: false; for `service_role`: true.
- Supabase security advisor: no WARN/ERROR findings; remaining RLS-without-policy entries are intentional INFO deny-by-default boundaries.
- Vercel runtime error check over the final verification window: no runtime error clusters.

## CI repair and proof

GitHub Actions verification had been red because a rollback safety test matched the word `delete` inside a harmless SQL comment (`does not delete ...`). The test was corrected to strip SQL comments before scanning executable statements for `DELETE`, `DROP` or `TRUNCATE`.

The independent pull-request run then passed every workflow step, including `npm run verify`, before merge. CI is therefore green for the verified production code candidate.

## Applied Supabase migrations

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
11. `20260810153952` — `availability_request_fallback`

## Current phase

**Production storefront, database, Telegram control plane, full gated commerce backend, CI verification and non-charging authenticated availability-request workflow are deployed and verified. Paid commerce remains intentionally fail-closed until genuine merchant inputs exist.**

## Genuine external inputs still absent

Searches of the MAXINES Supabase Vault, project/library artifacts, connected Gmail and connected Google Drive found no authoritative values for:

1. Verified real product sizes and stock quantities.
2. Owner-approved settlement currency and per-SKU provider prices.
3. Owner-approved shipping policy/amount.
4. Telegram-compatible physical-goods payment-provider token.
5. Real human-phone Mini App/payment proof.

These values must not be fabricated. The source `TON` labels are display data and are not silently converted into settlement prices.

## Release rule

Keep real-money checkout closed. When genuine merchant inputs are supplied through an authoritative source, load and validate them first with release authorization still false; then run real Telegram/mobile/payment verification; only after that separately authorize paid commerce.
