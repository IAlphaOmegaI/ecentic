---
name: ecentic-art
description: Create, adapt or review ecentic tonal ASCII and custom Hairline commerce illustrations. Use for artwork subjects, renderer choices and figure integration; ordinary controls and measured charts remain governed by the design canon.
---

# ecentic art

Read the [design canon](../../../docs/context/design.md) for the surrounding surface, rails,
hierarchy and truthfulness contract. This skill holds the complete specialized ASCII and Hairline
guidance extracted from the canon after the 12 November 2026 “write all” approval. Read the ASCII
section for sampled/tonal art and the Hairline section for custom figures. They are complementary
media; neither replaces genuine product screenshots or quantitatively correct charts.

Paths shown as code are relative to the repository root. The [review ledger](../../../docs/marketing/design-review-history.md)
resolves source aliases; exact approved quotes and reasons sit beside the affected rules below.
[Design checks](../../../docs/marketing/design-checks.md) describe C3–C5 coverage and its limits.
Shared-engine and accessibility mechanics are retained engineering requirements, not invented
quotes from the user's visual review. Artwork does not establish product capabilities; use
canonical product context for claims.

## Tonal ASCII

### Selected treatment

**Use the approved tonal-dot renderer for image-derived ASCII from a clean recognizable source
(rule 4, C4).** Dot size/tone carries shape, shading and volume; preserve physical proportions
and meaningful subject scale. Do not resample an already rasterized glyph image.

Why: “clearest shape and shading”; ASCII is “part of our design language”.
<!-- 2026-11-12 learn-taste rule 4; exact user provenance: CHAT-TONAL: “Tonal dots — clearest shape and shading”; CHAT-ASCII-COEXISTENCE: “loook i didnt ask you to cill the ascii, that is also part of our design language”; 0626.04: “generate all teh ascii with the new ascii method”. Approved with “write all” on 2026-11-12. -->

The winding-path artwork keeps its recognizable route but uses tonal dots (accepted conflict X2).
The old mixed-character `AsciiRoad` ramp is retired. Actual code, protocol text/trees,
and lettering that must be read as literal text stay literal. A text tree must not substitute
for requested product or merchant art.

Do not replace ASCII throughout the site with Hairline. Improve unclear artwork by changing its
subject, source or sampling. Retain a readable silhouette, defining features and enough negative
space. The viewer should recognize a cart, bag, product or word without reading its caption.

### Composition rules

- Give a hero subject its own plane, clear of the title, copy and conversion row.
- Background art may deliberately crop; a featured contained object must keep the features that
  identify it. Cards and logos must not end with an accidental cut edge.
- Preserve physical aspect ratio when sampling and displaying an image. A character grid's cell
  width and height are not equal; do not squash the source into its raw row/column ratio.
- Scale enough to read at desktop and tablet widths. Recheck dot density and contrast at 390px.
- Do not repeat the same ambiguous texture across unrelated page heroes.
- Keep texture subordinate where it shares a plane with essential information.

The homepage hero, audience panel, integration arc and global closing CTA may use tonal artwork.
The global closing subject is now a tonal shopping bag; it is not the former generic Hairline
basket. The footer identity is a large **dimensional tonal-dot wordmark** with a drawing/reveal
behavior. It remains readable before enhancement and under reduced motion.

Blog can pair a line-drawn book with ASCII behind it. Sector artwork can pair a relevant sampled
product with a separate line-drawn object when they explain different things. Do not place two
versions of the same subject beside each other merely to include both media. Use one dominant
foreground explanation rather than letting two animated objects compete.

### Production

Apply this method to every image-based ASCII binding, including secondary-page motifs and
small audience illustrations. The [C4 registry](../../../docs/marketing/design-checks.md) records
source, renderer and route consumers, with actual code excluded. Record the winding path as a
procedural tonal binding, not as permission to keep the retired mixed-character renderer.

Keep source images, generated assets, sampling parameters and provenance reproducible. Relevant
assets live under `apps/web/public/images/ascii/tonal/`. `EvolvingAscii` and `AsciiAtmosphere`
provide shared rendering/composition; `FooterWordmark` owns the shared brand treatment.

