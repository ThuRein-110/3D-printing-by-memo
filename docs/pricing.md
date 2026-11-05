# Pricing and accounting

All cost defaults in code are **illustrative**, not verified Creality K2 operating measurements. Review and publish actual rates in Pricing. Published versions have effective timestamps and optional material/service scope; the most specific matching material rule, then service rule, then newest effective version takes precedence. Quote snapshots never track later updates. The cost-review calculator defaults to the newest global version; select scoped rates in the configuration editor when reviewing a scoped quote.

For one unit, filament is grams / 1000 × THB per kg. Electricity is print hours × average kW × THB per kWh. Machine cost is hours × hourly maintenance/depreciation allocation. Support allowance is a fraction of base material cost. Failed-print allowance is a fraction of material, support, electricity and machine allocation. Hardware is per unit; packaging and setup are per order. Owner labor includes design hours once per order, finishing hours per unit, and allocated setup labor. Overhead is a configurable fraction of cash, machine and labor allocations.

Production cost = cash expenses + machine allocation + owner labor + overhead + setup. Cash expenses include material, supports, electricity, hardware, packaging and expected failure allowance. This accounting treats the failure allowance conservatively as cash; reconcile actual costs for financial reporting. Owner labor is separately reported. Contribution = subtotal − cash expenses. Profit after labor = subtotal − production cost. Margin = profit after labor / subtotal. Tax collected and shipping pass-through are excluded from profit; shipping cost reconciliation is outside this estimate model.

Order of operations:

1. Calculate production cost and target selling price as cost / (1 − margin), validating 0 ≤ margin < 1.
2. Apply service floor once per order: THB 100 for ready/reprint; THB 1,500 for custom/photo design inquiries.
3. Apply rush surcharge, then configured percentage discount, then an eligible fixed or percentage promotion.
4. Protect the service floor again after discounts.
5. Round the subtotal to satang, add rounded tax, then shipping. Displayed cost/profit subtraction uses rounded costs to keep reports consistent to satang.

Quantity scales material, machine, electricity, hardware and finishing. Design effort is not multiplied for reprints. Current initial mesh estimates assume no known design/finishing labor; those choices require admin pricing review and are not promised free. Promotions cannot create negative amounts and do not combine with other promotions. Their transaction reserves the first eligible rule; capacity exhaustion produces a regular quote rather than an unavailable discount. Bangkok time is represented by ISO offsets or UTC instants, not ambiguous local strings.

Mesh estimate: signed triangle volume and surface area from a watertight mesh, PETG density 1.27 g/cm³, shell allowance 1.2 mm, 20% infill, volumetric throughput 6 mm³/s, with 0.7–1.5 illustrative factors. These are explicit assumptions, not calibrated confidence intervals. Supports, travel, orientation, walls, topology and cooling affect real slicing. Bounding box volume is never used as exact plastic volume. Non-watertight meshes and photographs return inquiry floors only. There is no configured slicer executor; actual slicer results are entered manually.

The catalog upgrade adds versioned THB 100 rules, protected production-cost floors, explicitly authorized promotion exceptions and private slicer reviews. See [model catalog](model-catalog.md). Accepted historical quotes stay unchanged.
