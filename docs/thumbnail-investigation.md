# Product thumbnail investigation — 6 November 2026

**Original product imagery remains incomplete: 0 of 16 Creality references have an uploaded image or recorded image permission.** The user confirmed that no permissions have been obtained. A rendered fallback is not counted as a fixed product image.

## Exact cause

Every live `catalog_models.image_asset_id` is NULL and every `image_permission` is empty. The seed intentionally inserts references without photographs. The private `catalog-private` bucket exists, has the intended 4 MiB limit, and contains zero objects; `catalog_assets` contains zero rows. The public catalog consequently returns `imageUrl: null`. There is no thumbnail URL to fetch. These 16 failures are not broken external URLs, blocked browser requests, a missing bucket, or a Next.js optimizer allowlist error.

The component uses native lazy `<img>` elements and same-origin API routes, not `next/image`. Both apps' CSP permits same-origin images. Adding Creality CDN domains to `remotePatterns` or widening CSP would not populate absent image records and would not provide permission. No such configuration weakening was made.

## Source and permission investigation

Checked the [Creality Cloud Help Center](https://www.crealitycloud.com/help-center), public model/category resources, and searches of Creality's official sites for model thumbnails, API documentation and embedding. No publicly documented catalog-thumbnail API/embedding grant suitable for MEMO was located. This is not a claim that Creality has no partner/private APIs. A general privacy-policy mention of SDKs/APIs does not grant website image reuse. An approved integration contract/documentation and credentials would be required before implementing one.

[Creality's legal information](https://www.creality.com/legal/legal-information) requires written permission for its own website text/graphics; it is not an image redistribution grant. Creator photographs need their applicable image license/authorization. Catalog model-license names, including CC0 for a model, are not being treated as verified evidence that a particular photograph is covered. No protected endpoints, undocumented authenticated APIs, screenshots of creator models, model-file downloads or unrelated replacement product pictures were used. No creator messages were sent.

## Model audit

All rows have **image source: none attached**, **image permission: not recorded**, **browser product-image result: not rendered / no image URL**. Each needs an actual authorized thumbnail plus evidence. The model-source links below are references, not image sources or permission grants.

| Model | Model source | Image source | Permission | Product-image result |
| --- | --- | --- | --- | --- |
| Super Loud 4 Tone Thunderstorm Gale4 | [Chox](https://www.crealitycloud.com/model-detail/super-loud-4-tone-thunderstorm-gale4) | None | Not recorded | Not uploaded |
| Ghost Stress Relief Toy | [Crisanto Jesus Balladares](https://www.crealitycloud.com/model-detail/ghost-stress-toy) | None | Not recorded | Not uploaded |
| Steampunk Helicopter Kit Card | [PB94](https://www.crealitycloud.com/model-detail/steampunk-helicopter-kit-card) | None | Not recorded | Not uploaded |
| Articulated Skeleton Frog | [3DPrintyi](https://www.crealitycloud.com/model-detail/articulated-skeleton-frog) | None | Not recorded | Not uploaded |
| Squishy Dumpling | [BondFire](https://www.crealitycloud.com/model-detail/soft-dumpling) | None | Not recorded | Not uploaded |
| Dumpling Squishy Twist | [BondFire](https://www.crealitycloud.com/model-detail/dumpling-squishy-twist) | None | Not recorded | Not uploaded |
| Fluffy Tail Cute Flexi Baby Cat - Toy/ Keychain/Magnet | [Fluffy Tails](https://www.crealitycloud.com/model-detail/fluffy-tail-cute-flexi-baby-cat-toy-keychain-magnet) | None | Not recorded | Not uploaded |
| Folding Box Customizable \| Fast | [dannyprchal](https://www.crealitycloud.com/model-detail/folding-box-customizable-fast) | None | Not recorded | Not uploaded |
| Multifunctional Car Headrest Hook & Phone Holder | [SimplySolid3D](https://www.crealitycloud.com/model-detail/multifunctional-car-headrest-hook-phone-holder) | None | Not recorded | Not uploaded |
| Articulated Print-in-Place Lizard | [Kogi3D](https://www.crealitycloud.com/model-detail/articulated-print-in-place-lizard) | None | Not recorded | Not uploaded |
| Uno Card Box | [Shay McGuire](https://www.crealitycloud.com/model-detail/3dprint-uno-box) | None | Not recorded | Not uploaded |
| Toothless phone stand | [Plastic Forge](https://www.crealitycloud.com/model-detail/toothless-phone-stand) | None | Not recorded | Not uploaded |
| dumpling squishy clicker | [mustafayalçınid](https://www.crealitycloud.com/model-detail/dumpling-squishy-clicker) | None | Not recorded | Not uploaded |
| 3D Print infill viwer | [Ganchito](https://www.crealitycloud.com/model-detail/3d-print-infill-viewer) | None | Not recorded | Not uploaded |
| Mini Pumpkin Buddy \| Cute Halloween Decor | [FlowDesigned](https://www.crealitycloud.com/model-detail/mini-pumpkin-buddy-cute-halloween-decor) | None | Not recorded | Not uploaded |
| Hand-Shaped Jewelry Stand/Display with Lotus Bowl | [MTERHAL](https://www.crealitycloud.com/model-detail/hand-shaped-jewelry-stand-display-lotus-bowl) | None | Not recorded | Not uploaded |

The machine-readable snapshot is [catalog-thumbnail-audit.json](catalog-thumbnail-audit.json). Run `node scripts/audit-catalog-images.mjs` after attaching real licensed images. It checks every public model; available images are checked in a browser for decoded, visible image dimensions. Exit **2** means imagery is incomplete, including missing images, rather than treating placeholders as success. `CATALOG_BASE_URL` can select an isolated test deployment. The script is read-only and contains no credentials.

## Implemented changes

- Per-image skeletons, lazy loading, fixed dimensions, distinct missing/permission/error states and recovery when an image URL changes. Card fallbacks now have a direct source link. Carousel dimensions, navigation, themes and all four languages are preserved.
- Cache-versioned same-origin image URLs and explicit public image evidence checks. Missing/corrupt storage objects return 404 instead of advertising undecodable bytes. Storage remains private; authorized published images are served through the checked catalog API. Existing maximum image cache lifetime is 60 seconds.
- A dedicated licensed-thumbnail form on each admin model page uploads a permitted JPG/PNG/WebP, records a public permission citation and private review note, and attaches it through an MFA-authorized, audited, row-locked database function. It changes no print, availability or commercial-license flags. JPEG bytes must exist and decode before publication. Public image attachments require evidence in the database as well as in form validation.
- A private admin image endpoint previews actual stored bytes without public caching. The existing catalog editor also checks stored image bytes before saving a public image attachment. A successful upload alone does not grant print permission or change a draft into a public model.

## Verification boundary

Unit/API/database tests exercise actual JPEG buffers, missing/corrupt objects, public/private caching, publication evidence, storage-object presence, admin MFA and unchanged print permissions. Browser tests assert `complete`, positive `naturalWidth`/`naturalHeight`, image skeleton transitions and failure/replacement recovery. They do not count fallback text as an image. Test fixtures are diagnostic assets, not licensed Creality photos. A private storage delivery probe may be used with a temporary shop-authored diagnostic image and a non-public draft; it must be removed and must never be attached to any of these 16 real references. Original-photo rendering remains unverified until an authorized photo is supplied and attached.
