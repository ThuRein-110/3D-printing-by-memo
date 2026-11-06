# Customer authentication and MFU student offers

Both apps use the same Supabase project. Migrations `202611060012` and `202611060013` are additive. Never reset or replace production Auth users, quotes or orders.

Customer routes: `/login`, `/register`, `/forgot-password`, `/account/security`. MFA-authorized admins manage accounts, verification expiry/revocation/restoration, security summaries and discount rules in **Customers** and **Promotions**. The initial 10% offer is deliberately inactive until an admin reviews and activates it. Basic printing starts at THB100 and custom design plus printing at THB1,500; discounts cannot reduce service floors. Existing values/history remain intact.

## Providers and production setup

Email/password is enabled in production, with email confirmation required. These are MEMO passwords. Registration, resend and password recovery use Supabase email and PKCE callbacks. Links must be completed in the initiating browser within 15 minutes. Recovery on another browser should be restarted there. Google and authorized institutional accounts recover their upstream passwords with their provider, never through MEMO. Password changes for MEMO email identities revoke other sessions.

Google login code is implemented; the button is disabled until Supabase `/auth/v1/settings` reports Google enabled. Configure a Google OAuth client in Supabase Auth Providers. In Google, register the Supabase broker callback `https://rxetgzutbqfszahzkusi.supabase.co/auth/v1/callback`. Store the Google client secret in Supabase, never in the frontend or Git. This repository cannot provision your Google consent screen/client credentials.

Production Site URL was corrected from localhost to `https://3d-printing-by-memo-mfu-two.vercel.app`. The explicit customer callback is `/api/auth/callback`. `ops/production-auth/supabase/config.toml` declares only these two URL settings; `supabase config push --workdir ops/production-auth --remote=rxetgzutbqfszahzkusi` preserves all undeclared provider/email/MFA settings. Supabase also permits redirects on its Site URL's own origin, including our per-flow query value. MEMO always constructs the callback from `APP_ORIGIN`, validates a one-use HttpOnly flow cookie, and exchanges the code with the original PKCE verifier. The broker validates upstream OAuth state and OIDC nonce/signature/issuer/audience; never implement a raw credential proxy. Return destinations are fixed; `next` URLs are ignored. No wildcard trusted origins are used.

Verify production custom SMTP, sender domain, email templates using Supabase's `ConfirmationURL`, redirect settings and delivery limits before opening public registrations. Enabling email auth alone does not prove mail delivery: Supabase's default mail service restricts recipients and volume. No real customer recovery emails were sent during implementation. The production OTP length is eight digits; email OTP accepts six or eight digits, while authenticator TOTP remains exactly six.

Server environment variables (use Vercel encrypted/sensitive settings):

