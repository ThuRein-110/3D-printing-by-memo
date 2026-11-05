# Production upgrade — 5 November 2026

## What changed

The customer studio is a six-step flow: service → private upload → generation/preview → customization → provisional estimate → tracked quotation request. JPG/JPEG, PNG and WEBP automatically select photo reconstruction unless the customer deliberately chose a manual custom-design inquiry. No geometry is rendered when only a reference photo exists. Language and theme changes update context without navigating or clearing File objects, dimensions or notes.

The shared UI provides typed English, Thai, Myanmar and Simplified Chinese catalogs, localized currency/dates/numbers/statuses, translated authentication and operational controls, self-hosted Myanmar/Chinese font subsets, Thai fonts and a matching light/dark/system design. The theme is applied before page paint, preferences persist in cookies/local storage, and system changes are observed. Model filament colors and the neutral rendering environment are independent of the website theme. Public page metadata reads the locale cookie or validated `?lang=` preference; private pages use no-index metadata.

Admin pages retain server-side role and AAL2 checks. Structured configuration forms replace the broad JSON-only workflow; machine-readable slicer/settings JSON remains editable as technical configuration. Admins can inspect private uploaded/generated meshes, manage stock and dedicated filament images, review costs/profit, issue final quotes, monitor generation and configure limits. Internal costs are projected out of customer API responses; direct access to sensitive quote JSON and pricing tables is revoked by migration 009. Accepted amounts and snapshots are not modified.

## Safe rollout against the existing database

Migrations 001–008 are unchanged. Review `supabase/migrations/202611050009_generation_upgrade.sql` before applying it. No production migration or data modification was performed from this session.

1. Confirm backup/recovery access and inspect `supabase migration list --linked` in your authenticated environment. Confirm that the eight existing version identifiers match the repository.
2. Apply **only pending migration 009** using `supabase db push` after that comparison, or apply that reviewed SQL file through Supabase's SQL editor. Do not reset, reseed or replay migrations 001–008.
3. Deploy both web apps from the same verified commit. Basic uploads have a compatibility path during the additive rollout; generation is unavailable until the new schema/configuration exists. Do not enable generation before the worker is configured.
4. Configure the external provider and supervised worker as below. Test with a small approved budget. Then enable generation as an MFA-verified admin in Settings or AI generation jobs.
5. Verify two-user ownership, admin MFA, live private upload/download, accepted quote immutability, actual GLB generation and a final customer approval in a non-production environment before enabling paid work broadly.

## Actual provider integration

The adapter calls Meshy's documented `POST /openapi/v1/image-to-3d`, `GET /openapi/v1/image-to-3d/{id}` and `DELETE /openapi/v1/image-to-3d/{id}` on `https://api.meshy.ai`. It requests `meshy-7.1`, untextured standard geometry, remeshing, target 30,000 polygons and `target_formats: ["glb"]`. Returned GLB bytes are fetched from an exact host allowlist, with no redirects and a streamed 4 MiB cap, validated, then stored privately. Legacy STL results remain readable. STL export is available from validated geometry; 3MF archives remain disabled because no reviewed archive-processing pipeline is installed.

