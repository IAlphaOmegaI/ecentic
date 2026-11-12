import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import { resultify } from "@zenncore/utils";
import registryJson from "./routes.json";
import {
  applies,
  collectRuntime,
  exposeArtwork,
  findDuplicateEdges,
  inspectSurface,
  localizedPath,
  openLocalizedRoute,
  prepareWheel,
  productionCaption,
  type Registry,
  roadmapSourceAdvisories,
} from "./runtime";

const registry: Registry = registryJson;
const root = resolve(import.meta.dir, "../../../..");
const split = (value: string) =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
const options = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    routes: { type: "string" },
    locale: { type: "string" },
    width: { type: "string" },
    check: { type: "string" },
    out: { type: "string" },
    strict: { type: "boolean", default: false },
    help: { type: "boolean", default: false },
  },
}).values;

if (options.help) {
  console.log(
    "Usage: bun scripts/design/check-runtime.ts [--routes /,/docs/mcp] [--locale en,es] [--width 390,1135,1508] [--check seams,embedded,captions] [--out report.json] [--strict]\nDefaults: 49 registered audit routes, English, 1135px. Uses http://localhost:3000, or DESIGN_BASE_URL. Warnings are advisory unless --strict; runtime/registry errors always fail. No screenshots or source fixes.",
  );
  process.exit(0);
}

const routes = options.routes
  ? split(options.routes)
  : registry.defaults.routes;
const locales = options.locale
  ? split(options.locale)
  : registry.defaults.locale;
const widths = options.width
  ? split(options.width).map(Number)
  : registry.defaults.width;
const checks = options.check
  ? split(options.check)
  : ["seams", "embedded", "captions"];
const permittedRoutes = [
  ...registry.defaults.routes,
  ...registry.additionalRoutes,
];
const invalid = [
  ...routes
    .filter((route) => !permittedRoutes.includes(route))
    .map((route) => `Unregistered route: ${route}`),
  ...locales
    .filter((locale) => !["en", "es"].includes(locale))
    .map((locale) => `Unsupported locale: ${locale}`),
  ...widths
    .filter((width) => ![390, 1135, 1508].includes(width))
    .map((width) => `Unsupported width: ${width}`),
  ...checks
    .filter((check) => !["seams", "embedded", "captions"].includes(check))
    .map((check) => `Unknown check: ${check}`),
  ...([routes, locales, widths, checks].some((entries) => entries.length === 0)
    ? ["Selections cannot be empty."]
    : []),
];
if (invalid.length > 0) {
  console.error(invalid.join("\n"));
  process.exit(1);
}

const session = `design-runtime-${process.pid}-${crypto.randomUUID().slice(0, 8)}`;
// This standalone browser audit is not a cached Turborepo task.
const { DESIGN_BASE_URL: designBaseUrl } = process.env;
const base = designBaseUrl ?? "http://localhost:3000";
const output = resolve(
  options.out ?? resolve(root, "output/design/runtime.json"),
);
type Observation = {
  check: string;
  route?: string;
  locale?: string;
  width?: number;
  source?: string;
  message?: string;
  [key: string]: unknown;
};
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  registry: resolve(import.meta.dir, "routes.json"),
  session,
  base,
  matrix: { routes, locales, widths, checks },
  checked: [] as Observation[],
  notChecked: [] as Observation[],
  findings: [] as Observation[],
  errors: [] as Observation[],
};

const command = async (arguments_: string[], input?: string) => {
  const child = Bun.spawn(
    [
      "agent-browser",
      "--session",
      session,
      "--restore",
      "--json",
      ...arguments_,
    ],
    {
      cwd: root,
      stdin: input === undefined ? "ignore" : new Blob([input]),
      stdout: "pipe",
      stderr: "pipe",
      // Do not inherit a CDP connection or another agent's browser profile.
      env: Object.fromEntries(
        Object.entries(process.env).filter(
          ([name]) =>
            ![
              "AGENT_BROWSER_CDP",
              "AGENT_BROWSER_AUTO_CONNECT",
              "AGENT_BROWSER_PROFILE",
              "AGENT_BROWSER_PROVIDER",
              "AGENT_BROWSER_SESSION",
              "AGENT_BROWSER_SESSION_NAME",
            ].includes(name),
        ),
      ),
    },
  );
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (code !== 0)
    throw new Error(
      `agent-browser ${arguments_[0]} failed (${code}): ${stderr || stdout}`,
    );
  const parsed = JSON.parse(stdout);
  if (parsed.success === false) throw new Error(String(parsed.error));
  return parsed.data ?? parsed;
};

