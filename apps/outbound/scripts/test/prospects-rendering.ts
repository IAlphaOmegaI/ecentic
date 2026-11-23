/**
 * Paint regression for the real Prospects list and workspace navigation.
 * Requires an Outbound production build and externally installed Playwright:
 * bun scripts/test/prospects-rendering.ts /absolute/path/to/playwright/index.mjs [chromium-executable]
 * No app session, database, provider requests, or user browser is used.
 */
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const app = resolve(import.meta.dir, "../..");
const root = resolve(app, "../..");
const report = resolve(root, "output/outbound-prospects-rendering");
const [, , modulePath, chromiumExecutable] = process.argv;
assert(modulePath, "Pass the absolute path to an installed Playwright module.");
const playwright = await import(pathToFileURL(modulePath).href);
const react = resolve(app, "node_modules/react/index.js");
const bundle = await Bun.build({
  entrypoints: [resolve(import.meta.dir, "fixtures/prospects-rendering.tsx")],
  target: "browser",
  format: "esm",
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [
    {
      name: "offline-prospects",
      setup(build) {
        build.onResolve({ filter: /^react(?:\/.*)?$/ }, ({ path }) => ({
          path: resolve(
            app,
            "node_modules",
            path === "react" ? "react/index.js" : `${path}.js`,
          ),
        }));
        // Test the source of the fix even when a prior shared-package dist is present.
        build.onResolve(
          { filter: /^@zenncore\/web\/components\/button$/ },
          () => ({
            path: resolve(root, "packages/web/src/components/button.tsx"),
          }),
        );
        build.onResolve({ filter: /^@\/server\// }, ({ path }) => ({
          path,
          namespace: "server",
        }));
        build.onLoad({ filter: /.*/, namespace: "server" }, () => ({
          loader: "js",
          contents: [
            "generateDrafts",
            "importProspects",
            "saveCampaignProspect",
            "saveProspect",
            "prepareBatch",
          ]
            .map(
              (name) =>
                `export const ${name}=async()=>{throw new Error('Network actions forbidden in paint tests')};`,
            )
            .join("\n"),
        }));
        build.onResolve(
          { filter: /^@\/components\/account-control$/ },
          ({ path }) => ({ path, namespace: "account" }),
        );
        build.onLoad({ filter: /.*/, namespace: "account" }, () => ({
          loader: "js",
          contents: `import React from ${JSON.stringify(react)}; export const AccountControl=()=>React.createElement('span',null,'Test staff');`,
        }));
        build.onResolve({ filter: /^@\/i18n\/navigation$/ }, ({ path }) => ({
          path,
          namespace: "navigation",
        }));
        build.onLoad({ filter: /.*/, namespace: "navigation" }, () => ({
          loader: "js",
          contents: `import React from ${JSON.stringify(react)}; export const Link=React.forwardRef(({href,children,prefetch,...props},ref)=>React.createElement('a',{...props,ref,href:typeof href==='string'?href:'#',onClick:e=>e.preventDefault()},children)); export const useRouter=()=>({refresh(){},replace(){},push(){}}); export const usePathname=()=>'/prospects';`,
        }));
        build.onResolve({ filter: /^@\// }, ({ path }) => ({
          path:
            resolve(app, "src", path.slice(2)) +
            (path.endsWith(".json") ? "" : ".ts"),
        }));
      },
    },
  ],
});
assert(bundle.success, bundle.logs.map(String).join("\n"));
const css = Array.from(
  new Bun.Glob("*.css").scanSync(resolve(app, ".next/static/chunks")),
);
assert(
  css.length,
  "Build Outbound before running its production CSS paint test.",
);
await mkdir(report, { recursive: true });
const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/fixture.js") return new Response(bundle.outputs[0]);
    if (path.startsWith("/_next/static/"))
      return new Response(
        Bun.file(resolve(app, ".next/static", path.slice(14))),
      );
    if (path.startsWith("/images/"))
      return new Response(Bun.file(resolve(app, "public", path.slice(1))));
    return new Response(
      `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${css.map((file) => `<link rel="stylesheet" href="/_next/static/chunks/${file}">`).join("")}</head><body class="redhatdisplay_aa7402e-module__aU5JeG__variable superior_1ebc3496-module__euzTUG__variable"><div id="root"></div><script>window.process={env:{}}</script><script type="module" src="/fixture.js"></script></body></html>`,
      { headers: { "content-type": "text/html" } },
    );
  },
});
type PaintRegion = {
  text: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
};
type OfflineRoute = {
  request(): { url(): string };
  continue(): Promise<void>;
  abort(): Promise<void>;
};
const failures: string[] = [];
const results: unknown[] = [];
try {
  for (const engine of ["chromium", "webkit"]) {
    const browser = await playwright[engine].launch({
      headless: true,
      ...(engine === "chromium" && chromiumExecutable
        ? { executablePath: chromiumExecutable }
        : {}),
    });
    try {
      const page = await browser.newPage({
        viewport: { width: 1483, height: 885 },
        deviceScaleFactor: 2,
      });
      page.on("pageerror", (error: Error) =>
        failures.push(`${engine}: ${error.message}`),
      );
      await page.route("**/*", (route: OfflineRoute) =>
        new URL(route.request().url()).hostname === "127.0.0.1"
          ? route.continue()
          : route.abort(),
      );
      await page.goto(server.url.href, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.locator("tbody tr").count(), 50);
      const filters = await page
        .locator('tbody a[href^="/sent"]')
        .evaluateAll((links: Element[]) =>
          links.map((link) => getComputedStyle(link).backdropFilter),
        );
      assert(
        filters.every((filter: string) => filter === "none"),
        "Repeated row actions must not create backdrop-filter compositing layers.",
      );
      for (const top of [0, 1000, 2200, 3500, 0]) {
        await page.evaluate((value: number) => {
          const main = document.querySelector("main");
          if (!main) throw new Error("Workspace missing");
          main.scrollTop = value;
        }, top);
        await page.evaluate(() => new Promise(requestAnimationFrame));
        const areas = await page.evaluate(() => {
          const main = document.querySelector("main")?.getBoundingClientRect();
          if (!main) throw new Error("Workspace missing");
          return Array.from(document.querySelectorAll("tbody tr")).flatMap(
            (row) => {
              const targets = [
                row.querySelector("td:first-child a span span"),
                row.querySelector("td:last-child a"),
              ];
              return targets.flatMap((target) => {
                if (!target) return [];
                const rect = target.getBoundingClientRect();
                if (rect.top < main.top || rect.bottom > innerHeight) return [];
                return [
                  {
                    text: target.textContent,
                    x: rect.x,
                    y: rect.y,
                    width: rect.width,
                    height: rect.height,
                  },
                ];
              });
            },
          );
        });
        assert(
          areas.length >= 6,
          "The paint fixture must cover several visible rows.",
        );
        const png = await page.screenshot({
          path: resolve(report, `${engine}-${top}.png`),
        });
        const blank = await page.evaluate(
          async ({ url, regions }: { url: string; regions: PaintRegion[] }) => {
            const image = new Image();
            image.src = url;
            await image.decode();
            const canvas = document.createElement("canvas");
            canvas.width = image.width;
            canvas.height = image.height;
            const context = canvas.getContext("2d");
            if (!context)
              throw new Error("Canvas unavailable for raster check");
            context.drawImage(image, 0, 0);
            const scale = image.width / innerWidth;
            return regions.filter((region) => {
              const pixels = context.getImageData(
                Math.floor(region.x * scale),
                Math.floor(region.y * scale),
                Math.floor(region.width * scale),
                Math.floor(region.height * scale),
              ).data;
              let ink = 0;
              for (let i = 0; i < pixels.length; i += 4)
                if (
                  (pixels[i] ?? 255) < 160 &&
                  (pixels[i + 1] ?? 255) < 160 &&
                  (pixels[i + 2] ?? 255) < 160
                )
                  ink++;
              return ink < 20;
            });
          },
          {
            url: `data:image/png;base64,${png.toString("base64")}`,
            regions: areas,
          },
        );
        if (blank.length)
          failures.push(
            `${engine} scroll ${top}: missing painted text in ${JSON.stringify(blank)}`,
          );
        results.push({
          engine,
          scrollTop: top,
          visibleTextRegions: areas.length,
          blankTextRegions: blank.length,
        });
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(server.url.href, { waitUntil: "networkidle" });
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth),
        390,
      );
      await page.getByRole("button", { name: "Filters", exact: true }).click();
      await page.getByRole("combobox").first().waitFor();
      await page.evaluate(() =>
        Promise.all(
          document
            .getAnimations()
            .filter(
              (animation) =>
                animation.effect?.getComputedTiming().iterations !==
                Number.POSITIVE_INFINITY,
            )
            .map((animation) => animation.finished.catch(() => undefined)),
        ),
      );
      const popup = await page
        .getByRole("dialog", { name: "Filters", exact: true })
        .evaluate((element: Element) => {
          const bounds = element.getBoundingClientRect();
          return {
            visible: Number(getComputedStyle(element).opacity) === 1,
            contained:
              bounds.left >= 0 &&
              bounds.right <= innerWidth &&
              bounds.top >= 0 &&
              bounds.bottom <= innerHeight,
          };
        });
      assert(
        popup.visible && popup.contained,
        "Mobile filters must finish opening inside the viewport.",
      );
      await page.screenshot({
        path: resolve(report, `${engine}-mobile-filters.png`),
      });
      await page.keyboard.press("Escape");
      results.push({ engine, mobileContained: true, filtersOpened: true });
    } finally {
      await browser.close();
    }
  }
} finally {
  server.stop();
}
await Bun.write(
  resolve(report, "results.json"),
  JSON.stringify({ results, failures }, null, 2),
);
assert.equal(failures.length, 0, failures.join("\n"));
console.log(
  `Prospects paint passed across Chromium/WebKit: ${results.length} checks. ${report}`,
);
