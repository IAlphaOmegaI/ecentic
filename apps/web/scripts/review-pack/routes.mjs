import * as Files from "node:fs/promises";
import * as Path from "node:path";
import { resultify } from "@zenncore/utils";

const additions = [
  "/research/ai-shopping-simulations",
  "/review-pack-not-found",
  "/es",
  "/es/solutions/enterprise",
  "/es/pricing",
];

export const allowed = (route) =>
  route.startsWith("/") &&
  !route.startsWith("//") &&
  !/^\/(?:es\/)?(?:dashboard|dev|onboarding|sign-in|sign-up|api)(?:\/|$)/.test(
    route,
  );

const sitemap = async (url, visited = new Set()) => {
  if (visited.has(url)) return [];
  visited.add(url);
  const response = await resultify(() =>
    fetch(url, { signal: AbortSignal.timeout(20000) }),
  );
  if (!response.success)
    throw new Error(
      `Sitemap could not be read: ${url}: ${response.error.message}`,
    );
  if (!response.data.ok)
    throw new Error(`Sitemap returned HTTP ${response.data.status}: ${url}`);
  const content = await response.data.text();
  const locations = Array.from(
    content.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g),
  ).map(([, value]) => value.replace(/&amp;/g, "&"));
  if (!locations.length) throw new Error(`Sitemap has no routes: ${url}`);
  if (content.includes("<sitemapindex"))
    return (
      await Promise.all(
        locations.map((location) => {
          const child = new URL(location, url);
          const local = new URL(`${child.pathname}${child.search}`, url);
          return sitemap(local.href, visited);
        }),
      )
    ).flat();
  return locations.map((location) => new URL(location, url).pathname);
};

export const collect = async ({ project, base, subset }) => {
  if (subset)
    return [
      ...new Set(
        subset
          .split(",")
          .map((route) => route.trim())
          .filter(Boolean),
      ),
    ];
  const source = await Files.readFile(
    Path.join(project, "apps/web/src/lib/marketing-routes.ts"),
    "utf8",
  );
  const canonical = Array.from(
    source.matchAll(/path:\s*["']([^"']+)["']/g),
  ).map(([, route]) => route);
  const published = await sitemap(new URL("/sitemap.xml", base).href);
  const spanish = canonical.map((route) =>
    route === "/" ? "/es" : `/es${route}`,
  );
  return [
    ...new Set([
      ...canonical,
      ...additions.filter((route) => !route.startsWith("/es")),
      ...spanish,
      "/es/research/ai-shopping-simulations",
      ...additions,
      ...published,
    ]),
  ].filter(allowed);
};

export const directory = async (root, date, version = 1) => {
  const folder = Path.join(
    root,
    `website-${date}${version > 1 ? `-v${version}` : ""}`,
  );
  const exists = await resultify(() => Files.stat(folder));
  if (!exists.success) return folder;
  return directory(root, date, version + 1);
};
