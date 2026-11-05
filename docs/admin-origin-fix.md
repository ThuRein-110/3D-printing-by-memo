# Admin login origin configuration

## Diagnosis

The reported production URL is `https://3d-printing-by-memo-admin-pearl.vercel.app/login`. A credential-free `POST /api/auth` with that same `Origin` reproduced HTTP 403 with `{"error":"Origin rejected","errorCode":"origin"}` before this patch. No password, session, account mutation or MFA bypass was used in the probe.

`admin/app/api/[...path]/route.ts` calls the shared `handle(req, path, true)` in `packages/database/src/http.ts`. Its mutation guard ran before authentication and trusted **only `APP_ORIGIN`**. `ADMIN_ORIGIN` and `ALLOWED_ORIGINS` were never read. A missing or mismatching `APP_ORIGIN` therefore rejected the production login even when those other variables were configured. The actual hosted variable names, values and scopes could not be inspected: Vercel CLI 65.11.0 reported `Logged out`, and `vercel env ls production --cwd admin` reported `No existing credentials found`. The CLI login attempt was cancelled; no hosted settings were changed. The precise hosted value causing the mismatch remains unverified.

Login uses client fetch to an API route, not a Server Action. The admin proxy excludes `/api`, and neither Next config defines `serverActions.allowedOrigins`. Changing Next's Server Actions settings would not fix this custom guard. [Next.js documents that option separately](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions).

## Strict origin policy

`packages/database/src/csrf.ts` now uses `ADMIN_ORIGIN` on the admin app, falling back to `APP_ORIGIN`. The customer app continues to use `APP_ORIGIN` and ignores `ADMIN_ORIGIN`. Optional `ALLOWED_ORIGINS` is a comma-separated list of exact aliases for the deployment where it is set. Both new names are declared in Turbo's environment configuration so strict-mode tasks receive them and build caches vary with configuration.

Each unsafe request still requires an explicit trusted browser origin **and** a matching request `Host` (or request URL authority when an adapter omits Host). An allowlisted alias cannot send cross-origin mutations to another host. No trust is derived from `X-Forwarded-Host`, Vercel deployment suffixes or arbitrary request headers. Missing/malformed configuration, absent/opaque origins, credentials, paths, wildcards, scheme/port mismatches and unlisted domains fail closed with 403. Configuration accepts surrounding whitespace and a single root slash; the browser Origin must be serialized without a path. Role checks, mandatory MFA and rate limits remain unchanged.

## Required Vercel settings

In the existing **admin** project, Settings → Environment Variables → **Production**:

```text
ADMIN_ORIGIN=https://3d-printing-by-memo-admin-pearl.vercel.app
APP_ORIGIN=https://3d-printing-by-memo-admin-pearl.vercel.app
```

`APP_ORIGIN` also supplies metadata URLs, so keep it aligned. Do not include `/login`, quote characters, `*`, a customer domain or localhost. Remove an obsolete `ADMIN_ORIGIN` rather than expecting a newer `APP_ORIGIN` to override it. Leave `ALLOWED_ORIGINS` unset if there are no additional intended admin aliases; otherwise list only their full exact origins, separated by commas. Do not list customer origins in the admin project. Configure the customer project's `APP_ORIGIN` independently. Preview deployments require explicitly configured preview origins; no automatic wildcard is added.

Redeploy the updated commit after saving the Production variables. [Vercel environment changes apply to a new deployment](https://vercel.com/docs/environment-variables/managing-environment-variables). Confirm the admin project still uses `admin/` as its root. An authenticated operator can list names/scopes with `vercel env ls production` in the correctly linked project; do not print or commit secret values.

Repeat the credential-free probe using body `{}` from the production domain. A 400 validation response (or a backend configuration error) rather than `Origin rejected` demonstrates that CSRF validation passed; it does not prove successful authentication. Then sign in with the actual provisioned admin account and complete MFA. Wrong-password and foreign-origin requests must still fail. Hosted login cannot be declared fully verified without that test.

Regression tests cover the reported production origin, explicit aliases, local ports, malformed configuration, absent/foreign origins, host mismatches, spoofed forwarding headers, and the actual authentication route with synthetic server doubles. Route tests verify admin role rejection and mandatory MFA behavior without contacting Supabase. The Vitest-only `server-only` alias allows these server tests outside Next's module conditions; production builds retain the original boundary marker.

Local verification passed: ESLint, strict TypeScript, all 75 Vitest tests (32 new origin/authentication cases), both independent production builds, and eight desktop/mobile browser tests. Two connected Supabase scenarios were skipped because test credentials/configuration are unavailable.
