# MAXINES — Verified Current State

Observed 2026-08-11 (Asia/Manila). This is the durable project-state record while Pandora Memory is unavailable through this ChatGPT connection. It contains no credentials or customer data.

## Identity and recovery

- Product: MAXINES Telegram Mini App commerce.
- GitHub: `banataosystems/maxines`.
- Production: `https://maxines.vercel.app`.
- Vercel project: `prj_Lf08luz6HGMnZXMpGodt7Cfo3WVC`.
- Supabase: `uweqyehikjliykjzgdgm` (`maxistyle`).
- Telegram: `@maxinespain_bot`.
- Canonical original artifact SHA-256: `ca4681ccc7e3089a6bbaa0517dc01ecde4b78553a229df62b590010ef757ecd8`.
- Supabase foundation recovery bundle SHA-256: `a1b330d3f7d793bc49e6982f19cf4e8398e72142c82a91351fd2298e44a97f28`.

## Current production release

- Runtime Git commit: `f9f70c3ca1d3c309348b6f145099a5c59144311b`.
- Vercel production deployment: `dpl_48HutLwzLGYbU5zei6h5TReZyLPb` — READY.
- PR #7 merged the audit-driven production hardening.
- PR #8 merged live staff-role revalidation and database covering indexes.
- PR #9 was verification-only and is closed without merge.
- GitHub Actions proof: run `31438607469` passed PR #7; run `31439182763` passed PR #8; run `31439784642` passed the isolated authenticated-session E2E proof.
- Current Vercel production deployment has no error/fatal runtime logs in the final verification window.

## Customer frontend

- Render-first startup: the Archive interface renders from embedded source-backed data before catalog/health/session network hydration completes.
- Browser zoom is enabled; `user-scalable=no` was removed.
- Root-wide `aria-live` was removed and replaced by a dedicated status live region.
- Search now returns real clickable product results and uses a short debounce instead of rebuilding on every key synchronously.
- Dialogs implement Escape close, focus trapping, focus-on-open and focus restoration.
- Customer pricing shows **Price on request** while commercial activation is false; source TON labels remain provenance data and are not presented as approved sale prices.
- Saved items persist locally for anonymous/web viewing and synchronize to the database for authenticated Telegram users.
- Account UI exposes the authenticated user's availability-request and order history.
- Owner availability inbox exists but is hidden unless the verified Telegram session maps to an active `staff_users` role.
- Responsive layouts remain deliberate for compact phones, phones, landscape/foldables, tablets, desktop and wide screens.

## Media

Only fully verified high-resolution commerce associations are customer-facing:

- `SHRT-89` → `2311` — Botanical Contrast Collar.
- `OUT-014` → `2319` — Heritage Plaid.
- `OUT-012` → `2317` — Chartreuse Military Cut.
- `PRT-002` → `2305` — Leopard Box.

Customer media now resolves through same-origin `/api/media?id=...` as real `image/webp` resources rather than browser-executed base64 JavaScript. The production 2311 media endpoint is HTTP 200 with WebP content and public caching. Other editorial candidates remain preserved but unlinked until their SKU association is verified.

## Authentication and customer sessions

- Telegram `initData` HMAC/freshness validation remains server-side.
- Successful Telegram bootstrap creates a signed short-lived MAXINES application session.
- Vercel stores the token as `mx_session` with `HttpOnly`, `Secure`, `SameSite=Lax`, 30-minute TTL.
- Normal customer APIs forward the session server-to-server as `x-maxines-session`; the token is not returned to browser JSON.
- Production E2E proof run `31439784642` used a fixed synthetic Telegram identity and verified:
  - session bootstrap HTTP 200;
  - `HttpOnly=true`, `Secure=true`;
  - browser response did not expose `sessionToken`;
  - session GET 200;
  - favorites 200;
  - orders 200;
  - availability requests 200;
  - owner inbox 403 for a non-staff identity;
  - authenticated checkout 503 `payment_provider_not_configured`;
  - synthetic audit/favorite cleanup succeeded.
- The one-time Supabase verifier has been replaced by an inert HTTP 410 implementation.

