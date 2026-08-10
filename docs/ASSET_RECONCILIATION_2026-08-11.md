# MAXINES Archive — Asset Reconciliation

Observed 2026-08-11 (Asia/Manila). This record governs the current raw-photo and AI-editorial media set. Originals remain immutable in the ChatGPT Library under `/ProjectOS/MAXINES/Inventory Photos/2026-08-10/`. AI outputs remain separate under `/ProjectOS/MAXINES/Editorial Candidates/2026-08-10/`.

## Reconciliation totals

- INPUT RAW GARMENT IMAGES: **18**
- PRESERVED RAW ORIGINALS IN LIBRARY: **18**
- AI EDITORIAL CANDIDATES GENERATED: **18**
- AI EDITORIAL CANDIDATES PRESERVED SEPARATELY: **18**
- RAW IMAGES EXACTLY/STRONGLY RECONCILED TO LIVE PRODUCT RECORDS: **7**
- VERIFIED AI STUDIO VIEWS PUBLISHED TO THE MINI APP: **7**
- VERIFIED WEB-OPTIMIZED ORIGINAL-PHOTO DERIVATIVES PUBLISHED: **7**
- RAW / AI CANDIDATES STILL NEEDING PRODUCT ASSOCIATION REVIEW: **11**
- KNOWN INCORRECT ASSOCIATIONS RETAINED: **0**

## Verified published mappings

| Raw asset | Raw SHA-256 | Live SKU | Live source product | AI Studio View | Original Photo derivative | Status |
|---|---|---|---|---|---|---|
| 2223.jpg | `48e2210c73e08bc5254f4225a6b76f8d92cd25b4e4f5e5d341dc5e113e621dbe` | SHRT-89 | Botanical Contrast Collar | Published | Published | Verified mapping |
| 2217.jpg | `73ebc0b85fb56ff04ce427b474d6e548efefd839eec1497b8f3567ac76daaa85` | OUT-014 | Heritage Plaid | Published | Published | Verified mapping |
| 2222.jpg | `cda71e9f0f71a4b5f6a8b948be0017413264414f1198c039e0ada0b727941ab8` | GRF-101 | Vintage Eagle Lace | Published | Published | Verified mapping |
| 2213.jpg | `d01e4f57ec14f6b01f2ac01dd0e73c78aead2277b5f87f8a1814635431737e18` | BSC-06 | Deep Burgundy | Published | Published | Verified mapping |
| 2215.jpg | `b87917dd14c7263e600ecaa40489b72c0ae4332a84fae9738ac48eeb23e43726` | OUT-012 | Chartreuse Military Cut | Published | Published | Verified mapping |
| 2221.jpg | `85f66279fd99f9fd3029364f1e5102c86d6713c5fcb11b250e99df58c14a6b15` | PRT-003 | Wrap Silk | Published | Published | Verified mapping |
| 2212.jpg | `fa9b54bf162ffd8c2a482167569cd244ea8e44c0daced61fdda4be8b85e82a59` | PRT-002 | Leopard Box | Published | Published | Verified mapping |

The published `Original Photo` layer uses only resizing/compression for web delivery. The raw JPG remains the recovery/authenticity authority and is not overwritten.

## Needs Review — no live product association published

| Raw asset | SHA-256 | Visible garment summary | State |
|---|---|---|---|
| 2195.jpg | `18b31740518f966e47f5f99131cb252d26b5638be41d93a6ed1b0a8c79eba2ae` | gray short-sleeve maxi dress | Needs Review |
| 2196.jpg | `bb069e797ca3fc0a2c1e2e718e4552712606b4a38b06be8a03e3cd377be53f3a` | bright pink ruffle top | Needs Review |
| 2208.jpg | `d31aaf2a457fd34f1a8494330957d2bc5dae92e3829ab862cc4af99f7ced42bb` | navy long shirt dress | Needs Review |
| 2209.jpg | `7f8ce71ff7887375de6c255da185fe1b67daa2e4bf6472dce72b2e2023f47e6a` | bright blue gathered-sleeve blouse | Needs Review |
| 2210.jpg | `d99f4a25c99465fc5a19dd1f8d98be8b382bcf836a847649e7f5aee897f1ed25` | white lace long-sleeve bodysuit | Needs Review |
| 2211.jpg | `5223390b4c9d1468e1bc95536bf2dba9ca6b52f73d37a268008a1816b6b33d6d` | plum long-sleeve collared shirt | Needs Review |
| 2214.jpg | `e8cf226c4520c5adab08290f5d51cd72796a49c60734f9bad2d573de15cc01d1` | coral/orange cropped sweater | Needs Review |
| 2216.jpg | `9f60c59361d215529234b15c6c95130a2a98ba2400c186d09864ab79dbeb15d5` | cream speckled maxi dress | Needs Review |
| 2218.jpg | `513f95ba3dd1a0d8364fbfc37d26e920a51cf926ad46aef22fd171ade01f0157` | pale button-down shirt | Needs Review |
| 2219.jpg | `29a01f759797d5e690ff1b189f22330ea98449bc5574e8b6dcd83b54ef73e711` | black ribbed top with statement cuffs | Needs Review |
| 2220.jpg | `8c5d43b0f9564145537e0df6dd8ffca3d78ace95a3ba23f2436fc10029273b4c` | pink/ivory embroidered satin bomber | Needs Review |

Each of these also has an AI editorial candidate preserved in the separate Editorial Candidates folder, but none is attached to a live SKU until product identity is reconciled.

## Rejected mismatch

`2210.jpg` (white lace bodysuit) was initially associated with `GRF-102 Technical Mesh`. Direct visual comparison against the canonical v4 `grf-102.jpg` source proved the garments are not the same. The `GRF-102` AI editorial file was removed from the release and is not loaded by the Mini App. This raw asset remains `Needs Review`.

## Live catalog coverage after this release

Seven of the thirteen live source product records have a verified AI Studio View derived from the newly supplied raw-photo set and a corresponding verified Original Photo derivative. Products without a verified raw association continue to use their canonical source-catalog media; the system does not invent a raw-photo mapping.

## Commerce constraint

This reconciliation changes media presentation only. It does not authorize stock, sizes, settlement prices/currency, shipping, payment credentials, or checkout release. Paid commerce remains fail-closed until those values are supplied through authoritative merchant sources and separately verified.
