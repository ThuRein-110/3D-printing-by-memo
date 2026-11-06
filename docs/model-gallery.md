# MEMO Model Gallery

The homepage catalog and `/models` use the existing project and quotation pipeline, with a responsive marketplace grid. The header, search, category chips, result states, buttons and favorites support English, Thai, Myanmar and Simplified Chinese. Light/dark/system appearance uses existing MEMO theme tokens and the existing grey cat illustration.

## Discovery and product permissions

Only `visible AND commercial_allowed AND license_approved AND printability='approved'` models qualify for browsing, categories, detail/image/preview routes or favorites. Migration `202611060018_model_gallery.sql` removes the old reference-only public RLS policy and replaces discovery/category functions with this eligibility rule. Existing source records, quotations, orders and licensing reviews remain intact. It does not publish anything.

The default category chips are Discover/All, Animals, Gifts, Home Decor, Accessories and Engineering. Additional distinct category names from approved models appear automatically. Administrators manage categories through each model's existing Category field. Custom names are stored/displayed as authored; built-in category labels are translated.

Search is debounced by 250ms and matches model names, descriptions and tags. Full-text matching is supplemented by literal case-insensitive substring matching, including languages without spaces. Price filters retain server-side starting-price filtering. Pages keep their existing stable random seed and load eight more records at a time, without duplicates.

Desktop uses four columns, medium desktop/tablet three, smaller tablet/mobile two, and screens below 350px one. Each card has a square image, two-line title, one-line creator/license credit, starting price or quotation-only label, a real preview link and customization action. Unavailable models cannot offer an active order action. Missing image sources remain honest fallbacks, never stock photos attached to a specific model. Skeletons, lazy image decoding, reduced-motion behavior and keyboard focus styles are included.

With no approved products, a branded cat empty state offers `/configure?service=ready` for the customer's file and `/configure?service=custom` for original design work. Search/category/price misses use a separate no-results state with reset. The six already-authorized inspiration photos remain a separately labeled gallery; they are not catalog products and grant no model reproduction rights.

## Favorites and order handoff

Customer hearts use `GET/POST /api/catalog-favorites` and the additive RLS-protected `catalog_favorites` table. Anonymous users sign in through the existing MEMO flow. The owner is derived from the authenticated session, never a browser owner field. Inserts require a public approved product; reads/deletes are scoped to the owner, with reads also excluding withdrawn products. Repeated saves are idempotent. Mutations retain strict CSRF validation and an API rate limit of 500 per account/day; no customer can update favorites or see another account's collection.

Product detail links target the existing legitimate preview and customization sections. Existing private-file access, PETG stock checks, dimensions, quantity, server estimates, quote commitment and order creation are retained. `commit_quote` freezes the full canonical model row (including ID, source, creator and authorized image reference) with the selection, material, file and estimated price in `model_order_snapshots`. The existing admin order dashboard displays that snapshot and customer information and retains MFA, slicer/cost review and verified final-quotation checks. No browser-submitted price or license can authorize production.

Starting prices are unchanged: Basic Printing ฿100; Custom Design + Printing ฿1,500. No new environment variables, external image hosts, carousel packages or other dependencies are required. Apply migration 018 to the existing linked Supabase project before deployment; keep the independent Vercel roots `users/` and `admin/`.

## Verification and content limitation

Database tests cover approved-only public reads, references remaining private, category/name/description/tag search, seeded pagination and favorites ownership/publication restrictions. API tests cover authenticated identity, idempotent saves, CSRF, invalid IDs and rate limiting. Browser tests cover responsive columns at 1440/960/768/390/320px, square images, long text, skeletons, decoding/error fallbacks, filters, clear/reset, custom category chips, themes/languages, keyboard actions, favorites through login/reload, and model-page estimate/order submission with retained selections. Existing final quotation and immutable order snapshot tests remain active.

There are currently **zero approved production products**. The 16 Creality references still lack authorized model photos and commercial printing permission and remain unpublished. No genuine model files for those references have been imported. Populated product and order browser tests use isolated, explicitly synthetic fixtures; they do not establish rights or publish production products. The production empty state and separate licensed inspiration gallery can be verified with real data. A real product order cannot be exercised until an administrator supplies a legitimate model file, image evidence and commercial approval.

Local verification: 149 tests passed, 44 browser tests passed, with two existing non-production connected-order tests skipped. Lint, TypeScript, the production dependency audit and both application builds passed.

Production verification confirmed the real empty catalog, both creation links, inline search layout, six decoded licensed inspiration photos, mobile rendering in all four languages, system appearance, and unchanged ฿100/฿1,500 prices. An authenticated temporary customer received a private, non-cacheable favorites response; saving an unpublished reference was denied with no stored row, and a foreign-origin mutation was rejected. All 16 unlicensed references were preserved with no images/meshes imported. The temporary customer was removed. No real product order was created; populated product/order behavior remains verified through isolated browser and database fixtures until approved content exists.