Official references: [Image-to-3D API](https://docs.meshy.ai/en/api/image-to-3d), [pricing](https://docs.meshy.ai/en/api/pricing), [metadata](https://docs.meshy.ai/en/api/metadata). The documented mesh-only Meshy 7.1 configuration was **20 credits** when checked on 5 November 2026. Credit purchase rates, currency conversion and account terms are operator-specific; no THB exchange rate is claimed as verified. The UI records actual `consumed_credits` and provider `progress` when reported. A missing value remains unknown.

Idempotency uses a persistent owner/file/request key and an atomic SQL submission guard. Attempts and monthly allowance are reserved before the paid POST. Meshy's optional `X-Meshy-Metadata` header carries only a job ID for reconciliation; it is **not** treated as a provider idempotency guarantee. Ambiguous paid submissions are never automatically repeated. Safe retries resume polling/retrieval with an existing provider ID or retry work that never submitted. Poll retries are bounded with backoff. Cancellation does not claim a refund or a stopped remote job when Meshy returns 409.

## Environment and hosting setup

Web projects, configured separately:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — server only
- `APP_ORIGIN` — the exact customer/admin browser origin for that deployment
- `PREVIEW_PROVIDER` — keep disabled initially, then set to `meshy` after rollout

The server also accepts the existing public URL/anon aliases `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. No service or provider secret may use a `NEXT_PUBLIC_` name.

Worker environment only:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MESHY_API_KEY`
- `PREVIEW_PROVIDER=meshy`
- `PROVIDER_ASSET_HOSTS=assets.meshy.ai` (add only documented, trusted exact provider asset hosts)

Obtain a Meshy API key and prepaid credits from the official Meshy account dashboard. Save it in the worker host's secret manager. Never paste it into chat, source control or web project public variables.

Run the worker on a persistent Node 22.12+ host/VM/process service with a restart policy and HTTPS egress. Use the same repository commit and lockfile as the apps:

```powershell
pnpm install --frozen-lockfile
node --env-file=.env.worker --import tsx scripts/worker.ts
```

For a managed host that injects environment variables directly, run `pnpm worker` without an environment file. Keep `.env.worker` ignored. The process exits with a setup error if migration 009 is absent. Vercel request handlers only enqueue jobs; they do not host this daemon.

Sign in to admin with MFA. In Settings → Provider usage & limits, enter the reviewed THB cost per credit, monthly allowance, daily customer limit and concurrency (1–4). Confirm the configuration, enable generation and set the web `PREVIEW_PROVIDER` value. The old `PREVIEW_JOB_BUDGET_THB` setting is obsolete. Monthly reservations are serialized in SQL and never reset by worker retries. Conservative reservations are not automatically refunded. Reconcile provider credit usage and any uncertain job with Meshy's dashboard before manually changing records.

## Connectivity and inventory diagnosis

Run a read-only check with your real server environment:

```powershell
node --env-file=users/.env.local scripts/check-backend.mjs
```

It reports connection/stock/configuration counts and missing **variable names**, not credential values. In this checkout, `SUPABASE_URL` and `SUPABASE_ANON_KEY` were absent, so no live backend check was possible. No provider call was made and no credits were spent.

Black, White and Grey are existing non-sensitive seed defaults, initially disabled with zero stock. Do not run seeds again against the deployed database. In admin, record physically verified stock with an inventory transaction and enable only actually available colors. The public catalog excludes disabled/zero-stock rows. Filament photos require a dedicated admin upload and publication checkbox; the public endpoint sanitizes only these purpose-marked images and cannot expose arbitrary customer images. Photos remain illustrative color references, not calibrated measurements.

## Deployment status and remaining gates

The existing app URLs and deployment credentials were not available. `npx vercel@latest whoami` reported **Logged out** (CLI 65.11.0); deployment/log inspection requires `vercel login` or a scoped `VERCEL_TOKEN` supplied through the environment. GitHub's deployment resource was empty, but baseline commit statuses included one successful historical `3d-printing-by-memo-admin` deployment and several failed Vercel project attempts. These are historical dashboard statuses, not proof that either upgraded app is deployed or connected to the correct backend. This upgrade does not claim a verified live redeployment. Confirm which two existing projects are intended; do not delete or reconfigure unrelated project attempts. Keep their roots `users/` and `admin/`, enable sibling workspace source inclusion and set environments independently.

Required live gates remain: migration 009 application, actual Supabase Auth/Storage/MFA/SMTP checks, actual Meshy task and billing reconciliation, worker hosting/restart verification and hosted Vercel acceptance tests. Browser tests using synthetic GLB/HTTP fixtures verify UI contracts; they are not a substitute for these gates. Automatic slicing and secure 3MF handling are still unavailable; final prices require real slicer/admin review. Existing retention/deletion fulfillment and tax-document legal review remain operational responsibilities.
