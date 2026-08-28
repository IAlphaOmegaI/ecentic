import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  CLIENT_MESSAGES,
  type MessageScope,
  pickMessages,
} from "../client-messages";
import {
  DYNAMIC_NAMESPACE_PATTERN,
  namespacesReachableFrom,
  OPAQUE_MESSAGES_PATTERN,
} from "../message-scope";

const ROOT = join(import.meta.dir, "../..");
const APP = join(ROOT, "app/[locale]");
const CATALOG = JSON.parse(
  readFileSync(join(ROOT, "../messages/en.json"), "utf8"),
) as Record<string, unknown>;

const entriesUnder = (directory: string, exclude: readonly string[] = []) => {
  const found: string[] = [];

  const walk = (current: string) => {
    for (const entry of readdirSync(current)) {
      const path = join(current, entry);
      if (exclude.some((skipped) => path.startsWith(skipped))) continue;
      if (statSync(path).isDirectory()) {
        walk(path);
        continue;
      }
      if (
        /(page|layout|template|default|error|loading|not-found)\.tsx$/.test(
          entry,
        )
      )
        found.push(path);
    }
  };

  walk(directory);
  return found;
};

const read = (path: string) =>
  path
    .split(".")
    .reduce<unknown>(
      (node, key) => (node as Record<string, unknown> | undefined)?.[key],
      CATALOG,
    );

/**
 * A scope covers a path when it declares the path itself or any prefix of it —
 * declaring `dashboard` covers `dashboard.grid`.
 */
const covers = (scope: MessageScope, path: string) =>
  CLIENT_MESSAGES[scope].some(
    (declared) => declared === path || path.startsWith(`${declared}.`),
  );

/**
 * Route scopes, paired with the entry files whose import graph feeds them. The
 * pairing is the contract: whatever those graphs reach, the scope must declare.
 */
const SCOPES: ReadonlyArray<{
  scope: MessageScope;
  entries: readonly string[];
}> = [
  { scope: "root", entries: [join(APP, "layout.tsx")] },
  {
    scope: "home",
    entries: [join(APP, "(main)/page.tsx"), join(APP, "(main)/layout.tsx")],
  },
  { scope: "features", entries: entriesUnder(join(APP, "(main)/features")) },
  { scope: "platforms", entries: entriesUnder(join(APP, "(main)/platforms")) },
  { scope: "pricing", entries: entriesUnder(join(APP, "(main)/pricing")) },
  {
    scope: "ucpValidator",
    entries: entriesUnder(join(APP, "(main)/ucp-validator")),
  },
  {
    scope: "ucpPlayground",
    entries: entriesUnder(join(APP, "(main)/ucp-playground")),
  },
  {
    scope: "deals",
    entries: [
      ...entriesUnder(join(APP, "(main)/yc")),
      ...entriesUnder(join(APP, "(main)/techstars")),
    ],
  },
  { scope: "dev", entries: entriesUnder(join(APP, "(main)/dev")) },
  {
    scope: "dashboard",
    entries: entriesUnder(join(APP, "(main)/dashboard")),
  },
  { scope: "auth", entries: entriesUnder(join(APP, "(auth)")) },
];

/** Marketing routes with no scope of their own — they inherit `marketing`. */
const INHERITS_MARKETING = [
  "blog",
  "compare",
  "demo",
  "docs",
  "enterprise",
  "how-it-works",
  "privacy-policy",
  "resources",
  "support",
  "terms",
];