For new image generation on this Mac, the user's workspace instructions configure the Azure
command below. Keep the [imagegen skill's prompting advice](/Users/xhurianshaba/.codex/skills/.system/imagegen/SKILL.md)
but use this command instead of its built-in tool or `scripts/image_gen.py`:

```sh
"$HOME/.codex/bin/azure-image" generate --prompt "<prompt>" --size 1024x1024 --quality high --out "<project-path>.png"
"$HOME/.codex/bin/azure-image" edit --image "<input.png>" --prompt "<what to change>" --out "<project-path>.png"
```

Save project artwork into this project, show the finished image and report its path. If the
command reports a key error, the existing Keychain item `chatgpt-azure-image-key` needs to be saved
again; do not introduce an unrelated image API or key requirement. Compare alternatives with
the same source and context if the treatment itself needs review.

Reveal and pointer response enhance an already legible rest state. Avoid frantic glyph
substitution, unrequested perpetual loops or motion that prevents the shape from resolving.

## Hairline figures and commerce illustrations

### Choose a subject, not a convenient preset

**Choose or create a figure whose subject communicates the actual product, workflow, provider
or sector (rule 5, C3/C5).** Use the [hairline-create workflow](/Users/xhurianshaba/.agents/skills/hairline-create/SKILL.md)
for a requested new figure. Start with the physical subject and one meaningful pointer response.
A renamed stock figure is not a custom drawing, and a convenient basket, drawer or hub is not a
universal subject. Record the subject-to-purpose mapping alongside its consumers in the art
registry. Keep the defining silhouette complete and large enough to identify at rest.

Why: The user requested custom figures that “fit our thngs better”.
<!-- 2026-11-12 learn-taste rule 5; exact user provenance: CHAT-CUSTOM-FIGURES: “i want you to create custom ones through [$hairline-create](/Users/xhurianshaba/.agents/skills/hairline-create/SKILL.md) that fit our thngs better and not just premade ones”; 0445.12: “a phone or a pair of headphones”; 0626.18: “remove all of this titles”. Approved with “write all” on 2026-11-12. -->

| Context | Current subject / reference |
| --- | --- |
| Shopify | Custom shopping bag with handle/mark and catalog cards that lift toward the pointer |
| Google Merchant Center | Catalog folio with supplemental product records that lift and part under the pointer |
| Demo / pilot | Folded paper plane that banks and lifts toward the pointer |
| AI selection | Custom shopping bot inspecting product cards |
| Connect hero | Product document stack with folded corners and inspectable pages |
| Fix | Repair tools; a recognizable fixing action |
| Sell / financial outcome | Money stack where the section calls for payment/value |
| Readiness | Custom scanner inspecting a product record |
| Connections | Actual connected plugs, hub or network relationship |
| Blog | Custom open book, optionally over tonal artwork |
| Contact / support | Communication, documents or repair objects appropriate to the task |
| Sample replay product | Office chair or headphones matching the sample record |
| Home and furniture | Sofa |
| Consumer electronics | Headphones / recognizable electronics |
| Beauty and personal care | Lipstick |
| Wine and spirits | Bottle |
| Food and beverage | Packaged food |
| Fashion | Shoe |
| Health and wellness | Relevant wellness container |
| Travel and experiences | Luggage |

**Branded integration heroes put modest genuine identity with the heading and a contextual
Hairline figure in the illustration area (rule 6, accepted conflict X1).** Preserve logo
proportions and align repeated logo/title/action baselines. Google Merchant Center's large flat
Google mark is superseded by compact identity plus the catalog folio; WooCommerce retains its
dimensional custom Woo figure. Do not duplicate oversized flat marks or use one as the entire
explanatory graphic. Semantic mappings belong in `CommerceFigure` / the shared page configuration.

Why (originally inferred; accepted via “write all”, 2026-11-12): Identity should identify the provider; the larger illustration should explain what the integration does.
<!-- 2026-11-12 learn-taste rule 6; exact user provenance: 0703.01: “can you move the logo up and here do a hairline thing, for everythign. of this sort”; 2032-06: “careful here, theyre not proeprly aligned”. Approved with “write all” on 2026-11-12. -->

Equal compact rounded holders apply to an overlapping source-logo stack only. Standalone marks
and arcs remain unframed; compact hero branding is not a rule to shrink every provider logo.

A page can use several figures where they explain different things. There is no current
one-figure-per-page cap. Keep one dominant graphic per explanation and avoid repeating the same
object beside every paragraph. Existing figures remain useful where their meaning fits.

### Construction and runtime contract

- Work with the fixed Hairline engine and its documented projection, path and occlusion helpers.
  Do not rewrite its kernel to make one drawing easier.
- Keep the shared thin stroke, theme-aware edge and restrained primary highlight.
- Preserve a strong recognizable rest pose and stable hit areas throughout the interaction.
- The pointer inspects, lifts, opens, turns or connects something physically plausible.
- Use matching occlusion surfaces; a visible white plate on charcoal is a defect.
- Keep explanatory labels outside the drawing. Brand lettering is allowed where it identifies
  the requested object. Remove visible developer-style figure names and state captions such as
  “At rest” or “rest” across all public custom figures; preserve accessible descriptions. Do not
  remove meaningful product labels, chart values or process status along with those captions.
- Generate server-rendered rest geometry. JavaScript failure or lazy loading must not leave a
  blank illustration plane.
- Load interactive figure code near the viewport and sleep when inactive. Do not create an
  independent always-running animation loop for each section.
- Reduced motion exposes the complete rest state and disables motion-producing interaction.
  Zero intensity alone is not sufficient for the pinned library's pointer behavior.

`HairlineFigure`, `CustomHairlineFigure` and `CommerceFigure` own integration. Custom figure code
lives in `apps/web/public/hairline/custom/`, with captured rest geometry in
`apps/web/src/components/hairline/rest/`. Keep figure IDs, rest geometry, accessible labels and registry
mappings coherent in both locales.

The pinned library's PURE-annotation patch exists for tree-shaking. It does not change runtime
behavior. Verify bundle behavior before changing or removing that patch. Do not introduce
always-running stock figures as a shortcut around the shared lifecycle.

### Figure acceptance

Review the figure independently and inside its actual page. Inspect rest plus the eight
standard pointer poses, motion, overlap/occlusion and a small roughly 240px presentation.
A blind viewer should name the subject. Then check desktop, tablet, mobile, dark/light surfaces,
keyboard alternatives where applicable and reduced motion. Screenshot review stays with the
assigned subagent when the user requests screenshot isolation.