| Variable | Purpose |
| --- | --- |
| `APP_ORIGIN` | Exact customer production origin; required for callbacks and CSRF |
| `ADMIN_ORIGIN` | Exact admin origin in the admin project |
| `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` | Existing backend URL |
| `SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Existing publishable/anon credential |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only, both apps; verification, security and live-session checks |
| `RESEND_API_KEY`, `AUTH_EMAIL_FROM` | Optional verified sender for separate student mailbox challenges; customer app only |
| `CRON_SECRET` | Server-only daily metadata retention authorization; provisioned for production users project |
| `MFU_SSO_AUTHORIZED` | Default false; set true only after written university approval |
| `MFU_SSO_KIND` | `oidc` or `saml` |
| `MFU_SSO_PROVIDER_ID` | Supabase `custom:...` identifier or provisioned SAML provider UUID |
| `MFU_SSO_TRUST_ENROLLMENT_CLAIM` | Default false; enable only after an authorized claim mapping is reviewed |

`RESEND_API_KEY`/`AUTH_EMAIL_FROM` do not configure Supabase Auth SMTP. They support MEMO's separate mailbox ownership challenge. All secrets are server-only. No institutional credential, institutional MFA or institutional session/token collection exists. Broker responses have provider access/refresh tokens removed before the SDK persists MEMO's own session cookies. Session cookies are HttpOnly, Secure in production and SameSite Lax. MEMO needs only its own Supabase session.

## MFU evidence and authorization boundary

Checked 6 November 2026:

- [MFU DTI mail documentation](https://dti.mfu.ac.th/en/google-application/mfulamduan-mail.html) distinguishes Lamduan student mail from staff MFU mail and points to institutional recovery.
- [MFU official student acceptance documentation](https://archives.mfu.ac.th/database/files/original/e5af2ca0967aeb7656ea5b92e52596c1.pdf) documents `@lamduan.mfu.ac.th` student addresses.
- [MFU Account portal](https://accounts.mfu.ac.th/Auth/) lists authorized university systems and support contact information. Its public page does not grant MEMO third-party access or publish a client-registration contract.
- [Supabase custom OIDC](https://supabase.com/docs/guides/auth/custom-oauth-providers), [SAML SSO](https://supabase.com/docs/guides/auth/enterprise-sso/auth-sso-saml), [PKCE/SSR](https://supabase.com/docs/guides/auth/server-side/advanced-guide).

Only the exact confirmed domain `lamduan.mfu.ac.th` is eligible for email ownership verification. Staff `mfu.ac.th`, lookalikes and subdomains are excluded. University email ownership is **not current enrollment**; alumni can retain email access. Rules requiring active enrollment do not accept mailbox-only verification.

Ask MFU DTI/CITS for approval, registered application/client, issuer/discovery or SAML metadata, broker callback registration, allowed scopes, stable subject mapping, confirmed email claim, current-enrollment semantics and expiry, logout/revocation requirements and privacy/retention agreement. Do not infer endpoints from the interactive MFU login page or copy its UI. Until approval/provisioning, the SSO button is absent and server initiation fails closed.

For stronger verification, an authorized server-side Supabase Auth integration/hook must populate **app_metadata**, never user-editable metadata:

```json
{"mfu_enrollment":{"providerId":"custom:mfu","email":"student@lamduan.mfu.ac.th","status":"active","expiresAt":"2027-01-01T00:00:00Z"}}
```

The adapter requires explicit trust configuration, an exact matching broker identity provider, an allowed email, valid bounded expiry and recognized enrollment status. The stored verification expires at the earlier of the claim expiry and re-verification interval. Supabase maps identities by its provider/subject contract; MEMO never auto-merges accounts based on browser-supplied email. Do not enable unsafe email auto-linking for an institutional provider. SAML licensing/plan eligibility must be checked before provisioning.

## Student verification, discount integrity and administration

A signed-in customer can verify an already confirmed primary Lamduan email, or receive a MEMO-specific six-digit mailbox code through the configured sender. Codes expire in 15 minutes, are HMAC-hashed, attempt-limited and single-use. This is explicitly not a university MFA code. Only UUID, method, email, timestamps, optional authorized enrollment status and expiry are persisted; no separate student number is extracted.

A primary email identity is unique across accounts; plus-tag aliases are rejected at both the API and database boundary to prevent mailbox alias recycling. Customers cannot switch an existing claim to another email to recycle limits, and cannot self-clear an admin revocation. Identity changes require administrator/support review. Revoked claims can be restored through the audited admin control; restoration never extends expiry or fabricates enrollment. Email re-verification renews the same identity; it does not prove enrollment. Admin UI supports audited revocation/restoration and expiry review; it cannot fabricate enrollment. Verification history contains action/actor/time, not credentials.

Discounts are computed by a service-only database function and a quote-insert trigger. Browser `student`, `discount`, `enrollment` or `verified` fields cannot grant eligibility. Rule and identity locks serialize usage counts. Issued quotations reserve usage, even if not yet ordered, matching existing promotion behavior. Expired quotations do not automatically release slots; admins may adjust a rule's limit after review. Default stacking with Early Bird is off. Fixed/percentage amounts, eligibility/enrollment, expiry, minimum subtotal, global and per-identity uses, stacking, minimum profit/margin, and re-verification days are configurable. Cost/service floors always apply; tax and shipping follow the discounted subtotal. Rule terms, verification reference and calculated amount are embedded in immutable quote estimates. A final quotation must also respect the frozen student offer's profit/cost floors against reviewed production costs. Later rule edits do not rewrite old quotations. If an Early Bird slot runs out at commit, the existing transaction re-inserts regular pricing, and student pricing is recalculated atomically.

## Security, monitoring and retention

Authentication failures are rate-limited by keyed email and network hashes. Five recent repeated failures flag suspicious activity; unknown accounts are not exposed through recovery responses. Raw passwords, cookies, access/refresh tokens, MFA secrets and raw IP/device fingerprints are never logged. Network hashes rotate daily; no device fingerprinting is implemented. Admin summaries omit network and subject hashes. Ordinary customers cannot read raw security logs, challenge hashes or verification audit tables. Customers see only their own safe kind/time activity.

New daily-network sign-ins and password/MFA/session changes create account notifications. These are **in-app notifications**, not a claim that security emails are delivered. Supabase Auth audit logs remain the provider's authoritative record. Password recovery must use Supabase's configured mail delivery. Optional customer MFA is enforced from freshly fetched factors plus verified JWT AAL, not cached browser user data. Revoked/expired Auth sessions are checked server-side on every protected request, including existing JWTs; sign-out-all revokes refresh sessions and removes access to MEMO immediately. Admin role plus MFA is unchanged.

Vercel runs `/api/security-retention` daily at 03:00 UTC with `CRON_SECRET`. It removes raw security metadata older than 30 days, expired mailbox challenges and stale rate-limit rows older than two days. Security event writes also invoke pruning. Monitor the cron's execution/errors in Vercel; authenticated customers cannot trigger it. Verification and financial audit records have a separate business-retention lifecycle; handle deletion requests through the existing reviewed privacy workflow rather than deleting financial evidence or bypassing uniqueness rules.

## Verification

Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm security`, `pnpm build` and `pnpm test:e2e`. Database tests execute every migration in embedded PostgreSQL and cover RLS/MFA boundaries, exact domains, duplicate identities, expiry/re-verification, code guessing/replay, stacking, discounts/floors/tax, transaction limits and immutable snapshots. Callback tests check flow state, exchange failures, one-time state, fixed redirects and generic recovery. Browser tests cover four-language login messaging, provider availability, recovery/resend contracts and the customer MFA step. Connected external Google/MFU and real SMTP inbox tests need those external providers and authorized test accounts; local isolated browser contracts do not establish external-provider availability.
