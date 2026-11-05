# Operations and verification

Before launch, publish actual rates, verify physical stock, enable only available colors, configure real bank/contact settings, define production windows, review cancellation/deposit terms and retention obligations, and confirm monthly provider allowances. No seed claims inventory exists or an Early Bird promotion is active.

Run CI commands from README on every change. Keep lockfile committed. Audit production dependencies regularly. Backup/restore and point-in-time recovery depend on the Supabase plan and must be tested by the operator. The web apps are replaceable; PostgreSQL, private Storage and provider records require recovery procedures.

Monitor queue age, expired leases, ambiguous submission codes, nonzero reserved budgets, failed reconstruction output parsing, stock thresholds and unresolved privacy requests. Worker logs are redacted event codes. Restart the supervised worker after failures; stored leases recover. For uncertain submission IDs, reconcile the Meshy dashboard before any manual reset. Never reset attempts to zero without evidence the paid request was not accepted.

A separate retention process is not active by default. Review proposed 30-day orphan-upload and 365-day closed-order settings, accounting/legal holds and customer deletion requests before scheduling cleanup. Delete private objects as well as database metadata when fulfilling approved requests, reconcile references/FKs, and retain the minimum lawful accounting record. Export/deletion fulfillment is currently manual.

Stock management is manual: each receiving/reservation/consumption event needs a reason. The dedicated reservation and consume/release forms remove grams once and settle idempotently. Do not also apply an unrelated negative stock adjustment to the same consumption. Spool-level and aggregate stock reconciliation are operator responsibilities. Low-stock threshold data is stored; automatic low-stock messaging is not implemented.

## Actual-service acceptance test (not performed without credentials)

1. Create two confirmed test customer identities in a non-production Supabase project, with no hardcoded repository passwords. Configure both web environments.
2. Customer A uploads a small triangulated mesh, adjusts scale/color and saves an estimate, then requests a final quotation. Confirm the upload SHA, quote snapshot and order event in PostgreSQL.
3. Customer B attempts A's quote, order, document, job and private file IDs: every response must deny or return no data. Direct Supabase reads must likewise be empty. Try raw writes and admin role escalation: denied.
4. Admin without MFA must be denied. Verified MFA admin reviews A's private file, records actual slicer results, uploads a final mesh, issues a quotation and sends it for customer approval.
5. A reviews and accepts the actual design. Configure real test bank instructions, upload synthetic payment evidence, verify it manually and advance production. Upload alone must not mark paid.
6. Create a promotion with one slot; use independent concurrent sessions to submit distinct quotes. Exactly one allocation must succeed. Repeat the same idempotency key and ensure no extra slot is taken. Embedded tests verify constraints/logic, not separate-connection isolation under load.
7. In a budget-limited provider sandbox, test success, authentication failure, insufficient credits, 429, network timeout before/after POST, worker crash recovery, cancellation 409, rejected asset hosts and oversized output. Confirm no duplicate paid submissions.
8. Verify real browser flows on mobile/desktop with SMTP, cookie refresh, private Storage and MFA. Record URLs/build IDs and test evidence in your deployment record.

The default local Playwright suite checks unconfigured-mode behavior, page layout, language switching, model scaling and admin redirects. `tests/e2e/connected.spec.ts` adds a real customer upload → estimate → admin final quote → approval scenario, skipped unless `RUN_CONNECTED_E2E=1`. Supply confirmed non-production E2E_CUSTOMER_EMAIL/PASSWORD, E2E_ADMIN_EMAIL/PASSWORD and E2E_ADMIN_TOTP_SECRET through the test environment, plus valid app backend configuration, APP_ORIGIN values, an admin role and stocked material. Never run this write test against production. It must not be described as a verified hosted customer/admin transaction.
