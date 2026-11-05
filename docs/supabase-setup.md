# Supabase setup

One Supabase project serves both apps. No project was created or linked during implementation; credentials were absent.

Install the official Supabase CLI using its supported platform instructions, authenticate, create/select a project, then run from the repository root:

```powershell
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Apply `supabase/seed/defaults.sql` once using the SQL editor for a new production project after reviewing it. For a local Docker-backed Supabase environment use `supabase start` then `supabase db reset`; the TOML seed path applies there. Do not reset a production database. Seeds create only printer, disabled material and settings defaults.

Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and the **server-only** `SUPABASE_SERVICE_ROLE_KEY` in both app environments. The service key bypasses RLS and must never reach client JavaScript. Configure Auth URL allowlists for the actual customer/admin origins. Enable email confirmation, a production SMTP provider, password abuse protection, Auth rate limits and TOTP MFA. Customize the email OTP template to show `{{ .Token }}` for the guest-code flow. This implementation does not rely on a guessed verification redirect endpoint.

Private `customer-private` bucket is created by migration, with a 4 MiB limit. Browser roles have no direct Storage policies. Server routes check identity and ownership before a download or a 60-second signed URL. Do not make the bucket public or introduce broad authenticated Storage policies.

## Initial admin (out of band)

1. Create/invite a real admin identity in Supabase Dashboard → Authentication. Do not seed an admin password or allow public admin registration.
2. Copy the verified identity UUID and run this reviewed statement in the SQL editor:

```sql
insert into public.roles(user_id, role)
values ('REPLACE_WITH_VERIFIED_AUTH_USER_UUID', 'admin');
```

3. Sign in at the independent admin app, enroll TOTP and verify the code. The database requires both the role and AAL2. An AAL1 token cannot read admin-only data even if the account has the role. Never weaken `is_admin()` to work around an enrollment problem.

## Schema and types

Migrations include every requested business table, plus rate limits, privacy requests, settings and provider budget reservations. They set foreign keys, basic constraints, owner indexes, RLS, revoked direct writes and guarded transactional functions. Regenerate a full database TypeScript contract after applying migrations:

```powershell
supabase gen types typescript --linked | Set-Content -Encoding utf8 packages/database/src/generated.ts
```

The committed generated contract covers all 30 tables and runtime RPCs and is bound to both SSR and service clients. It is derived from migrations with `node scripts/generate-db-types.mjs`; use the official linked generator above when you have a real Supabase project. The dynamic configuration editor validates fields with Zod before its narrow type boundary.

Run `pnpm test:rls` locally, then perform two-user and MFA tests against your actual Supabase environment. Embedded PostgreSQL tests do not verify Supabase gateway settings, Storage policies, SMTP delivery or hosted backups.
