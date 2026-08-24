import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/**
 * Static analysis behind `i18n/client-messages.ts`.
 *
 * The client message payload is pruned per route scope, and a namespace that a
 * client component needs but its scope does not declare fails at runtime — a
 * `useMessages()` read of a pruned branch throws. This module recomputes what
 * each scope actually needs by walking the import graph from its entry files,
 * so the test can diff the computed set against the declared one and fail with
 * the exact missing namespace instead of a production stack trace.
 *
 * It reads the filesystem, so it is test-only. Nothing in the app bundle
 * imports it.
 */

const EXTENSIONS = [".tsx", ".ts", ".jsx", ".js"] as const;

const resolveModule = (specifier: string, from: string, root: string) => {
  const base = specifier.startsWith("@/")
    ? join(root, specifier.slice(2))
    : specifier.startsWith(".")
      ? resolve(dirname(from), specifier)
      : null;

  if (!base) return null;

  for (const extension of EXTENSIONS) {
    const candidate = `${base}${extension}`;
    if (existsSync(candidate)) return candidate;
  }

  for (const extension of EXTENSIONS) {
    const candidate = join(base, `index${extension}`);
    if (existsSync(candidate)) return candidate;
  }

  return existsSync(base) && statSync(base).isFile() ? base : null;
};

const IMPORT = /(?:from|import)\s*\(?\s*["'`]([^"'`]+)["'`]/g;
const NAMESPACE = /useTranslations\(\s*["'`]([^"'`]+)["'`]/g;
/** `useMessages()` followed by a `messages.<namespace>` read. */
const MESSAGES_READ = /\bmessages(?:Catalog)?\s*\.\s*([A-Za-z_$][\w$]*)/g;

/**
 * Member names that are JavaScript, not message namespaces —
 * `messagesCatalog.filter(...)` is an array call, not a `filter` namespace.
 */
const BUILT_IN = new Set([
  "at",
  "concat",
  "entries",
  "every",
  "filter",
  "find",
  "findIndex",
  "flat",
  "flatMap",
  "forEach",
  "includes",
  "indexOf",
  "join",
  "keys",
  "length",
  "map",
  "pop",
  "push",
  "reduce",
  "reverse",
  "shift",
  "slice",
  "some",
  "sort",
  "splice",
  "toString",
  "unshift",
  "values",
]);

const isClient = (source: string) => /^\s*["']use client["']/m.test(source);

/**
 * Message paths a single client module reads, as dotted namespace paths.
 *
 * `useTranslations("dashboard.grid")` yields the exact path, so a marketing
 * page that imports one shared dashboard component ships that component's
 * sub-tree instead of the entire 74KB `dashboard` namespace.
 *
 * `useMessages()` is deliberately coarser: it yields only the top-level
 * segment, so the whole sub-tree ships. A `useMessages()` read walks the object
 * directly and would throw on a pruned branch, and a regex cannot prove which
 * branches a later expression touches — so the safe over-approximation is the
 * right answer, not the tight one.
 *
 * Only string literals are read. A computed namespace would be invisible here,
 * which is why the accompanying test forbids one.
 */
export const namespacesIn = (source: string) => {
  const found = new Set<string>();

  for (const [, namespace] of source.matchAll(NAMESPACE))
    if (namespace) found.add(namespace);

  if (/useMessages\(\)/.test(source))
    for (const [, namespace] of source.matchAll(MESSAGES_READ))
      if (namespace && !BUILT_IN.has(namespace)) found.add(namespace);

  return found;
};

/**
 * Every message path reachable from `entries`, following relative and `@/`
 * imports. Server components are traversed but contribute nothing — only a
 * client module's reads end up in the payload.
 *
 * The walk follows every import, including ones that are only used on a code
 * path this route never renders. That over-approximates, which is the correct
 * direction to be wrong in: a declared namespace that is never read costs
 * bytes, and an undeclared one that is read is a runtime failure.
 */
export const namespacesReachableFrom = (
  entries: readonly string[],
  root: string,
) => {
  const seen = new Set<string>();
  const namespaces = new Set<string>();
  const queue = [...entries];

  for (const file of queue) {
    if (seen.has(file)) continue;
    seen.add(file);

    const source = readFileSync(file, "utf8");
    if (isClient(source))
      for (const namespace of namespacesIn(source)) namespaces.add(namespace);

    for (const [, specifier] of source.matchAll(IMPORT)) {
      if (!specifier) continue;
      const resolved = resolveModule(specifier, file, root);
      // Pushing onto the array being iterated is deliberate: `for…of` reads the
      // live length, so newly discovered modules are visited in the same pass.
      if (resolved && !seen.has(resolved)) queue.push(resolved);
    }
  }

  return namespaces;
};

/**
 * Modules a client component reaches whose namespace list is computed
 * dynamically. Any hit is a defect: the payload cannot be pruned safely if a
 * namespace is not visible in the source.
 */
export const DYNAMIC_NAMESPACE_PATTERN = /useTranslations\(\s*[^\s"'`)]/;

/**
 * `useMessages()` reads this scanner cannot follow: a bracket index, a
 * destructure, or an alias handed to another module. Each would hide which
 * branch of the catalog a component touches, and a pruned branch throws on
 * access rather than degrading — so these patterns are forbidden outright
 * instead of guessed at.
 */
export const OPAQUE_MESSAGES_PATTERN =
  /(?:const\s*\{[^}]*\}\s*=\s*useMessages\(\))|(?:\bmessages(?:Catalog)?\s*\[)/;
