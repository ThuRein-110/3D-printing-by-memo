# Production upgrade diagnosis

The baseline is commit 7f28eb873832f19b0bc2a9e0c8fbacda7a451296. Local main matches origin/main. The first eight migrations are treated as already applied and will not be edited.

Photo selection did not switch service, uploads occurred only on quote submission, reconstruction was a later optional action, and the viewer rendered a box whenever positions were missing. The existing worker requested STL rather than GLB. Its GLB parser rejected node transforms; provider geometry therefore needed a bounded scene-aware parser. Provider progress and consumed credits were discarded. Cancellation could race a worker update; paid submit retries were deliberately stopped on ambiguity.

Materials are filtered by enabled visibility and positive grams. Seeds deliberately disable Black, White and Grey with zero stock. No Supabase/Meshy environment variables or app environment files are present in this checkout. No Vercel CLI or GitHub deployment records were found. Live connectivity, deployed stock, deployment URLs and provider billing cannot be verified from the supplied access. No production data was modified.

The UI used Thai/English inline text, with English-only operational controls. No theme preference existed. Private quote JSON exposed internal pricing fields to owners through table SELECT; the upgrade will restrict sensitive columns and project safe customer responses, preserving stored snapshots and accepted amounts.

Implementation: add migration 009 for generation controls, monthly reservations, progress/cost telemetry and scoped media; implement a bounded GLB scene parser and STL export; connect a six-step studio to private uploads and the durable worker; replace UI text with typed four-language catalogs; add cookie-backed locale and prepaint light/dark/system preferences; redesign the shared layout and admin controls; verify locally and push a normal commit to main. External services remain explicitly unverified until credentials and worker hosting are supplied.
