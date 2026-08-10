# MAXINES — Telegram Mini App commerce

A production-oriented, dependency-free Telegram Mini App for a premium editorial apparel storefront, built from the supplied **Atelier App Blueprint**.

## What is implemented

- Premium monochrome, high-contrast, grid-strict UI (`#F9F9F9`, `#121212`, `#8E8E8E`), serif brand/editorial type and monospaced commerce metadata.
- Mobile-first two-column catalog, collection filtering, search, product-detail sheet, variant selector, persistent bag, quantity controls, bottom-sheet cart, account/session view and order status UI.
- Telegram Mini App boot, theme adaptation, BackButton integration, haptics, `initData` forwarding and native `openInvoice()` checkout.
- Server-side Telegram `initData` HMAC validation with freshness checks.
- Native Telegram physical-goods invoice creation through a BotFather payment provider token.
- `/start`, `/shop`, and `/help` bot handling, Mini App menu-button bootstrap, `pre_checkout_query` validation and `successful_payment` webhook handling.
- Supabase/Postgres inventory reservations, server-authoritative settlement prices, transactional stock decrement, idempotent payment charge storage and order state machine. Modern `sb_secret_*` API keys are supported server-side without misusing them as JWT bearer tokens.
- Production fail-closed gates for missing/unknown stock, variants, settlement prices, Telegram credentials or database configuration.
- A non-production TEST gateway that can exercise the complete UI flow without moving money.
- Security headers, RLS, no client-side secrets, and test coverage for Telegram signature verification, cart normalization and source-catalog safety.

## Important source correction

The blueprint's UX and category system are implemented, including the source `TON` price labels. However, this is a **physical apparel store**. Production checkout therefore uses Telegram's physical-goods Payments API with a BotFather payment provider. The source `TON` labels are not silently treated as provider settlement currency and no conversion rate is invented.

Before a SKU can charge a customer, the merchant must provide:

1. verified variant/size and stock;
2. an owner-approved settlement price in the configured provider currency;
3. a Telegram payment provider token.

Until then `checkout_enabled=false` for source-derived items.

## Source completeness

The blueprint states that 41 raw inventory images should feed the app, but visibly specifies only **13 purchasable SKU/price records**. Those 13 are included with source-derived image crops. The other 28 are not fabricated. See `docs/SOURCE_GAPS.md`.

## Structure

```text
public/                  Mini App UI + source-backed product imagery
api/                     Vercel server functions
server/                  Telegram, Supabase, auth and order modules
supabase/migrations/     Production database + transactional RPCs
supabase/seed.sql        Source-backed catalog seed (checkout locked)
scripts/                 Local dev, syntax check, webhook registration
tests/                   Node built-in tests
docs/                    Architecture, payment, deployment and security
```

## Local preview

No npm packages are required.

```bash
npm run dev
# http://127.0.0.1:3000
```

A normal browser is preview-only. To exercise the isolated fake checkout locally:

```bash
ALLOW_DEMO_CHECKOUT=true npm run dev
```

The code prevents this TEST gateway from running when `NODE_ENV=production` or `VERCEL_ENV=production`.

## Verification

```bash
npm run verify
```

This runs syntax checks over all JavaScript plus Node's built-in test suite.

## Production setup

See `docs/DEPLOYMENT.md`, `docs/SUPABASE_TARGET.md`, and `.env.example`. After deploying, `npm run telegram:bootstrap -- https://your-production-host` registers the webhook, commands, and Shop MAXINES menu button. Keep `SUPABASE_SECRET_KEY` server-only; the current Mini App does not need to expose the publishable key because Telegram `initData` is authenticated by the same-origin backend. The production payment proof gate is the Bot API `successful_payment` webhook plus a matching database transaction — not the presence of an invoice link or a client callback.
