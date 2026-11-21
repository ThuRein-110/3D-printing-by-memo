# MEMO customer brochure

The public customer homepage now focuses on four things: services/starting prices, how quoting and ordering work, a credited gallery, and contact. The model-search/chip section and its coming-soon cat state are removed from the homepage. Public navigation links only to these four sections. `/models` redirects to `/gallery` so the previous catalogue index is no longer a public browsing entry point.

The customer site defaults to a stone canvas (#fafaf9) with emerald (#059669) and orange (#ea580c) accents. Dark and system themes remain available alongside English, Thai, Myanmar and Simplified Chinese. The supplied logo appears in the header and footer. The compact hero uses an AI-generated illustration of a filament-printed knot, and the gallery retains the licensed photographs. Cabinet Grotesk and Satoshi are served by Fontshare, with local typefaces as fallbacks. Entrance, floating, scroll and hover effects respect the visitor’s reduced-motion preference.

## Brand asset and contact source

- Canonical logo: the user's uploaded root `logo.jpg`, 200 × 200 JPEG, SHA-256 `8961a2417b3e4978883ecf566c96ac98efd05f4735ea1e529f7a9baeecb2b9a0`.
- Both `users/public/brand/memo-logo.jpg` and `admin/public/brand/memo-logo.jpg` are byte-for-byte copies of that upload. It is not regenerated, recolored or replaced with a stock image. The business supplied it for this website; it is not described as a Creative Commons image.
- Facebook: [3D Printing MFU By Memo](https://www.facebook.com/profile.php?id=61596250074649).
- Telephone: `094 380 4586`, normalized link `tel:+66943804586`.
- Location: Chiang Rai, Thailand. The contact information comes from the user's supplied business-page screenshot. No private administrator email or invented LINE/WhatsApp handle is published.

## Prices and gallery

The two service cards use the existing server pricing-minimum endpoint: Basic 3D Printing from ฿100, Custom Design + Printing from ฿1,500. Copy explains that dimensions, quantity, material, print time and finishing affect the quotation; feasibility, final price, payment and delivery are confirmed before printing. No unreviewed per-gram rate, deposit percentage or delivery promise is invented.

The gallery uses the six existing licensed reference photographs, with creator, original source, license links and modification notices beside each image. It clearly says they are examples, not MEMO products or completed orders. Selecting an image opens a keyboard-accessible local preview dialog; it does not create an order or require login. See [inspiration-gallery.md](inspiration-gallery.md) for the image-license evidence.

Customer-facing calls to action lead to the contact section, the Facebook business page or the supplied telephone number. Existing account/order/configurator URLs, admin operations, authorization, database records and pricing APIs are preserved for existing workflows; they are not advertised in the new public brochure navigation. No database migration or new environment variable is needed.

Verification covers exact logo copies, browser image decoding, contact URLs, the catalogue redirect, four languages, theme persistence, reduced motion, responsive layouts and keyboard image dialogs.

The dark-theme refresh passed 150 unit/API/database tests, 44 browser tests, TypeScript and both production builds. Two connected-order tests require a configured non-production Supabase project and were skipped. All ten focused brochure tests passed after the final mobile header adjustment.
