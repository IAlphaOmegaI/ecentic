# Dashboard header artwork

The 14 November 2026 dashboard review calls for a distinct, function-specific Hairline subject on every dashboard page. `DashboardHeaderFigure` requires a route `subject`; its central mapping prevents unrelated pages from falling back to a convenient stock drawing. Product detail also retains its genuine product thumbnail.

| Page | Subject | Drawing and pointer response |
| --- | --- | --- |
| Store hub | `storeHub` | Storefront; the shop shutter rises |
| Overview | `overview` | Control console; a dial turns and nearby faders adjust |
| Products | `products` | Product document stack; catalog pages lift |
| Product detail | `productDetail` | Parcel with hanging product label; the tag turns out |
| Add products | `addProducts` | Import chute; a parcel descends into the intake |
| Quality | `quality` | Readiness scanner; the record and scanner lid respond |
| Optimize | `optimize` | Repair tools; the fixing tools lift |
| AI research | `research` | Focusing telescope; the eyepiece extends and tube follows |
| Simulations | `simulations` | Comparison stand; one listing rises beside the other |
| Questions | `questions` | Speech cards; the foreground question lifts beside its answer |
| Brand | `brand` | Handheld megaphone; the bell extends |
| Competitors | `competitors` | Rival parcels on a balance; the beam and pans tip |
| Add competitor | `addCompetitors` | Target finder; the sight slides along a focusing rail |
| Catalog rank | `catalogRank` | Stocked shelf and ladder; the top product lifts with nearby parcels |
| Channels | `channels` | Physical plug hub; the front connector seats in its socket |
| Visibility | `visibility` | Catalog feeder and beacon; the antenna extends above its records |
| Google Shopping | `googleShopping` | Merchant catalog folio; product records lift |
| Agentic readiness | `agentic` | Test meter and probe; the dial sweeps and probe follows |
| UCP | `ucp` | Checkout till; its cash drawer opens |
| UCP playground | `ucpPlayground` | Checkout test bench; a test card enters its reader |
| UCP comparison | `ucpComparison` | Two checkout lanes; one parcel barrier opens |
| WebMCP | `webmcp` | Browser inspection screen; a probe scans its controls |
| Results | `results` | Analytics recorder; its trace paper feeds out |
| Reports | `reports` | Report printer; incoming paper feeds down as the report emerges |
| Settings | `settings` | Interlocking adjustment gears; turning one drives the other |

Twenty drawings were created for this pass. Five already custom, precisely fitted subjects remain unique among dashboard headers: Products, Quality, Optimize, Simulations and Google Shopping. These are physical illustrations, not KPI plots or evidence of product capabilities. Marketing ASCII remains separate and unchanged.

## Runtime contract

- Sources live in `apps/web/public/hairline/custom/`; captured SVG rests live in `apps/web/src/components/hairline/rest/`.
- Every new source has a neighboring `.provenance.json` with its source/rest hashes, intended subject and review log.
- The fixed Hairline kernel and bench remain unchanged. Figures use stable rest hit areas, bounded geometry and the shared lifecycle. Discrete responses use the default 700ms easing; linked movement uses a 40ms distance step where appropriate.
- Geometry is present in server-rendered HTML. `CustomHairlineFigure` only enhances near the viewport and disables pointer-producing interaction under reduced motion.
- Headers are decorative (`aria-hidden`) and inherit their meaning from the visible page title. No visible developer captions or drawing names are added.
- Re-run `hairline-create/look.mjs` after changing geometry. It validates rest, answer, 240px rest/answer, both intensity endpoints and both themes. Inspect the contact and motion sheets; passing source checks alone does not establish visual quality.

The independent figure checks and reproducible generation/export scripts are recorded in `output/dashboard-hairline-2026-11-14/`. Actual route layout QA is recorded separately by the page owners.
