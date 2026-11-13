#!/usr/bin/env node
import * as Files from "node:fs/promises";
import * as Module from "node:module";
import * as Os from "node:os";
import * as Path from "node:path";
import * as Url from "node:url";
import { parseArgs } from "node:util";
import { resultify } from "@zenncore/utils";
import * as Capture from "./review-pack/capture.mjs";
import * as Interactions from "./review-pack/interactions.mjs";
import * as Report from "./review-pack/report.mjs";
import * as Routes from "./review-pack/routes.mjs";

const project = Path.resolve(
  Path.dirname(Url.fileURLToPath(import.meta.url)),
  "../../..",
);

export const dependency = async (name, directories) => {
  const candidates = [
    Path.join(project, "apps/web/package.json"),
    ...directories.map((directory) =>
      Path.join(Path.resolve(directory), "package.json"),
    ),
  ];
  for (const candidate of candidates) {
    const resolution = await resultify(() =>
      Module.createRequire(candidate).resolve(name),
    );
    if (resolution.success) return resolution.data;
  }
  return null;
};

const atomic = async (file, value) => {
  await Files.writeFile(`${file}.pending`, JSON.stringify(value, null, 2));
  await Files.rename(`${file}.pending`, file);
};

const persist = (output, manifest) =>
  atomic(Path.join(output, "manifest.json"), manifest);

const buildId = async () => {
  const file = await resultify(() =>
    Files.readFile(Path.join(project, "apps/web/.next/BUILD_ID"), "utf8"),
  );
  return file.success ? file.data.trim() : null;
};

const compact = (entry) => ({
  ...entry,
  metadata: `metadata/${entry.file.replace(/\.png$/, ".json")}`,
  accessibility: {
    ...entry.accessibility,
    incomplete: entry.accessibility.incomplete?.map((finding) => ({
      id: finding.id,
      impact: finding.impact,
      help: finding.help,
      helpUrl: finding.helpUrl,
      nodeCount: finding.nodes?.length ?? finding.nodeCount,
    })),
  },
});

