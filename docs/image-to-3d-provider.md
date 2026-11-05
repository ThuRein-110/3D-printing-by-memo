# Image-to-3D provider

The current integration requests **GLB**, not STL, from Meshy 7.1. It persists provider status/progress/consumed credits and validates private output through a bounded scene-aware parser. Legacy STL results remain readable, and STL export is available from validated mesh geometry. No live conversion or billing result has been verified from this checkout.

See [production upgrade](production-upgrade.md#actual-provider-integration) for the documented endpoints and parameters, current credit assumptions, explicit consent, monthly allowance and per-customer daily limits, durable at-most-once submission, cancellation behavior, safe retries, exact environment names and persistent worker hosting instructions.

Apply only reviewed pending migration 009 against the existing eight-migration database. Configure limits through an MFA-verified admin. `PREVIEW_JOB_BUDGET_THB` and manual daily-budget-row provisioning are obsolete for new jobs. The worker refuses to start without the upgraded schema. No worker or paid request runs inside a Vercel web function.

The fallback is a reference image and a manual quotation inquiry. There is no reconstructed mesh until a validated provider output exists. Generated geometry uses glTF scene units converted to millimetres and customer-selected scale; it does not recover trustworthy real-world object measurements or exact print material use from a photograph.
