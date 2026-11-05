# Customer workflow

The upgraded studio has six steps and four-language/light/dark preferences. See [current workflow and rollout](production-upgrade.md). The sequence below describes the business process; the studio now calculates an unsaved estimate before creating an immutable quotation on final request.

1. Browse services and public consented gallery entries. Prices are distinct: basic printing from THB 100; design plus print from THB 1,500.
2. Register and verify email, or use the email OTP guest inquiry form on login. The verified identity owns the inquiry; UUIDs and readable order numbers never grant access.
3. Configure a ready file, photo inquiry or custom design. Upload a supported file up to 4 MiB; choose mm/cm, dimensions, an in-stock color, quantity, detail and finishing. Mesh aspect ratio is preserved by default and required by the current estimator.
4. Rotate, zoom and screenshot the preview. Uploaded meshes render actual geometry. Photographs remain reference images with generation/manual-inquiry controls. No wireframe substitute model is rendered. Actual geometry supports pan, rotate, zoom, screenshot and STL export. A 100 mm line, grid and dimensions provide scale. Screen filament colors are approximate.
5. Save the estimate. The server reparses the owned mesh; watertight geometry can produce a range based on explicit assumptions. Photo and open-mesh inquiries show a service floor without invented weight or hours. The configured global rates are snapshotted. Promotions reserve capacity transactionally; a depleted promotion falls back to regular pricing.
6. Request a final quote, creating a private order. Admin reviews production feasibility and actual costs, uploads a real final mesh and issues the final price. The customer can download the mesh and approve, or request changes. Deposits cannot be marked received merely by uploading evidence.
7. Follow order events and the in-app notification inbox. When shipped, confirm receipt. Download your data export from account. Request deletion or a larger file archive through the recorded privacy-request flow; fulfillment requires manual operator work.

Photo reconstruction is a consented action directly in the studio after private upload. It requires a configured provider, worker, monthly allowance and available customer daily quota. The preview job route shows persisted states and only displays real returned geometry when available. Cancelling in-progress provider work may be unavailable and does not promise a refund.

No production lead time is invented. Contact the shop for timing. Bank transfer is disabled until the operator configures genuine details. Payments always require manual verification.

The catalog upgrade adds versioned THB 100 rules, protected production-cost floors, explicitly authorized promotion exceptions and private slicer reviews. See [model catalog](model-catalog.md). Accepted historical quotes stay unchanged.
