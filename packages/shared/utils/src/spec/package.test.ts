import { describe, expect, test } from "bun:test";

type Manifest = {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

const root = new URL("../..", import.meta.url);
const manifest: Manifest = await Bun.file(new URL("package.json", root)).json();

/** `@scope/name/sub/path` → `@scope/name`; `name/sub/path` → `name`. */
const packageName = (specifier: string) =>
  specifier
    .split("/")
    .slice(0, specifier.startsWith("@") ? 2 : 1)
    .join("/");

// Every bare import in the published sources survives into `dist/` (they are
// all kept external), so a consumer's production install has to bring it.
const imported = await (async () => {
  const sources = new Bun.Glob("src/**/*.{ts,tsx}");
  const names = new Set<string>();
  for await (const path of sources.scan({ cwd: root.pathname })) {
    if (path.startsWith("src/spec/")) continue;
    const source = await Bun.file(new URL(path, root)).text();
    const specifiers = source.matchAll(/\bfrom\s+["']([^"'.][^"']*)["']/g);
    for (const [, specifier] of specifiers)
      if (specifier) names.add(packageName(specifier));
  }
  return [...names].sort();
})();

describe("package manifest", () => {
  test("finds the imports it checks", () => {
    expect(imported).toContain("type-fest");
    expect(imported).toContain("react");
  });

  test("every imported package is a dependency or a peer dependency", () => {
    const installed = new Set([
      ...Object.keys(manifest.dependencies ?? {}),
      ...Object.keys(manifest.peerDependencies ?? {}),
    ]);

    expect(imported.filter((name) => !installed.has(name))).toEqual([]);
  });
});
