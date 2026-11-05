# Admin workflow

Create the initial account and role out of band using the Supabase setup guide. Sign in, enroll TOTP if necessary, and complete MFA. All data routes verify role and AAL2 again.

The dashboard and operational lists show real database rows, capped at the latest 100. They never display fabricated revenue. A live metrics panel separates manually verified cash receipts, completed-order net sales, recorded costs/labor and missing-cost exceptions. Provider reservations are labeled as allowances rather than actual billing. Materials, spools, pricing versions, promotions, production records, gallery consent and settings use schema-validated configuration editors with an explicit reviewed-change checkbox. The upgraded editor provides structured, translated fields; slicer/settings JSON remains a technical configuration editor. All operational controls support four languages and light/dark/system themes. Settings and AI generation jobs add daily quotas, monthly allowance, reviewed credit cost, concurrency and provider-reported consumed-credit telemetry. See [production upgrade](production-upgrade.md) for setup.

Record actual stock in Inventory and enable colors in Materials. Spool records track suppliers, batches and remaining grams. Aggregate customer availability changes through audited inventory transactions. Use the order reservation form to reserve, consume or release material; settlement is idempotent and consumption does not subtract available grams twice. Spool-level reconciliation remains manual.

Dedicated filament images require the publication checkbox. Only purpose-marked filament media is served by the sanitized public color endpoint; arbitrary customer images cannot be published through material IDs.

For an order:

1. Move submitted → reviewing. Open the linked quote. View the customer’s private files.
2. Enter real slicer results, profile and design/finishing effort in Production. Review the shared pricing model and enter a final total; the server enforces service floors.
3. Upload an actual final design mesh for the customer. The upload control returns and fills the file ID. Issue the final quote. Then move the order to awaiting_customer_approval.
4. Customer accepts the real design and quote, or requests changes. Accepted rates and totals stay immutable.
5. Move approved → awaiting_deposit. Inspect private payment evidence, compare with bank records, and manually verify it. Only then can the order enter paid_deposit.
6. Move through designing/printing/finishing/ready/shipped/completed as appropriate. Record failures and reprint reasons in production records. Internal production notes are not exposed to customer roles.

Download quotation PDFs from quote details. Authenticated document endpoints also support `kind=invoice` for accepted final quotes and `kind=receipt` only for manually verified payments. PDFs embed the OFL-licensed Noto Sans Thai font and paginate Thai and English notes. They are ordinary business documents, not a claim of legally compliant tax invoices.

Audit logs cover database changes to rates, promotions, orders, materials, settings, payments and gallery publication. Server service-role mutations have a null JWT actor; order and final quote RPCs record the authenticated actor. Full per-handler actor attribution is a known launch gap.