const capture = async ({
  routes,
  browsers,
  devices,
  manifest,
  output,
  sharp,
  axe,
  concurrency,
}) => {
  const saving = { pending: Promise.resolve() };
  for (const [index, route] of routes.entries()) {
    if (manifest.buildId && manifest.buildId !== (await buildId()))
      throw new Error(
        "The production build changed during capture; start a fresh pack after the server is stable",
      );
    const number = String(index + 1).padStart(2, "0");
    const slug =
      route === "/"
        ? "home"
        : route.replace(/^\//, "").replace(/[^a-z0-9-]+/gi, "-");
    const review = async (mode) => {
      if (
        manifest.entries.some(
          (entry) => entry.route === route && entry.mode === mode,
        )
      )
        return;
      console.log(`${number} ${route} ${mode}: opening`);
      const context = await browsers[mode].newContext({
        ...devices[mode],
        reducedMotion: "reduce",
        locale: Routes.browserLocale(route),
      });
      const page = await context.newPage();
      page.setDefaultTimeout(20000);
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const captured = await resultify(async () => {
        const response = await page.goto(new URL(route, manifest.base).href, {
          waitUntil: "domcontentloaded",
          timeout: 60000,
        });
        console.log(`${number} ${route} ${mode}: loading fonts and images`);
        const readiness = await Capture.prepare(page);
        const metadata = await Capture.inspect(page);
        console.log(`${number} ${route} ${mode}: axe audit`);
        const accessibility = await Capture.audit(page, axe);
        const file = `${number}-${slug}--${mode}.png`;
        console.log(`${number} ${route} ${mode}: screenshot`);
        const image = await Capture.screenshot(
          page,
          sharp,
          Path.join(output, "screens", file),
        );
        const verification = await sharp(Path.join(output, "screens", file), {
          limitInputPixels: image.width * image.height,
        }).metadata();
        if (
          verification.width !== image.width ||
          verification.height !== image.height
        )
          throw new Error(`Screenshot geometry mismatch for ${file}`);
        const entry = {
          captured: new Date().toISOString(),
          number,
          route,
          mode,
          file,
          status: response?.status(),
          device: devices[mode],
          image,
          errors,
          readiness,
          ...metadata,
          accessibility,
        };
        await atomic(
          Path.join(output, "metadata", `${number}-${slug}--${mode}.json`),
          entry,
        );
        manifest.entries.push(compact(entry));
        saving.pending = saving.pending.then(() => persist(output, manifest));
        await saving.pending;
        console.log(
          `${number} ${route} ${mode}: ${image.width}×${image.height}; overflow=${metadata.overflow}; broken=${metadata.images.broken.length}; axe=${accessibility.violations?.length ?? "unavailable"}`,
        );
      });
      await context.close();
      if (!captured.success) throw captured.error;
    };
    const results =
      concurrency === 1
        ? [
            await resultify(() => review("desktop")),
            await resultify(() => review("mobile")),
          ]
        : await Promise.all(
            ["desktop", "mobile"].map((mode) => resultify(() => review(mode))),
          );
    const failed = results.find((result) => !result.success);
    if (failed) throw failed.error;
  }
};

export const run = async () => {
  const { values } = parseArgs({
    options: {
      routes: { type: "string" },
      output: { type: "string" },
      "base-url": { type: "string", default: "http://localhost:3000" },
      modules: { type: "string", multiple: true, default: [] },
      "review-root": {
        type: "string",
        default: Path.join(
          Os.homedir(),
          "Documents/Codex/2026-11-05/hey/review",
        ),
      },
      date: { type: "string", default: "2026-11-10" },
      baseline: { type: "string" },
      notes: { type: "string" },
      "commit-base": { type: "string" },
      concurrency: { type: "string", default: "2" },
      pdfunite: { type: "string", default: "pdfunite" },
      "reports-only": { type: "boolean", default: false },
      "skip-menus": { type: "boolean", default: false },
      "list-routes": { type: "boolean", default: false },
      resume: { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
  });
  if (values.help) {
    console.log(`Usage: node apps/web/scripts/review-pack.mjs [options]
  --base-url URL       Running local production site (default http://localhost:3000)
  --routes /,/platform Optional comma-separated subset; default sitemap + route table
  --output PATH        Explicit fresh destination (otherwise versioned hey/review folder)
  --modules PATH       Tooling node_modules directory; repeatable
  --baseline PATH      Add computed geometry/style comparison with an earlier pack
  --notes PATH         Include a supplied design-exceptions Markdown file
  --commit-base REF    CHANGES.md starts after this ref (default branch merge-base)
  --concurrency 1|2    Concurrent desktop/mobile views (default 2; bounded per route)
  --pdfunite PATH      Poppler PDF merger for packs over 12 screenshots
  --skip-menus         Omit the supplemental menu/form captures for focused comparisons
  --resume             Continue an interrupted explicit output; only with unchanged source
  --reports-only       Rebuild reports from an existing --output without recapturing pages
  --list-routes        Print the resolved route list without opening browsers
  --review-root PATH   Parent for versioned full packs
  --date YYYY-MM-DD    Full-pack folder date (default 2026-11-10)
Dependencies: playwright, sharp, pdf-lib, axe-core. Set REVIEW_PACK_NODE_MODULES or --modules if not installed in the app. Install Playwright Chromium and WebKit using the matching Playwright CLI. This script does not build, restart a server, authenticate or submit forms.`);
    return;
  }
  const concurrency = Number(values.concurrency);
  if (![1, 2].includes(concurrency))
    throw new Error("--concurrency must be 1 or 2");
  if ((values.resume || values["reports-only"]) && !values.output)
    throw new Error("--resume and --reports-only require an explicit --output");
  const recorded =
    values["reports-only"] || values.resume
      ? JSON.parse(
          await Files.readFile(
            Path.join(Path.resolve(values.output), "manifest.json"),
            "utf8",
          ),
        )
      : null;
  const routes =
    recorded && !values.routes
      ? (recorded.routes ?? [
          ...new Set(recorded.entries.map((entry) => entry.route)),
        ])
      : await Routes.collect({
          project,
          base: values["base-url"],
          subset: values.routes,
        });
  for (const route of routes)
    if (!Routes.allowed(route))
      throw new Error(`Review routes must be public local paths: ${route}`);
  if (values["list-routes"]) {
    console.log(JSON.stringify(routes, null, 2));
    return;
  }
  const output = values.output
    ? Path.resolve(values.output)
    : await Routes.directory(values["review-root"], values.date);
  const exists = await resultify(() => Files.stat(output));
  if (exists.success && !values.resume && !values["reports-only"])
    throw new Error(
      `Review folder already exists; choose a fresh --output: ${output}`,
    );
  if (!exists.success && values["reports-only"])
    throw new Error(`No existing pack at ${output}`);
  const directories = [
    ...values.modules,
    // biome-ignore lint/suspicious/noUndeclaredEnvVars: This standalone review command is not a cached Turborepo task.
    ...(process.env.REVIEW_PACK_NODE_MODULES?.split(Path.delimiter).filter(
      Boolean,
    ) ?? []),
    Path.join(
      Os.homedir(),
      ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules",
    ),
  ];
  const locations = Object.fromEntries(
    await Promise.all(
      ["playwright", "sharp", "pdf-lib", "axe-core/axe.min.js"].map(
        async (name) => [name, await dependency(name, directories)],
      ),
    ),
  );
  for (const name of ["playwright", "sharp", "pdf-lib", "axe-core/axe.min.js"])
    if (!locations[name])
      throw new Error(
        `Missing ${name}. Install it in a tooling directory and pass --modules <directory>/node_modules.`,
      );
  const { default: playwright } = await import(
    Url.pathToFileURL(locations.playwright).href
  );
  const { default: sharp } = await import(
    Url.pathToFileURL(locations.sharp).href
  );
  sharp.cache({ memory: 64, files: 16, items: 50 });
  sharp.concurrency(2);
  const { default: library } = await import(
    Url.pathToFileURL(locations["pdf-lib"]).href
  );
  await Files.mkdir(Path.join(output, "screens"), { recursive: true });
  await Files.mkdir(Path.join(output, "metadata"), { recursive: true });
  const previous = await resultify(() =>
    Files.readFile(Path.join(output, "manifest.json"), "utf8"),
  );
  const manifest =
    (values.resume || values["reports-only"]) && previous.success
      ? JSON.parse(previous.data)
      : {
          generated: new Date().toISOString(),
          routes,
          expectedInteractions: values["skip-menus"]
            ? 0
            : Interactions.files.length,
          buildId: await buildId(),
          base: values["base-url"],
          dependencies: locations,
          entries: [],
        };
  if (values.resume && manifest.base !== values["base-url"])
    throw new Error(
      "An interrupted pack must resume against the same base URL",
    );
  if (
    values.resume &&
    manifest.buildId &&
    manifest.buildId !== (await buildId())
  )
    throw new Error(
      "Cannot resume against a different production build; use a fresh output folder",
    );
  if (
    values.resume &&
    manifest.routes &&
    JSON.stringify(manifest.routes) !== JSON.stringify(routes)
  )
    throw new Error("An interrupted pack must resume with the same route list");
  if (values.resume) {
    const metadata = await Files.readdir(Path.join(output, "metadata"));
    for (const name of metadata.filter((name) => name.endsWith(".json"))) {
      const entry = JSON.parse(
        await Files.readFile(Path.join(output, "metadata", name), "utf8"),
      );
      if (
        routes.includes(entry.route) &&
        !manifest.entries.some(
          (record) =>
            record.route === entry.route && record.mode === entry.mode,
        )
      )
        manifest.entries.push(compact(entry));
    }
  }
  if (!values["reports-only"]) await persist(output, manifest);
  const devices = {
    desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 },
    mobile: playwright.devices["iPhone 14"],
  };
  const browsers = {
    desktop: await playwright.chromium.launch({ headless: true }),
    mobile: await playwright.webkit.launch({ headless: true }),
  };
  const session = await resultify(async () => {
    if (!values["reports-only"])
      await capture({
        routes,
        browsers,
        devices,
        manifest,
        output,
        sharp,
        axe: locations["axe-core/axe.min.js"],
        concurrency,
      });
    const intended = manifest.routes ?? routes;
    const missing = intended.flatMap((route) =>
      ["desktop", "mobile"]
        .filter(
          (mode) =>
            !manifest.entries.some(
              (entry) => entry.route === route && entry.mode === mode,
            ),
        )
        .map((mode) => `${route} ${mode}`),
    );
    if (missing.length)
      throw new Error(`Review pack is incomplete: ${missing.join(", ")}`);
    const previousMenus = await resultify(() =>
      Files.readFile(Path.join(output, "menus.json"), "utf8"),
    );
    const expectedInteractions =
      manifest.expectedInteractions ??
      (values["reports-only"]
        ? previousMenus.success
          ? Interactions.files.length
          : 0
        : values["skip-menus"]
          ? 0
          : Interactions.files.length);
    if (values.resume && values["skip-menus"] && expectedInteractions)
      throw new Error(
        "Cannot omit the interaction captures required by the original pack",
      );
    const menus =
      values["reports-only"] || !expectedInteractions
        ? previousMenus.success
          ? JSON.parse(previousMenus.data)
          : []
        : await Interactions.capture({
            browsers,
            devices,
            base: manifest.base,
            output,
          });
    if (expectedInteractions) await Interactions.validate(menus, output);
    const notes = values.notes
      ? [await Files.readFile(Path.resolve(values.notes), "utf8")]
      : [];
    const summary = await Report.write({
      project,
      output,
      entries: manifest.entries,
      menus,
      library,
      sharp,
      baseline: values.baseline ? Path.resolve(values.baseline) : null,
      notes,
      commits: values["commit-base"],
      merger: values.pdfunite,
    });
    const context = await browsers.desktop.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const index = await context.newPage();
    await index.goto(Url.pathToFileURL(Path.join(output, "index.html")).href);
    await index.evaluate(async () => {
      for (const image of document.images) image.loading = "eager";
      await Promise.all(
        Array.from(document.images).map((image) =>
          image.decode().catch(() => null),
        ),
      );
    });
    const verification = await index.evaluate(() => ({
      cards: document.querySelectorAll("article").length,
      images: document.images.length,
      broken: Array.from(document.images)
        .filter((image) => !image.naturalWidth)
        .map((image) => image.src),
    }));
    await index.screenshot({ path: Path.join(output, "index-preview.png") });
    await Files.writeFile(
      Path.join(output, "verification.json"),
      JSON.stringify({ ...summary, index: verification }, null, 2),
    );
    await context.close();
    if (verification.cards !== summary.routes || verification.broken.length)
      throw new Error("Review index is incomplete; see verification.json");
    console.log(
      `Review pack ready: ${output}\n${summary.routes} routes; ${summary.screenshots} screenshots; ${summary.todos} distinct open inputs; ${summary.serious} serious/critical axe rule findings.`,
    );
  });
  await Promise.all(Object.values(browsers).map((browser) => browser.close()));
  if (!session.success) throw session.error;
};

const execution = await resultify(run);
if (!execution.success) {
  console.error(execution.error);
  process.exitCode = 1;
}
