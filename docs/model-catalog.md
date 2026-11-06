# Model catalog and order workflow — 6 November 2026

The homepage now shows a searchable, database-backed catalog. Customer routes are `/models`, `/models/[id]` and `/configure?model=<id>`. Admin routes are `/models` and `/models/[id]` in the separate admin app. Existing uploads, photo reconstruction, quotations, inventory controls, themes, branding and four languages remain available.

The subsequent [reference showcase upgrade](creality-showcase.md) adds a pool of 16 manually curated source references, eight-at-a-time random discovery and inline “See more.” Reference publication is separate from commercial approval and never enables ordering or asset redistribution.

## Publishing real models

Sign in to admin and complete MFA. Add a model, name its creator, choose a category/tags and record the exact license plus private evidence notes. Creality references accept only HTTPS model-detail URLs on the official desktop/mobile hosts. The application never fetches that URL, scrapes the library, imports provider images, embeds an undocumented viewer or assumes a public product API exists. `catalog-provider.ts` defines an adapter contract for a future authorized integration; the provider registry is intentionally empty.

Upload thumbnails and geometry only when you have permission. Images are decoded, stripped of metadata and re-encoded as JPEG. Files stay in the private `catalog-private` bucket. Models can be STL, triangulated OBJ, embedded untextured GLB, or the supported mesh-only 3MF subset. Unsupported formats/features fail explicitly. No third-party models or images were copied into the production catalog, and no fabricated approved listings were seeded.

Publication requires all of: commercial-use permission, license review approval and approved printability. Evidence is appended to `model_license_reviews` with the MFA-verified reviewer identity. Unapproved/noncommercial inspiration remains private. Availability is separate from visibility, allowing an approved listing to show as unavailable. Starting price and lead time are optional reviewed display values, never substitutes for an actual quotation.

Public geometry preview requires **separate browser-preview permission**. A commercial-printing license alone does not enable it. Without permission or a model file, the page shows only authorized thumbnails and source attribution. Preview returns bounded float geometry (at most 3.6 MB), not a long-lived signed download or original model archive. Catalog viewers omit STL export. Public previews/images may remain cached for at most 60 seconds after permission or publication changes; private assets and order images use no-store. Browser-visible geometry can inherently be extracted, so do not enable preview when the license prohibits providing it.

## Creality Cloud findings

Official material checked during this upgrade:

