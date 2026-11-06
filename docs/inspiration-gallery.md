# Licensed 3D Printing Inspiration

Reviewed 6 November 2026. These six photographs are inspiration examples, not MEMO products, fulfilled customer orders, or pictures of the 16 Creality listings. Requests ask for an original custom design, subject to rights and feasibility review. No model files were downloaded; photo licensing does not establish permission to reproduce a pictured design.

| Local asset | Original title / source evidence | Creator | Image license |
| --- | --- | --- | --- |
| cat.webp | [3D PRINTED CAT.jpg](https://commons.wikimedia.org/wiki/File:3D_PRINTED_CAT.jpg) | Sumanbargavr | CC BY-SA 4.0 |
| keychain.webp | [Marvin Keychain.jpeg](https://commons.wikimedia.org/wiki/File:Marvin_Keychain.jpeg) | Koenbodewes | CC BY-SA 4.0 |
| vase.webp | [3D Printed Vase.jpg](https://commons.wikimedia.org/wiki/File:3D_Printed_Vase.jpg) | D Eaketts | CC BY-SA 4.0 |
| flowers.webp | [Flores 3D 02.jpg](https://commons.wikimedia.org/wiki/File:Flores_3D_02.jpg) | Mortymore | CC BY 2.0 |
| gears.webp | [Helical planetary gear (40069995811).jpg](https://commons.wikimedia.org/wiki/File:Helical_planetary_gear_%2840069995811%29.jpg) | Robbie Sproule | CC BY 2.0 |
| mechanism.webp | [Triple Gear.jpg](https://commons.wikimedia.org/wiki/File:Triple_Gear.jpg) | Saul Schleimer and Henry Segerman | CC BY-SA 3.0 |

Licenses: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/), [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/). Each permits commercial redistribution under its conditions. Credits beside every photo retain the original title, creator, source and license links, and state changes. The resized/converted images and any displayed crops retain the respective linked license, including ShareAlike where applicable. These image licenses do not change the license of MEMO application code. No endorsement is implied.

## Reproducibility and attribution

- Raw public Commons `imageinfo` license metadata is archived under `docs/image-licenses/`. It records the actual API response, not an invented permission statement. The reviewed file pages and license deeds above were also checked.
- `packages/types/src/inspiration.ts` records source/download URLs, creator, license/URL, attribution, modification notice, review date, source SHA-1, optimized SHA-256 and dimensions.
- `users/public/inspiration/` and `admin/public/inspiration/` contain identical WebP images plus a public `licenses.json`. Only reviewed photos are distributed. Original source bytes were checksum-verified, resized without enlargement to a maximum 1200px, converted to WebP and stripped of metadata. No EXIF location data is retained in published assets.
- The six WebPs total 340,052 bytes per application. Next.js `Image` provides responsive optimization and lazy loading from same-origin assets. No remote image-domain configuration, protected endpoint access, hotlink or new dependency is required.
- `node scripts/import-inspiration-images.mjs` imports only the six explicitly reviewed files through the official public Commons API. It stops if a source checksum, license or restriction field changes; review before changing its allowlist. Do not run as part of builds or fetch images at runtime.

## Requests and deployment

The homepage, catalog and gallery show the separate inspiration section. Clicking an image opens `/inspiration/<id>` with attribution, the example notice and a custom-design quotation request. Starting prices remain Basic Printing ฿100 and Custom Design + Printing ฿1,500; this change does not alter pricing rules.

Apply additive migration `202611060017_inspiration.sql` to the linked Supabase project before deploying the code. It unpublishes unlicensed Creality references while retaining their records/history, prevents publicly listing Creality entries without evidenced images, seeds authoritative inspiration metadata, and adds immutable private inspiration inquiries. `supabase/seed/creality-showcase.sql` now seeds private references.

`POST /api/inspiration-inquiries` requires the existing customer session and strict CSRF validation. The authenticated database function validates active IDs, dimensions, colors, quantity and customer details; limits submissions to 20 per customer/day; supports idempotency; and snapshots reviewed image metadata on the server. Browser-supplied image URLs, licenses, prices or owner IDs are discarded. A photo license never sets printing permission. No quotation price or order is created automatically.

The MFA-protected admin dashboard and Models page show the image, source link, creator/license, customer/account email, dimensions, color, quantity and notes. Reads are audited. RLS allows customers to read only their own requests and administrators to read all only with the existing admin role and verified MFA; customers cannot update, delete or directly insert requests.

Both Vercel projects use their existing `users/` and `admin/` root directories. No new environment variables, OAuth providers or storage policies are needed. Existing unrelated orders, users, quotations and pricing remain intact.

Production verification on 6 November 2026 decoded all six licensed images through Next.js image optimization and checked mobile Myanmar layout without overflow. A temporary customer submitted the actual browser form; its authoritative image/license snapshot and selections reached the MFA-protected admin dashboard with a rendered preview and audited read. Duplicate submission returned the same ID, anonymous access and admin access before MFA were denied, no order or priced quote was created, and the temporary account/request/role were removed. The public Creality catalog was empty. Local checks passed 145 tests, lint, TypeScript, dependency audit and both builds; the browser suite passed 40 tests with two existing non-production connected-order tests skipped.
