# Two independent Vercel projects

No Vercel CLI or authenticated Vercel configuration was available during implementation. No projects or URLs have been created. The local Next production builds are verified separately; hosted Vercel builds and environment setup remain unverified.

Create exactly these projects, each importing the **same repository**:

| Project | Root Directory | Framework |
| --- | --- | --- |
| 3d-printing-mfu-users | users | Next.js |
| 3d-printing-mfu-admin | admin | Next.js |

In each project's Root Directory settings, enable **Include source files outside of the Root Directory in the Build Step**. This is required for sibling workspace packages; setting a root alone is insufficient. [Vercel's monorepo guidance](https://vercel.com/docs/monorepos/monorepo-faq) documents this setting and independent projects.

Each app has a vercel.json. From the app root, installation runs `cd .. && pnpm install --frozen-lockfile`, and build runs `cd .. && pnpm exec turbo build --filter=@mfu/users` (or admin). Output remains `.next` inside that project's root. Both apps transpile their workspace source packages and trace files from the repository root. Root pnpm lockfile and workspace manifest must be included in the uploaded source. Use Node 22 and pnpm 10.34.9.

## Authenticated setup

1. Import `https://github.com/ThuRein-110/3D-printing-by-memo` twice through Vercel's dashboard, using production branch `main` and the names/root directories above. Confirm the expected source commit is present before importing. GitHub publication does not itself create or authenticate either Vercel project.
2. Add SUPABASE_URL, SUPABASE_ANON_KEY and server-only SUPABASE_SERVICE_ROLE_KEY separately in each project's Development/Preview/Production environment. APP_ORIGIN must match that app's exact browser origin for each deployment. Use a stable preview alias or update the value for preview testing. Do not copy a localhost origin into production.
3. Set customer PREVIEW_PROVIDER=disabled initially. Only enable Meshy enqueueing once the separate worker, budget and consent flow are verified. The Meshy API key belongs on the worker, not either web project.
4. Configure Supabase Auth origin allowlists and production SMTP. Provision and MFA-test the admin.
5. Install the current official CLI and authenticate:

```powershell
npm install -g vercel
vercel login
vercel whoami
```

6. Always operate from the monorepo root. Link each already-created project in turn, pulling its own environment before building:

```powershell
vercel link --project 3d-printing-mfu-users
vercel pull --environment=production
vercel build --prod
vercel deploy --prebuilt --prod

vercel link --project 3d-printing-mfu-admin
vercel pull --environment=production
vercel build --prod
vercel deploy --prebuilt --prod
```

Relinking root checkout state is intentional; verify the selected project before each build/deploy. Never reuse a prebuilt artifact for the other app. Alternatively use separate full-repository checkouts. Vercel's [monorepo CLI guidance](https://vercel.com/docs/monorepos/monorepo-faq) also supports VERCEL_ORG_ID / VERCEL_PROJECT_ID without linking. Keep all IDs as operator-provided configuration and tokens in a secret manager.

7. Verify the actual returned sites: public home, mobile configurator, admin unauthenticated redirect, MFA authorization, two-user private downloads, uploads, immutable quotes and manual verification. Record actual URLs and deployment IDs below only after success.

## Deployment record

Users URL: not deployed.

Admin URL: not deployed.

Supabase project: not configured.

Worker host: not configured.

The local filtered Next builds confirm package resolution. They do **not** establish a verified Vercel deployment; `vercel build --prod` must still run in an authenticated linked checkout.
