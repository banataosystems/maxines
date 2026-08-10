# MAXINES Archive — high-resolution responsive release

## Customer-facing media
Only high-resolution Studio Views with verified product association are eligible for commerce UI in this release.

Published mappings:
- SHRT-89 → 2311
- OUT-014 → 2319
- OUT-012 → 2317
- PRT-002 → 2305

Other high-end editorial candidates remain preserved outside the customer commerce surface until their product association and transport are independently verified.

## Responsive contract
The storefront has deliberate modes for:
- compact phones below 360px
- standard phones
- landscape phones and foldables
- tablets from 600px
- desktop/web preview from 1024px
- wide displays from 1600px

Telegram safe-area and viewport height variables are respected. Product and editorial media use fixed aspect ratios, skeleton placeholders, lazy hydration and content-visibility to reduce layout shift and unnecessary initial work.

## Commerce safety
This release does not activate checkout, change inventory, settlement prices, shipping, provider credentials or release authorization. Existing server-side fail-closed gates and authenticated availability-request fallback remain authoritative.
