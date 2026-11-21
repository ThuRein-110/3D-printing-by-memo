# MEMO customer brochure

The public customer homepage now focuses on four things: services/starting prices, how quoting and ordering work, a credited gallery, and contact. The model-search/chip section and its coming-soon cat state are removed from the homepage. Public navigation links only to these four sections. `/models` redirects to `/gallery` so the previous catalogue index is no longer a public browsing entry point.

The customer site defaults to a graphite theme with steel-blue accents. The stone light theme (#fafaf9) and system theme remain available alongside English, Thai, Myanmar and Simplified Chinese. The supplied logo appears in the header and footer, and the gallery retains the licensed photographs. Cabinet Grotesk and Satoshi are served by Fontshare, with local typefaces as fallbacks. Entrance, floating, scroll and hover effects respect the visitor’s reduced-motion preference.

The homepage hero shows the figurine on the right at desktop widths and below the text on narrow screens. The geometry was reconstructed locally with [TripoSR](https://github.com/VAST-AI-Research/TripoSR). Both views in the supplied `image.png` were projected onto the mesh and baked into a 2048 × 2048 texture. The mesh approximates the figurine’s depth and the surfaces between those views. The viewer supports pointer, touch and keyboard rotation. A 1080 × 1080 still from the same reference appears while the model loads and on devices without WebGL.

## Brand asset and contact source

- Canonical logo: the user's uploaded root `logo.jpg`, 200 × 200 JPEG, SHA-256 `8961a2417b3e4978883ecf566c96ac98efd05f4735ea1e529f7a9baeecb2b9a0`.
- Both `users/public/brand/memo-logo.jpg` and `admin/public/brand/memo-logo.jpg` are byte-for-byte copies of that upload. It is not regenerated, recolored or replaced with a stock image. The business supplied it for this website; it is not described as a Creative Commons image.
- Facebook: [3D Printing MFU By Memo](https://www.facebook.com/profile.php?id=61596250074649).
- Telephone: `094 380 4586`, normalized link `tel:+66943804586`.
- Location: Chiang Rai, Thailand. The contact information comes from the user's supplied business-page screenshot. No private administrator email or invented LINE/WhatsApp handle is published.

## Prices and gallery

The two service cards use the existing server pricing-minimum endpoint: Basic 3D Printing from ฿100, Custom Design + Printing from ฿1,500. Copy explains that dimensions, quantity, material, print time and finishing affect the quotation; feasibility, final price, payment and delivery are confirmed before printing. No unreviewed per-gram rate, deposit percentage or delivery promise is invented.

The Everyday 3D prints gallery uses six licensed photographs of working objects for organization, repairs, electronics and accessories. Each card describes a use and links to the original photo, creator credit and license. The photos are references, not MEMO products or completed orders. Selecting a card opens a keyboard-accessible preview. The gallery media and credits are recorded in `packages/ui/src/everyday-prints.ts`. The [original inspiration catalog](inspiration-gallery.md) continues to support existing quotation references.

Customer-site buttons play a short synthesized click on interaction. The **Button sounds** toggle in the footer mutes it and saves the preference in the browser.

Customer-facing calls to action lead to the contact section, the Facebook business page or the supplied telephone number. Existing account/order/configurator URLs, admin operations, authorization, database records and pricing APIs are preserved for existing workflows; they are not advertised in the new public brochure navigation. No database migration or new environment variable is needed.

Verification covers exact logo copies, browser image decoding, contact URLs, the catalogue redirect, four languages, theme persistence, reduced motion, responsive layouts and keyboard image dialogs.

The interactive hero passed 150 unit/API/database tests, 48 browser tests, TypeScript and both production builds. Two connected-order tests require a configured non-production Supabase project and were skipped.
