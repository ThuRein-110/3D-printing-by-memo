# 3D Printing MFU By Memo

Two independent Next.js applications in one pnpm / Turborepo workspace, backed by one Supabase project. Thai-first customer pages and a separate MFA-protected operations app. **Local implementation; no external deployment or service connection has been verified.** Read [limitations](docs/limitations.md) before launch.

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

Customer: localhost port 3000. Admin: port 3001. Without backend credentials, marketing pages render and writes fail explicitly; no fake records or successful conversions are produced. Confirm email before signing in. Seeded colors have zero stock until actual inventory is recorded.

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

The PostgreSQL integration suite executes the migrations and RLS on embedded PostgreSQL (PGlite) with synthetic Auth/Storage schema stubs. It does not replace testing deployed Supabase Auth, Storage, MFA, SMTP, or concurrent independent database connections. Playwright smoke tests use both production servers without configured external services. Optional real-service scenarios are documented in [operations](docs/operations.md).

## Structure

`users/` and `admin/` are independent Next.js apps. `packages/` contains database/server handlers, pricing, types, UI, validation and bounded geometry/rendering code. `supabase/migrations/` is the database source of truth. `scripts/worker.ts` processes durable jobs outside Vercel request handlers. The source repository is [ThuRein-110/3D-printing-by-memo](https://github.com/ThuRein-110/3D-printing-by-memo); both Vercel projects should import its `main` branch.

## Guides

- [Architecture](docs/architecture.md), [customer workflow](docs/customer-workflow.md), [admin workflow](docs/admin-workflow.md)
- [Pricing](docs/pricing.md), [Supabase setup](docs/supabase-setup.md), [image reconstruction](docs/image-to-3d-provider.md)
- [Security](docs/security.md), [Vercel deployment](docs/vercel-deployment.md), [operations](docs/operations.md), [limitations](docs/limitations.md)

Production URLs: **none recorded**. Credentials, stock counts, bank details, real cost rates, retention policy, provider cost ceiling and deployment ownership must be configured by the operator.
