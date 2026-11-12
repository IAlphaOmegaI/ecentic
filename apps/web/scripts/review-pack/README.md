# Website review pack

Tested with Node 24.12.0, Playwright 1.62.1, Sharp 0.35.5, pdf-lib 1.17.1, axe-core 4.11.0 and Poppler 26.02. Chromium and WebKit binaries must come from that Playwright version.

Run `review-pack.mjs` against an already running production server. It does not build the app, start or stop servers, sign in, or submit forms. For the final review pack, the build must use `NEXT_PUBLIC_REVIEW=1`; the build owner manages that environment and server lifecycle.

From the repository root:

```sh
node apps/web/scripts/review-pack.mjs --base-url http://localhost:3001
```

The default destination is `~/Documents/Codex/2026-11-05/hey/review/website-2026-11-10`, then `-v2`, `-v3`, and so on. An explicit output folder must be fresh. The script never silently replaces an earlier pack.

For a focused before/after comparison:

```sh
node apps/web/scripts/review-pack.mjs \
  --base-url http://localhost:3001 \
  --routes /,/platform,/solutions/enterprise,/integrations,/pricing \
  --output output/enterprise-rebuild/tailwind-before \
  --skip-menus

node apps/web/scripts/review-pack.mjs \
  --base-url http://localhost:3001 \
  --routes /,/platform,/solutions/enterprise,/integrations,/pricing \
  --output output/enterprise-rebuild/tailwind-after \
  --baseline output/enterprise-rebuild/tailwind-before \
  --skip-menus
```

Dependencies are Playwright, Sharp, pdf-lib and axe-core. They can live outside the repository; no application dependency change is required. Pass the tooling directory with `--modules /path/to/node_modules` (repeatable), or set `REVIEW_PACK_NODE_MODULES` to platform-delimited directories. The script also discovers the Codex bundled runtime. Install Chromium and WebKit with the CLI belonging to that exact Playwright installation.

Packs over 12 screenshots also require Poppler's `pdfunite` command; pass `--pdfunite /absolute/path` if it is not on PATH. PDF assembly creates independent 12-page parts, merges them in a separate process, verifies the page count with `pdfinfo` when available, and removes the temporary parts after success. This keeps the entire site's image data out of one JavaScript PDF document. Leave enough disk space for the PNGs, PDF parts and final PDF to coexist during assembly.

Useful options:

- `--list-routes` prints the sitemap and route-table union without launching browsers.
- `--notes /path/to/UI-NOTES.md` includes documented design exceptions in the report.
- `--commit-base REF` selects the starting point for the branch commit inventory.
- `--concurrency 1|2` controls the bounded desktop/mobile concurrency for each route (default 2). Browser contexts remain isolated.
- `--resume --output PATH` continues an interrupted capture. Use only against the same unchanged build and base URL; recorded views and the manifest’s original route inventory are retained. A newly published article does not change a partly captured pack; use a fresh run to include it. An explicit `--routes` must still match the saved inventory. The recorded local production BUILD_ID is checked before every route and on resume; a changed build requires a new pack.
- `--reports-only --output PATH` regenerates the contact sheet, PDF and reports from existing screenshots/metadata. It does not recapture the site. Do not use it on an annotated delivery pack: review notes and the PDF would be replaced.
- `--date YYYY-MM-DD` changes the default folder's date; screenshot headers record the actual local capture-report date.

## Reproduce the tested tooling

Install these versions in a separate tooling directory, without changing application dependencies:

```sh
mkdir -p "$HOME/.cache/ecentic-review-pack-tools"
cd "$HOME/.cache/ecentic-review-pack-tools"
bun init -y
bun add --exact playwright@1.62.1 sharp@0.35.5 pdf-lib@1.17.1 axe-core@4.11.0
bunx playwright install chromium webkit
brew install poppler
```

`brew install poppler` is the macOS setup for `pdfunite`, `pdfinfo` and `pdftoppm`; skip it when those tools are already installed. The current Mac also has the tested Node libraries in Codex's bundled runtime and axe-core in `/tmp/ecentic-review-pack-tools/node_modules`. The explicit installation above is the durable rerun path. Inspect `manifest.json` to confirm the resolved libraries; application dependencies take resolution precedence if the repository later adds them.

Build and start the final review site with the flag at both stages. Use the direct web scripts so a cached normal Turborepo build cannot be reused:

```sh
cd apps/web
NEXT_PUBLIC_REVIEW=1 bun run build
NEXT_PUBLIC_REVIEW=1 bun run start -- --port 3001
```

Leave that terminal running. From the repository root in another terminal:

```sh
node apps/web/scripts/review-pack.mjs \
  --base-url http://localhost:3001 \
  --modules "$HOME/.cache/ecentic-review-pack-tools/node_modules" \
  --notes docs/marketing/design-pass.md
```