- [Commercial Creator Program](https://www.crealitycloud.com/pl/commercial-creator-program): its Commercial Model program distinguishes permission to sell physical prints from prohibited digital-file redistribution/sharing. Creator works must be original or authorized.
- [Commercial Premium announcement](https://www.crealitycloud.com/pt/post-detail/6a91467763cd80bf33822c25): eligibility depends on the applicable model license and active commercial plan. An ordinary downloadable/free model is not automatically commercially licensed.
- [Reference model library](https://www.crealitycloud.com/model-category/3d-print-all): used for the requested catalog interaction reference, not as a source of mirrored content.

No publicly documented catalog API or generally authorized model embedding contract was verified in the official materials found. That is an investigation limit, not proof that no partner API exists. Obtain written API, thumbnail and preview authorization directly from Creality before installing an adapter. Review actual per-model terms and entitlement expiry before fulfilling orders; this implementation cannot verify a third-party subscription or license automatically.

## Customer request and admin review

Customers select millimetres/centimetres, proportions, quantity, detail/finishing, an actually stocked PETG black/white/grey option, delivery preference and contact email. Dimensions above the configured 260 mm printer envelope are rejected server-side. A real mesh is parsed and resized to estimate material/time; reference-only models show an inquiry price without inventing geometry, weight or time. Fine detail and finishing add provisional workload. All estimates require slicer review.

Authentication uses the existing password or email-verified inquiry flow. Inline sign-in preserves selections. The server reloads the approved catalog record, stock, applicable pricing version and promotion; client prices are ignored. `commit_quote` atomically creates the quote, promotion reservation, frozen pricing snapshot and `model_order_snapshots` record. Model/license/source/creator/image/file references, size/unit/color, quantity, contact, notes and the actual committed estimate/rule ID are retained. Request keys and unique quote/order constraints make retries idempotent. Success navigation occurs only after Supabase returns the persisted order ID. Database order events and notifications deliver the request to admin.

Admin order/quote details show frozen provenance and private financial details. Request UUID/timestamp, customer profile and account/contact emails, saved estimated price, chosen dimensions in the selected unit, stock at request, and current stock are visible where applicable. Material, cash and labor costs, target margin and achieved margin are separate; achieved profit excludes collected tax and shipping. Inquiry-only weight and print time remain unknown until slicer review, instead of showing invented zero measurements. Customer account lookups and current inventory details run only after admin/MFA authorization and are never included in customer financial responses.

Staff review the original source and actual private geometry, then enter measured slicer usage and reviewed operating rates for the final quote. Final production-cost reviews are separate from the immutable preliminary snapshot. A licensed catalog mesh can support customer acceptance without creating a downloadable customer copy: the order records `final_catalog_asset_id`. Customer-file workflows still require an actual customer-owned final mesh. No role, MFA, CSRF or final-design acceptance guard was disabled.

## Pricing versions

Default basic/reprint minimum is now **THB 100**; custom/photo design minimum remains **THB 1,500**. Actual cost can produce a higher price. Homepage/services/catalog/configurator prices use published minimums. Admin can publish new versions with either minimum and actual operating costs. The migration appends versions for the latest applicable THB 300 rules; it does not overwrite old rates or accepted quotes. A project without active global rates receives a versioned THB 100 baseline, marked unreviewed because operating costs are illustrative until staff review them.

Gross-margin pricing includes material, support, machine, electricity, labor, setup, overhead and waste. Discounts preserve the service minimum and production-cost floor. An admin may explicitly authorize an active promotion below production cost only with a private authorization reason; the service minimum still holds. Final pricing uses frozen service minimums plus reviewed production cost, tax and shipping. Legacy quotes without a recorded minimum retain the prior THB 300/1,500 fallback.

## Supported 3MF subset

The parser follows the [3MF core specification](https://github.com/3MFConsortium/spec_core) for ordinary mesh objects, build transforms and supported units. It uses [fflate](https://github.com/101arrowz/fflate) streaming extraction and [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser) with entities disabled. Only `3D/3dmodel.model` is parsed. Limits include 4 MiB upload/core XML, 64 ZIP entries, XML depth 32, 64 objects, 128 build items, 300,000 vertices and 100,000 output triangles. Duplicate/traversal entries, XML declarations with DTD/entities, external geometry, components, textures and advanced extensions are rejected. Unused ZIP parts are never inflated or extracted to disk. Convert unsupported slicer projects to STL/GLB rather than claiming full 3MF compatibility.

## Rollout and verification

The live project originally had migrations 001–008, zero pricing versions, zero orders and zero accepted quotations. Pending migration 009 and additive migration 010 were reviewed against embedded PostgreSQL and successfully applied on 6 November 2026. Post-rollout read-only checks confirmed one THB 100 pricing version, a private catalog bucket, RLS on all five new tables, zero catalog listings, zero orders and zero accepted quotations. No reset, seed replay, inventory fabrication or accepted-quote rewrite was performed.

The customer Vercel project was missing its server write credential and exact application origin. Production now has a server-only `SUPABASE_SERVICE_ROLE_KEY` and `APP_ORIGIN=https://3d-printing-by-memo-mfu-two.vercel.app`; the existing public Supabase aliases are supported. Neither credential values nor auth tokens are committed. Admin remains rooted at `admin/`, customer at `users/`, sharing the verified Supabase project. Deployment results and applied migration status are recorded in the final handoff.

All 103 Vitest tests, 14 desktop/mobile browser tests, ESLint, strict TypeScript, frozen-lockfile installation, the production dependency audit and both independent production builds passed. Tests cover URL rejection, commercial approval, real 3MF/GLB geometry, archive/XML limits, pricing floors/cost exceptions, real PostgreSQL search/RLS/atomic provenance/idempotency, private licensed final-design acceptance and historical immutability. Browser scenarios use clearly synthetic HTTP fixtures, exercise desktop/mobile catalog search, filtering, real geometry rendering, retained settings/authentication, order confirmation, language/theme changes and noninteractive references. They are not a claim of a paid/live customer transaction or external license verification. Two connected scenarios were skipped; they still need non-production test identities. No synthetic customer order was inserted into production.

Before taking real catalog orders: complete admin MFA, record real stock, publish reviewed operating rates, enter actual licensed models and images, approve printability, and confirm SMTP/delivery operations. Geometry-based weight/time remains provisional until measured in a slicer.
