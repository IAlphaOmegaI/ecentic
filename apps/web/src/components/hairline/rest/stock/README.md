# Stock Hairline rest geometry

These local SVG fragments provide the server-rendered and reduced-motion poses for every stock subject used by `HairlineFigure`. They are captured from **@lucasmarkes/hairline 0.5.1**, not hand-recreated drawings. The live package remains lazily loaded near the viewport.

Capture settings: a 400 × 320 host and SVG viewBox, `intensity: 0.5`, `play: false`, no pointer or keyboard input. Mount each vanilla figure export from the installed package's `dist/index.js`, wait for its initial render (two animation frames), save the SVG's inner markup as a JSON string, then destroy the mounted instance. Do not capture HTML wrappers, live readout text or scripts. Keep the package's fixed geometry and kernel unchanged.

Before accepting a recapture:

- Parse the fragment as XML and require finite geometry: no `NaN` or `Infinity`.
- Allow only SVG geometry and local definitions (`svg`, `g`, `path`, `circle`, `ellipse`, `line`, `polygon`, `polyline`, `rect`, `defs`, `linearGradient`, `stop`, `mask`). Reject scripts, event attributes and external links/resources.
- Check every `url(#...)` reference resolves to a local ID. Replace generated IDs and their references with `__REST_ID__-0`, `__REST_ID__-1`, etc. The renderer substitutes a React `useId` namespace per instance so repeated riffle masks cannot collide.
- Confirm both light and dark semantic surface variables, with and without JavaScript. A loaded figure replaces the rest stage; failed loading and reduced motion leave the static stage visible.
- Run `cd apps/web && bun test src/components/hairline/figure.test.tsx`. Its server-render test covers all fifteen subjects and rejects missing geometry, unsafe markup and duplicate/local-mask references. Also verify one normal pointer interaction and one deliberately blocked lazy artwork chunk in the browser.

The narrow rules in `figure.css` intentionally override the package's injected unlayered `position`/`display` styles. Without them, the two stages can stack or an inactive rest drawing can remain visible after enhancement.