Omit `--routes` for the complete sitemap/route-table union. Every fresh run resolves the current inventory; `--list-routes` previews it and `manifest.json` records the exact routes. A full pack contains two page screenshots per route plus eight menu/form screenshots. Use those recorded counts in the delivery report because newly published articles can expand the sitemap. The default destination follows the required versioned `hey/review` path.

## Evidence and review behavior

Desktop uses Chromium at 1440 × 900, density 2. Mobile uses Playwright's unmodified iPhone 14 preset and WebKit. Every view gets a new signed-out browser context, reduced motion, font readiness, a full scroll to load lazy images, and a cookie-consent decline through the UI. Metadata records consent, loaded fonts, title, description, H1, text count, TODOs, representative computed styles, overflow, image failures and axe results. The script captures all five mega-menus, the mobile sheet, an interest form and demo step 1 unless `--skip-menus` is set. Missing sitemap access is fatal for a full pack, and every intended route must have both viewport captures before the pack is called complete. A full pack also requires all eight named menu/form PNGs; failed, missing or duplicate interaction captures stop completion. A focused pack records that interactions were deliberately omitted.

PNG screenshots retain native resolution. Very tall pages are stitched from document-coordinate clips to avoid browser image-size truncation. The viewport stays unchanged and native image width includes any real document overflow; overflow remains a reported defect. Geometry is measured after capture-only sticky normalization, every tile is checked and the final document size must remain stable. Fixed overlays and the sticky header appear once; other sticky content is placed in its normal flow only within the capture browser. Videos are paused for deterministic capture. Where the page provides a poster, that exact decoded poster is used in the capture browser; metadata retains the original source/readiness/error state, and media or poster failures remain reported. Original application files are never modified. PDF pages preserve each image's proportions, with high-quality JPEG compression and page dimensions bounded for Preview. Original PNGs remain available for close inspection.

`manifest.json`, individual `metadata/*.json`, `metadata-checks.json`, `axe-summary.json` and `verification.json` accompany the requested PDF, contact sheet, CSV and Markdown reports. Metadata and manifest writes use an atomic rename; resume also recovers completed per-view metadata if interruption occurred before the manifest checkpoint. The manifest keeps compact summaries of axe's incomplete checks; individual metadata files retain their full detail. Geometry is checked against the decoded PNG dimensions. The generated contact sheet is opened in Chromium and every thumbnail is decoded. The caller should still visually inspect representative full-resolution captures, especially complex tables, overlays and very long pages, and render a representative PDF page before delivery.

`source-todos.json` reads exact open questions from raw enterprise catalog fragments and maps source keys to routes, including the unpublished research draft. EN/ES ownership uses the same English source key. Reports distinguish named or brief-defined ownership from suggested technical routing and Xhurian's owner-confirmation routing; the latter is not a claim that an owner has already been assigned. The content audit remains the authority. The source bridge also reads `evidencePending` from `src/content/marketing-evidence.ts` and joins its IDs to the EN/ES `enterpriseEvidence.pending` questions. Identical About/Contact company questions are combined. DUA starting-point, change and April-date questions are aliased to their existing story questions while retaining every original source key and route placement. `TODO.md` deduplicates the total by actual input and separately counts page occurrences, so shared-footer questions and translations do not inflate the distinct-input total. Production omissions and localized pending labels do not hide these source questions. Any unmapped source question is reported explicitly. Visible DOM TODOs without a source match are also retained.

`metadata-checks.json` records one-H1 checks, missing title/description fields, route statuses and shared metadata. Redirect aliases resolving to the same observed destination are identified separately from ordinary duplicate metadata. Both device statuses determine page availability. `axe-summary.json` retains every severity and counts both rule findings and affected nodes.

The script records third-party runtime failures rather than concealing them. For example, WebKit on HTTP localhost can report a pre-existing cross-origin Chatwoot iframe error even when the page itself renders correctly. Compare with the baseline before classifying a new regression. Axe does not replace visual review; contrast over artwork and overloaded layout selectors require manual inspection.

Very tall pages, including the complete blog index, can exceed Sharp’s default 268-megapixel input ceiling. The harness raises that ceiling only to each capture’s measured pixel area, including verification, thumbnails and PDF reads. Final PNGs retain native width, height and device density. Only the PDF derivative is scaled proportionally when its JPEG would exceed 60,000 pixels in height.

Image preparation distinguishes failed resources from requests still pending. It allows up to 45 additional seconds for a large index’s queued requests after the bounded decode attempt. Exhausted requests remain visible in metadata as `state: "pending"`; completed resources with zero natural width are recorded as `state: "failed"`. Neither is silently omitted.

Before axe, the harness observes document geometry, loaded fonts and shared ScrollArea viewport measurements for at least 500ms of stability, bounded to 5 seconds. Overflowing ScrollAreas must have received their own nonnegative tabindex. This observation never changes tabindex or suppresses axe findings; readiness, timing and viewport dimensions are saved in each metadata file, and an exhausted readiness check is reported.