const evaluate = async <Result, Arguments>(
  callback: (arguments_: Arguments) => Result,
  arguments_: Arguments,
): Promise<Awaited<Result>> => {
  const response = await command(
    ["eval", "--stdin"],
    `(${callback.toString()})(${JSON.stringify(arguments_)})`,
  );
  return response.result ?? response;
};

const run = async () => {
  if (checks.includes("seams")) {
    for (const filename of registry.sourceAdvisories) {
      const source = resolve(root, filename);
      const contents = await resultify(() => Bun.file(source).text());
      if (!contents.success) {
        report.errors.push({
          check: "seams.source",
          source,
          message: String(contents.error),
        });
        continue;
      }
      const findings = roadmapSourceAdvisories(contents.data, source);
      report.checked.push({
        check: "seams.source",
        source,
        findings: findings.length,
      });
      report.findings.push(
        ...findings.map((finding) => ({
          check: "seams.source",
          severity: "warning",
          ...finding,
        })),
      );
    }
  }
  for (const manual of registry.manual) {
    if (checks.includes(manual.id.split(".")[0] ?? ""))
      report.notChecked.push({
        check: manual.id,
        source: resolve(root, manual.source),
        message: manual.reason,
      });
  }
  for (const route of routes) {
    for (const locale of locales) {
      for (const width of widths) {
        const context = { route, locale, width };
        const expected = localizedPath(route, locale);
        const configuration = {
          structural: checks.includes("seams")
            ? registry.structural.filter((owner) => applies(owner, route))
            : [],
          embedded: checks.includes("embedded")
            ? registry.embedded.filter((owner) => applies(owner, route))
            : [],
          artwork: checks.includes("captions")
            ? registry.artwork.filter((owner) => applies(owner, route))
            : [],
          exclusions: registry.exclusions,
        };
        console.log(`Checking ${expected} at ${width}px`);
        const visited = await resultify(async () => {
          await command([
            "set",
            "viewport",
            String(width),
            width === 390 ? "844" : "852",
          ]);
          await openLocalizedRoute({ route, locale, base }, command);
          await command([
            "wait",
            "--fn",
            `location.pathname === ${JSON.stringify(expected)} && document.querySelector('main h1') && document.fonts.status === 'loaded' && document.readyState === 'complete'`,
          ]);
          if (configuration.artwork.length > 0)
            await evaluate(
              exposeArtwork,
              configuration.artwork.map((owner) => owner.selector),
            );
          const measurement = await evaluate(collectRuntime, configuration);
          if (
            measurement.url !== expected ||
            measurement.width !== width ||
            !measurement.locale.startsWith(locale)
          )
            throw new Error(
              `Matrix mismatch: actual ${measurement.url}, ${measurement.locale}, ${measurement.width}px`,
            );
          report.errors.push(
            ...measurement.errors.map((error) => ({
              ...context,
              check: "registry",
              ...error,
              source: resolve(root, error.source),
            })),
          );
          if (checks.includes("seams")) {
            const pairs = findDuplicateEdges(measurement.edges);
            report.checked.push({
              ...context,
              check: "seams",
              owners: measurement.ownerCount,
              edges: measurement.edges.length,
              duplicatePairs: pairs.length,
              horizontalOverflow: measurement.overflow,
            });
            report.findings.push(
              ...pairs.map((pair) => ({
                ...context,
                check: "seams",
                severity: "warning",
                message:
                  "Two registered structural owners paint the same horizontal boundary.",
                source: resolve(root, pair.first.source),
                first: {
                  ...pair.first,
                  source: resolve(root, pair.first.source),
                },
                second: {
                  ...pair.second,
                  source: resolve(root, pair.second.source),
                },
              })),
            );
          }
          if (checks.includes("embedded")) {
            if (configuration.embedded.length === 0)
              report.notChecked.push({
                ...context,
                check: "embedded",
                message:
                  "No embedded conversation or code-column contract is registered for this route.",
              });
            report.notChecked.push(
              ...configuration.embedded
                .filter((owner) => owner.notApplicable)
                .map((owner) => ({
                  ...context,
                  check: "embedded",
                  id: owner.id,
                  source: resolve(root, owner.source),
                  message: owner.notApplicable,
                })),
            );
            for (const surface of measurement.surfaces) {
              const inspection = inspectSurface(surface);
              const observation = {
                ...context,
                check: "embedded",
                source: resolve(root, surface.source),
                id: surface.id,
                selector: surface.selector,
                geometry: surface,
                inspection,
              };
              report.checked.push(observation);
              if (
                !inspection.fillsColumn ||
                inspection.decorativeInset ||
                inspection.secondShell ||
                inspection.roundedOuterShell ||
                !inspection.fillsStretch ||
                !inspection.terminalReachable
              )
                report.findings.push({
                  ...observation,
                  severity: "warning",
                  message:
                    "Registered embedded document does not satisfy its full-column or reachable-content contract.",
                });
              const wheel = await evaluate(prepareWheel, surface.selector);
              if (!wheel || wheel.maximum <= 1) {
                report.notChecked.push({
                  ...context,
                  check: "embedded.wheel",
                  id: surface.id,
                  message:
                    "No vertical scroll range is present; no wheel movement is required.",
                });
                continue;
              }
              await command([
                "mouse",
                "move",
                String(wheel.x),
                String(wheel.y),
              ]);
              await command(["mouse", "wheel", String(wheel.delta)]);
              const movement = await resultify(() =>
                command([
                  "wait",
                  "--timeout",
                  "2500",
                  "--fn",
                  `Math.abs(${wheel.local ? `document.querySelector(${JSON.stringify(wheel.selector)}).scrollTop` : "scrollY"} - ${wheel.before}) > 1`,
                ]),
              );
              const wheelObservation = {
                ...context,
                check: "embedded.wheel",
                id: surface.id,
                source: resolve(root, surface.source),
                target: wheel.selector,
                local: wheel.local,
                moved: movement.success,
              };
              report.checked.push(wheelObservation);
              if (!movement.success)
                report.findings.push({
                  ...wheelObservation,
                  severity: "warning",
                  message:
                    "Ordinary vertical wheel input did not move the expected local scroller or document.",
                  error: String(movement.error),
                });
            }
          }
          if (checks.includes("captions")) {
            const artwork = measurement.artwork.filter(
              (entry, index, entries) =>
                entries.findIndex(
                  (candidate) => candidate.selector === entry.selector,
                ) === index,
            );
            if (artwork.length === 0)
              report.notChecked.push({
                ...context,
                check: "captions",
                message:
                  "No registered artwork wrapper is present on this route.",
              });
            for (const art of artwork) {
              const observation = {
                ...context,
                check: "captions",
                id: art.id,
                source: resolve(root, art.source),
                selector: art.selector,
              };
              if (!art.visible || !art.rendered) {
                report.notChecked.push({
                  ...observation,
                  message:
                    "Artwork is hidden or its renderer is absent; visible captions were not certified.",
                });
                continue;
              }
              report.checked.push({
                ...observation,
                visibleTextNodes: art.nodes.filter(
                  (node) => node.visible && !node.screenReaderOnly,
                ).length,
              });
              report.findings.push(
                ...art.nodes
                  .filter((node) =>
                    productionCaption(node.text, registry.figureNames, node),
                  )
                  .map((node) => ({
                    ...observation,
                    severity: "warning",
                    text: node.text,
                    target: node.selector,
                    message:
                      "Visible artwork text appears to be a production caption or engine readout; review customer meaning.",
                  })),
              );
            }
          }
        });
        if (!visited.success)
          report.errors.push({
            ...context,
            check: "runtime",
            message: String(visited.error),
          });
      }
    }
  }
};

const execution = await resultify(run);
if (!execution.success)
  report.errors.push({ check: "runtime", message: String(execution.error) });
const closed = await resultify(() => command(["close"]));
if (!closed.success)
  report.errors.push({ check: "browser.close", message: String(closed.error) });
const saved = await resultify(async () => {
  await mkdir(dirname(output), { recursive: true });
  await Bun.write(output, `${JSON.stringify(report, null, 2)}\n`);
});
if (!saved.success) {
  console.error(`Could not write report: ${saved.error}`);
  process.exit(1);
}
console.log(
  `${report.checked.length} checked; ${report.notChecked.length} not checked; ${report.findings.length} warnings; ${report.errors.length} errors. Report: ${output}`,
);
process.exitCode =
  report.errors.length > 0 || (options.strict && report.findings.length > 0)
    ? 1
    : 0;