describe("client message scopes", () => {
  // The whole point of pruning: a namespace a scope's client components read
  // but the scope does not declare is a blank string at best and a thrown
  // `useMessages()` read at worst. This test is what makes the prune safe.
  test.each(SCOPES.map(({ scope, entries }) => [scope, entries] as const))(
    "%s declares every namespace its subtree reads",
    (scope, entries) => {
      const required = [...namespacesReachableFrom(entries, ROOT)];
      const missing = required.filter((path) => !covers(scope, path));

      expect(missing).toEqual([]);
    },
  );

  test("marketing routes without their own scope stay within the baseline", () => {
    const missing = INHERITS_MARKETING.flatMap((route) => {
      const directory = join(APP, "(main)", route);
      const required = [
        ...namespacesReachableFrom(entriesUnder(directory), ROOT),
      ];
      return required
        .filter((path) => !covers("marketing", path))
        .map((path) => `${route}: ${path}`);
    });

    // A new marketing route that needs more than the baseline fails here, and
    // the message names the route and the namespace — the fix is a `layout.tsx`
    // rendering `<ClientMessages scope="…">`.
    expect(missing).toEqual([]);
  });

  test("every declared path exists in the catalog", () => {
    const unknown = Object.entries(CLIENT_MESSAGES).flatMap(([scope, paths]) =>
      paths
        .filter((path) => read(path) === undefined)
        .map((path) => `${scope}: ${path}`),
    );

    expect(unknown).toEqual([]);
  });

  test("no client component reads messages in a way the scanner cannot follow", () => {
    // `messages["dashboard"]`, or a destructure, or handing the object to
    // another module: each hides which branch is touched, and a pruned branch
    // throws on access. The scanner assumes `messages.<name>` and this keeps
    // that assumption true.
    const offenders: string[] = [];

    const walk = (current: string) => {
      for (const entry of readdirSync(current)) {
        const path = join(current, entry);
        if (entry === "node_modules") continue;
        if (statSync(path).isDirectory()) {
          walk(path);
          continue;
        }
        if (!/\.(tsx|ts)$/.test(entry)) continue;
        const source = readFileSync(path, "utf8");
        if (!/^\s*["']use client["']/m.test(source)) continue;
        if (!/useMessages\(\)/.test(source)) continue;
        if (OPAQUE_MESSAGES_PATTERN.test(source))
          offenders.push(path.replace(ROOT, ""));
      }
    };

    walk(join(ROOT, "app"));
    walk(join(ROOT, "components"));

    expect(offenders).toEqual([]);
  });

  test("no client component computes its namespace", () => {
    // `namespacesReachableFrom` only sees string literals. A computed namespace
    // would be invisible to it, and the prune would silently drop the messages
    // that namespace resolves to at runtime.
    const offenders: string[] = [];

    const walk = (current: string) => {
      for (const entry of readdirSync(current)) {
        const path = join(current, entry);
        if (entry === "node_modules") continue;
        if (statSync(path).isDirectory()) {
          walk(path);
          continue;
        }
        if (!/\.(tsx|ts)$/.test(entry)) continue;
        const source = readFileSync(path, "utf8");
        if (!/^\s*["']use client["']/m.test(source)) continue;
        if (DYNAMIC_NAMESPACE_PATTERN.test(source))
          offenders.push(path.replace(ROOT, ""));
      }
    };

    walk(join(ROOT, "app"));
    walk(join(ROOT, "components"));

    expect(offenders).toEqual([]);
  });

  test("the homepage payload stays far below the full catalog", () => {
    const full = JSON.stringify(CATALOG).length;
    const home = JSON.stringify(
      pickMessages(CATALOG, CLIENT_MESSAGES.home),
    ).length;

    // The regression this guards: the homepage used to serialize the entire
    // catalog into its RSC payload, which was half its transferred bytes.
    expect(home).toBeLessThan(full * 0.15);
  });
});

describe("pickMessages", () => {
  // Widened on purpose: `pickMessages` returns the input type, and a literal
  // fixture type would make every expected subset a type error rather than a
  // test.
  const catalog: Record<string, unknown> = {
    home: { hero: { title: "Hi" }, deep: { a: { b: 1 } } },
    dashboard: { grid: { label: "Grid" }, huge: { of: "bytes" } },
    unused: { big: "payload" },
  };

  test("keeps only the declared top-level namespaces", () => {
    expect(pickMessages(catalog, ["home"])).toEqual({
      home: { hero: { title: "Hi" }, deep: { a: { b: 1 } } },
    });
  });

  test("keeps a nested path without its siblings", () => {
    expect(pickMessages(catalog, ["dashboard.grid"])).toEqual({
      dashboard: { grid: { label: "Grid" } },
    });
  });

  test("a declared prefix subsumes a declared child", () => {
    // Order matters without the prefix merge: writing `dashboard.grid` after
    // `dashboard` would replace the whole sub-tree with just `grid`.
    expect(pickMessages(catalog, ["dashboard", "dashboard.grid"])).toEqual({
      dashboard: { grid: { label: "Grid" }, huge: { of: "bytes" } },
    });
    expect(pickMessages(catalog, ["dashboard.grid", "dashboard"])).toEqual({
      dashboard: { grid: { label: "Grid" }, huge: { of: "bytes" } },
    });
  });

  test("a path the catalog does not have is skipped, not thrown", () => {
    expect(pickMessages(catalog, ["home.hero", "gone.missing"])).toEqual({
      home: { hero: { title: "Hi" } },
    });
  });

  test("does not share structure with the source catalog", () => {
    const picked = pickMessages(catalog, ["home.hero"]);
    expect(picked.home).not.toBe(catalog.home);
  });
});
