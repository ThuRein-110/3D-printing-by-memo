# Current limitations / launch blockers

This is an implemented local platform, **not a claim of production readiness**.

External Supabase Auth/Storage/SMTP/MFA, live Meshy conversion, worker hosting, Vercel builds/deployments and authenticated customer-to-admin browser transactions have not been verified because no service credentials or authenticated deployment CLI were supplied. PostgreSQL policy tests use embedded PostgreSQL with synthetic identity helpers.

Implemented workflows include account/OTP forms, checked uploads, immutable quotes, estimates, promotion allocation, private order timelines, guarded transitions, manual payment evidence/verification, PDFs, customer requests for privacy actions, admin configuration CRUD, stock transactions, private final mesh uploads, consented reconstruction queueing and a separate real-provider worker.

Remaining product and operational work:

- Most admin settings use a validated JSON editor. Pricing has full validation, append-only versions and an interactive cost-review calculator. Dashboard metrics separate receipts, completed net sales and recorded costs/labor; these require reconciliation and are not a full accounting ledger.
- Automatic spool allocation, low-stock messaging and production scheduling are not implemented. Atomic order reservations, idempotent consume/release operations and aggregate stock changes are available; spool totals require manual reconciliation.
- Slicer execution is not integrated. Store profiles/results manually; approximation factors are illustrative, not calibrated. 3MF, textured/compressed/external/transformed GLB and non-triangulated OBJ are deliberately unsupported. Meshes are capped at 100,000 triangles and uploads at 4 MiB.
- Guest inquiries use email OTP backed by Supabase identities; email template/SMTP configuration is required. Password recovery UX and full account profile editing are not yet implemented.
- Notification delivery is in-app only. No email/SMS is sent. A customer can download a JSON data export and private files. Larger exports and deletion requests require manual fulfillment; automatic retention cleanup is not enabled.
- Gallery supports consented public metadata. Customer file images are not publicly rendered; there is no separate sanitized public-image pipeline. Spool image management/calibrated swatches are not implemented.
- PDFs embed Thai/English fonts and paginate notes. Tax invoice legal fields, business registration/address, numbering rules and local tax compliance need operator review before issuance as legal tax documents.
- Both Supabase clients use generated migration-derived database contracts; the dynamic admin configuration editor retains a schema-validated type boundary. Some service-role audit records lack actor attribution. Strict nonce CSP, distributed load tests and independent penetration testing remain outstanding.
- Provider allowances are operator-defined THB reservations, not verified Meshy credit billing. Budget provisioning/reconciliation is manual; paid submissions deliberately stop for uncertain-charge reconciliation instead of automatic resubmission. Cancellation cannot guarantee a refund. Provider outputs above 4 MiB or unsupported geometry fail safely.
- Reprint API pricing is supported, but there is no dedicated reprint-from-order UI. Fine detail and finishing selections are recorded for admin review; no uncalibrated automatic surcharge is presented as a verified cost.

Do not enable production orders until the relevant acceptance tests, verified inventory/cost configuration, privacy/contact/payment details and operational recovery procedures are complete.