## Private customer / owner data foundation

Applied and mirrored migrations:

- `20260811_000001_customer_owner_ops.sql`
  - `user_favorites`
  - `staff_users`
  - `audit_events`
  - RLS enabled, direct public/anon/authenticated access revoked.
  - `maxines_record_audit(...)` is service-role-only.
- `20260811_000002_performance_covering_indexes.sql`
  - covering indexes for `order_items.order_id`, `order_items.product_id`, `order_items.variant_id`, and `user_favorites.sku`.

The Supabase performance advisor no longer reports unindexed-foreign-key warnings for those relationships. Remaining index notices are INFO unused-index observations on a low/no-traffic system. Security advisor has no WARN/ERROR findings; RLS-without-policy notices are intentional deny-by-default INFO boundaries.

## Owner operations

- Staff roles are stored in `staff_users` with `owner`, `admin`, or `staff` role and active flag.
- Every privileged owner-inbox request re-queries the current active staff row instead of relying only on the role cached in the 30-minute session.
- Availability-request status changes are audited.
- New customer availability requests can notify active staff Telegram accounts.
- **Current `staff_users` count is 0.** No owner/staff identity is activated because no authoritative Telegram numeric user ID has been supplied. Do not guess one.

## Commerce / safety state

Current database proof after all synthetic cleanup:

- Canonical products: 13.
- Checkout-enabled products: 0.
- In-stock enabled variants: 0.
- Orders: 0.
- Payments: 0.
- Availability requests: 0.
- Favorites: 0.
- Audit events: 0.
- Staff users: 0.
- Checkout release authorization: false.
- `/api/health`: HTTP 200 with `checkoutActivated=false` and `mode=full_backend_fail_closed`.

Paid commerce therefore remains intentionally impossible. No stock, merchant settlement price/currency, shipping amount, provider token, or release authorization was fabricated.

## Active Edge functions

- `maxines-api` v5 — ACTIVE. Signed application sessions, favorites, customer orders, owner inbox, live staff revalidation, audit events, gated checkout.
- `maxines-request` v2 — ACTIVE. Signed-session reuse, customer confirmation, staff notification, request audit.
- `maxines-e2e-test` v2 — ACTIVE but intentionally inert; always HTTP 410.

## Build / security hardening

- Node runtime pinned to `24.x`, matching Vercel's current supported project runtime.
- CSP now includes `object-src 'none'` and `manifest-src 'self'` in addition to the existing self-only/default restrictions.
- HSTS, `nosniff`, restrictive Permissions Policy, strict referrer policy and SAMEORIGIN framing remain live.
- Current production build completes cleanly without the Node 20 deprecation blocker.

## Analytics

First-party `audit_events` infrastructure is implemented. Connected PostHog could not be configured or verified because the connector currently returns `400: We couldn't connect your account. Please try again.` Do not claim PostHog is active for MAXINES until the connection works and event ingestion is verified.

## Remaining external / evidence gates

1. Verified real sizes and stock quantities.
2. Owner-approved settlement currency and per-SKU payment prices.
3. Owner-approved shipping policy/amount.
4. Telegram-compatible physical-goods payment-provider token.
5. Explicit commerce release authorization after real payment testing.
6. Authoritative Telegram numeric ID for the owner/staff account before enabling the owner console.
7. Reconciliation of remaining editorial candidates to the remaining catalog SKUs.
8. Real physical-device visual/performance verification can still improve evidence beyond the responsive source/CI contract.
9. Connected PostHog must reconnect before external product analytics/session replay can be claimed.

## Current phase

**Hardened premium storefront, Telegram control plane, signed customer session, persistent authenticated favorites/account history, latent staff owner inbox, first-party audit foundation, transactional commerce backend, CI and production E2E session proof are implemented and deployed. Real-money commerce remains correctly fail-closed pending genuine merchant inputs and release authorization.**

## Release rule

Do not enable paid checkout from display labels or guessed merchant data. Load genuine merchant inputs with release authorization still false, validate them, perform real Telegram/payment proof, then separately authorize production commerce.
