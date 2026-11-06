# Preview before sign-in

The configurator now previews a selected STL, OBJ, GLB or mesh-only 3MF locally, without an account or file upload. Customers can rotate/zoom, advance to preview/customization, change dimensions, select a material and quantity, and only encounter authentication when saving an estimate. Upload and quotation endpoints retain their existing authentication, CSRF, file validation, private storage and ownership checks.

On the estimate step, the deferred upload's returned file ID is passed directly to the server estimate request, rather than waiting for a React state update. The local geometry, dimensions and quantity survive inline sign-in. Generation-job state resets when changing files so a previous output cannot replace the new selection. The previous job query parameter is cleared when selecting another source.

JPG/PNG/WebP selections show a large **Photo reference preview**, including on mobile immediately after selection. They are explicitly labeled as photos rather than reconstructed geometry. The existing generation service option and controls are hidden when generation is unavailable. Customers can continue as a manual custom-design inquiry.

No free relief/lithophane generator or guest AI generation service was added. The user declined that option on quality grounds and specified a ฿0 budget. Production generation remains disabled with monthly budget 0 and no reviewed provider credit cost. No new provider, anonymous authentication, credentials, migration or paid request is introduced. The pre-existing authenticated generation integration remains available for future shop configuration; its private upload, consent and budget controls are preserved.

Browser coverage checks all four mesh formats before any upload/auth prompt, real canvas rendering, mobile visibility, saved selections through sign-in and deferred upload, correct file-ID handoff, immediately decoded photo previews, hidden unavailable generation controls and four languages. Existing server/API/database and model-order tests remain active.
