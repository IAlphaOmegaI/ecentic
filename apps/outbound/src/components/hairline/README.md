# Approved Outbound header figures

These are local copies of ecentic’s approved Hairline geometry. The independently deployed
Outbound app must not import runtime source from `apps/web`.

Canonical sources:
- `apps/web/src/components/hairline/rest/*.json` — server-rendered rest poses.
- `apps/web/src/components/hairline/kernel-style.css` — unchanged kernel CSS.
- `apps/web/public/hairline/kernel.js` and `custom/*.js` — unchanged engine and interaction code,
  copied to `apps/outbound/public/hairline/`.

`../dashboard-header-figure.tsx` maps each Outbound function to its subject, uses the same fixed
kernel and lifecycle, serves complete rest geometry before hydration, and disables interactive
motion for reduced-motion preferences. Refresh geometry and matching interaction scripts together
when their canonical drawing changes; never edit the kernel for an individual drawing.
