# 3D Printing MFU By Memo

Two independent Next.js applications in one pnpm / Turborepo workspace, backed by one Supabase project. A six-step customer studio and a separate MFA-protected operations app share English, Thai, Myanmar and Simplified Chinese translations plus light/dark/system themes. **External deployment and service connections have not been verified from this checkout.** Start with the [production upgrade and rollout guide](docs/production-upgrade.md).

## Run locally

Requires Node 22.12+ and pnpm 10.34.9.

```powershell
npm install -g pnpm@10.34.9
pnpm install --frozen-lockfile
Copy-Item .env.example users/.env.local
Copy-Item .env.example admin/.env.local
# Edit each environment file. Use APP_ORIGIN=http://localhost:3001 for admin.
pnpm dev
```

Customer: localhost port 3000. Admin: port 3001. Without backend credentials, marketing pages render and writes fail explicitly; no fake records or successful conversions are produced. Confirm email before signing in. Existing deployed databases need only reviewed pending migration 009; never reset or reseed them. Seed defaults have zero stock until real inventory is recorded. Provider generation remains disabled until monthly controls, credentials and the separate worker are configured.

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm test:rls
pnpm security
pnpm exec turbo build --filter=@mfu/users
pnpm exec turbo build --filter=@mfu/admin
pnpm exec playwright install chromium
pnpm test:e2e
```

The PostgreSQL integration suite executes all migrations and RLS on embedded PostgreSQL (PGlite) with synthetic Auth/Storage schema stubs. It does not replace testing deployed Supabase Auth, Storage, MFA, SMTP, or independent concurrent connections. Playwright uses both production servers: preference/access tests run without credentials; the generation/quotation browser flow uses explicit synthetic HTTP/GLB fixtures. Optional real-service scenarios are documented in [operations](docs/operations.md).

## Structure

`users/` and `admin/` are independent Next.js apps. `packages/` contains database/server handlers, pricing, types, UI, validation and bounded geometry/rendering code. `supabase/migrations/` is the database source of truth. `scripts/worker.ts` processes durable jobs outside Vercel request handlers. The source repository is [ThuRein-110/3D-printing-by-memo](https://github.com/ThuRein-110/3D-printing-by-memo); both Vercel projects should import its `main` branch.

## Guides

- [Architecture](docs/architecture.md), [customer workflow](docs/customer-workflow.md), [admin workflow](docs/admin-workflow.md)
- [Pricing](docs/pricing.md), [Supabase setup](docs/supabase-setup.md), [image reconstruction](docs/image-to-3d-provider.md)
- [Security](docs/security.md), [Vercel deployment](docs/vercel-deployment.md), [operations](docs/operations.md), [limitations](docs/limitations.md)

Existing production URLs: **not supplied or verified in this checkout**. See [production upgrade](docs/production-upgrade.md) for exact environment names, Meshy/worker setup, read-only connectivity diagnostics, monthly cost controls and rollout gates. No live conversion or Vercel redeployment is claimed.
