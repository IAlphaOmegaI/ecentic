import { resultify } from "@zenncore/utils";
import type { Outcome, Report } from "@/lib/webmcp";
import { ResponseTooLargeError } from "./error";
import * as HTTP from "./http";
import { buildAudit } from "./webmcp-audit";
import { HTML_LIMIT_BYTES, SCRIPT_LIMIT_BYTES } from "./webmcp-limits";
import { discoverModules } from "./webmcp-modules";
import { inspectHtml, inspectScript } from "./webmcp-source";

const MAX_PAGES = 3;
const MAX_SCRIPTS = 12;
const MAX_MODULE_DEPTH = 3;
const TIMEOUT_MS = 6000;
const DEADLINE_MS = 20000;

/** Keep the path: WebMCP belongs to a document, not a host-wide manifest. */
export const normalizeScanUrl = (input: string): string | null => {
  const value = input.trim();
  if (!value || value.length > 2048) return null;
  const parsed = resultify(
    () =>
      new URL(/^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`),
  );
  if (!parsed.success) return null;
  const url = parsed.data;
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password) return null;
  if (
    process.env.NODE_ENV === "production" &&
    (url.protocol !== "https:" || url.port !== "")
  )
    return null;
  url.hash = "";
  return url.toString();
};

/** Follow only linked browsing pages, never cart/account/action URLs or queries. */
const catalogLinks = (links: string[], page: string) =>
  [...new Set(links)].flatMap((link) => {
    const normalized = normalizeScanUrl(link);
    if (!normalized || normalized === page) return [];
    const url = new URL(normalized);
    if (url.origin !== new URL(page).origin || url.search) return [];
    if (
      !/\/(products?|collections?|product-category|shop|catalog|search)(\/|$)/i.test(
        url.pathname,
      )
    )
      return [];
    if (
      /\/(cart|checkout|account|orders?|login|logout|remove|delete|add)(\/|$)/i.test(
        url.pathname,
      )
    )
      return [];
    return [normalized];
  });

const isProductPage = (url: string) =>
  /\/products?\/[^/]+/i.test(new URL(url).pathname);

const isHtml = (page: HTTP.Page) =>
  page.status >= 200 &&
  page.status < 300 &&
  /^(text\/html|application\/xhtml\+xml)(;|$)/i.test(
    page.headers.get("content-type")?.trim() ?? "",
  );

const isScript = (page: HTTP.Page) =>
  page.status >= 200 &&
  page.status < 300 &&
  /^(text\/(javascript|ecmascript|plain)|application\/(javascript|ecmascript|x-javascript|octet-stream))(;|$)/i.test(
    page.headers.get("content-type")?.trim() ?? "",
  );

type ScriptContext = { pageUrl: string; baseUrl: string };
type ScriptReference = {
  url: string;
  contexts: Map<string, ScriptContext>;
  depth: number;
  priority: number;
};

/**
 * Bounded, read-only evidence collection. The injected reader keeps transport
 * tests deterministic; production always uses HTTP.page's per-hop SSRF guard,
 * body byte limit, and deadline. No browser, eval, form submit or tool execution.
 */
export const scanWebsite = async (
  input: string,
  { read = HTTP.page }: { read?: typeof HTTP.page } = {},
): Promise<Outcome> => {
  const url = normalizeScanUrl(input);
  if (!url) return { kind: "invalid" };
  const deadline = Date.now() + DEADLINE_MS;
  const timeout = () =>
    Math.max(1, Math.min(TIMEOUT_MS, deadline - Date.now()));
  const home = await read(url, {
    timeout: timeout(),
    limit: HTML_LIMIT_BYTES,
    accept: "text/html,application/xhtml+xml",
  });
  if (!home.success)
    return {
      kind:
        home.error.name === ResponseTooLargeError.errorName
          ? "tooLarge"
          : "unreachable",
    };
  if (!isHtml(home.data)) return { kind: "unreachable" };

  const initial = inspectHtml(home.data.body, home.data.url);
  const links = catalogLinks(initial.links, home.data.url);
  const candidates = new Set(links);
  const readLinked = async (target: string) => {
    const response = await read(target, {
      timeout: timeout(),
      limit: HTML_LIMIT_BYTES,
      accept: "text/html,application/xhtml+xml",
    });
    // A catalog link redirecting away from this storefront is not its evidence.
    if (
      !response.success ||
      !isHtml(response.data) ||
      new URL(response.data.url).origin !== new URL(home.data.url).origin
    )
      return {
        page: {
          url: target,
          status: "unavailable" as const,
          httpStatus: response.success ? response.data.status : null,
        },
        inspection: null,
      };
    return {
      page: {
        url: response.data.url,
        status: "scanned" as const,
        httpStatus: response.data.status,
      },
      inspection: inspectHtml(response.data.body, response.data.url),
    };
  };
  const linked = await (async () => {
    if (!links.length || Date.now() >= deadline) return [];
    const product = links.find(isProductPage);
    const catalog = links.find((link) => !isProductPage(link));
    // Sample distinct shopping contexts instead of spending both slots on menus.
    if (product || isProductPage(home.data.url)) {
      const preferred = isProductPage(home.data.url)
        ? [catalog, product]
        : [product, catalog];
      const selected = [...new Set([...preferred, ...links])].filter(
        (link): link is string => Boolean(link),
      );
      return Promise.all(selected.slice(0, MAX_PAGES - 1).map(readLinked));
    }
    const firstUrl = catalog ?? links[0];
    if (!firstUrl) return [];
    const first = await readLinked(firstUrl);
    // A collection may reveal the first product link that was absent on home.
    const discovered = first.inspection
      ? catalogLinks(first.inspection.links, first.page.url).filter(
          (link) => link !== home.data.url && link !== firstUrl,
        )
      : [];
    for (const link of discovered) candidates.add(link);
    const remaining = [...new Set([...discovered, ...links])].filter(
      (link) => link !== firstUrl && link !== first.page.url,
    );
    const next = remaining.find(isProductPage) ?? remaining[0];
    if (!next || Date.now() >= deadline) return [first];
    return [first, await readLinked(next)];
  })();

  const observations = [
    { pageUrl: home.data.url, inspection: initial },
    ...linked.flatMap(({ page, inspection }) =>
      inspection ? [{ pageUrl: page.url, inspection }] : [],
    ),
  ];
  // Canonical redirects can make several catalog links land on one document.
  const inspected = [
    ...new Map(
      observations.map((observation) => [observation.pageUrl, observation]),
    ).values(),
  ];
  const references = new Map<string, ScriptReference>();
  const pending = new Map<string, ScriptReference>();
  const attempted = new Set<string>();
  const scripts: (ReturnType<typeof inspectScript> | null)[] = [];
  const discovery = { incomplete: false };
  const enqueue = (
    candidate: string,
    context: ScriptContext,
    depth = 0,
    inheritedPriority = 0,
  ) => {
    const normalized = normalizeScanUrl(candidate);
    if (!normalized) {
      discovery.incomplete = true;
      return;
    }
    const existing = references.get(normalized);
    if (existing) {
      if (!existing.contexts.has(context.pageUrl) && attempted.has(normalized))
        discovery.incomplete = true;
      existing.contexts.set(context.pageUrl, context);
      existing.depth = Math.min(existing.depth, depth);
      existing.priority = Math.max(existing.priority, inheritedPriority);
      if (!attempted.has(normalized) && existing.depth <= MAX_MODULE_DEPTH)
        pending.set(normalized, existing);
      return;
    }
    // Bound even the inventory of skipped references on adversarial pages.
    if (references.size >= 512) {
      discovery.incomplete = true;
      return;
    }
    const reference: ScriptReference = {
      url: normalized,
      depth,
      contexts: new Map([[context.pageUrl, context]]),
      priority: Math.max(
        inheritedPriority,
        /webmcp|modelcontext/i.test(normalized) ? 10 : 0,
      ),
    };
    references.set(normalized, reference);
    if (depth <= MAX_MODULE_DEPTH) pending.set(normalized, reference);
  };
  for (const { pageUrl, inspection } of inspected) {
    const context = { pageUrl, baseUrl: inspection.baseUrl };
    for (const script of inspection.scripts) {
      if (script.url) {
        enqueue(script.url, context);
        continue;
      }
      const dependencies = discoverModules(
        script.source,
        context.baseUrl,
        context.baseUrl,
      );
      discovery.incomplete ||= dependencies.incomplete;
      for (const dependency of dependencies.urls) enqueue(dependency, context);
    }
  }
  // Fetch in small batches so imports found in a WebMCP bootstrap can outrank
  // unrelated analytics instead of spending the entire budget on the first page.
  const visitModules = async (): Promise<void> => {
    if (
      !pending.size ||
      attempted.size >= MAX_SCRIPTS ||
      Date.now() >= deadline
    )
      return;
    const batch = [...pending.values()]
      .sort(
        (first, second) =>
          second.priority - first.priority || first.depth - second.depth,
      )
      .slice(0, Math.min(4, MAX_SCRIPTS - attempted.size));
    for (const reference of batch) {
      pending.delete(reference.url);
      attempted.add(reference.url);
    }
    const responses = await Promise.all(
      batch.map(async (reference) => ({
        reference,
        response: await read(reference.url, {
          timeout: timeout(),
          limit: SCRIPT_LIMIT_BYTES,
          accept: "text/javascript,application/javascript;q=0.9,*/*;q=0.1",
        }),
      })),
    );
    for (const { reference, response } of responses) {
      if (!response.success || !isScript(response.data)) {
        scripts.push(null);
        continue;
      }
      const contexts = [...reference.contexts.values()];
      const first = contexts[0];
      if (!first) continue;
      scripts.push(
        inspectScript(response.data.body, response.data.url, first.pageUrl),
      );
      for (const context of contexts) {
        const dependencies = discoverModules(
          response.data.body,
          response.data.url,
          context.baseUrl,
        );
        discovery.incomplete ||= dependencies.incomplete;
        for (const dependency of dependencies.urls)
          enqueue(dependency, context, reference.depth + 1, reference.priority);
      }
    }
    return visitModules();
  };
  await visitModules();

  const evidence = [
    ...inspected.map(({ inspection }) => inspection),
    ...scripts.flatMap((script) => (script ? [script] : [])),
  ];
  // One definition in a shared module is one tool, even when three pages load it.
  const registrations = evidence.flatMap((inspection) => inspection.tools);
  const tools = [
    ...new Map(
      registrations.map((tool) => [
        JSON.stringify([
          tool.kind,
          tool.name,
          tool.description,
          tool.sourceUrl,
          tool.inputNames,
          tool.parameters,
          tool.schemaState,
          tool.execution,
          tool.issues,
        ]),
        tool,
      ]),
    ).values(),
  ];
  const signals = [
    ...new Map(
      evidence
        .flatMap((inspection) => inspection.signals)
        .map((signal) => [
          JSON.stringify([signal.pageUrl, signal.sourceUrl, signal.kind]),
          signal,
        ]),
    ).values(),
  ];
  const failedResources =
    linked.filter(({ inspection }) => !inspection).length +
    scripts.filter((script) => !script).length;
  const skippedScripts = references.size - attempted.size;
  const parseFailures = evidence.reduce(
    (count, inspection) => count + inspection.parseFailures,
    discovery.incomplete ? 1 : 0,
  );
  const limitations: Report["limitations"] = [
    "staticOnly",
    ...(candidates.size > linked.length ? ["pageLimit" as const] : []),
    ...(skippedScripts ? ["scriptLimit" as const] : []),
    ...(failedResources ? ["resourceFailures" as const] : []),
    ...(parseFailures ? ["parseFailures" as const] : []),
  ];
  const forms = inspected.flatMap(({ inspection }) => inspection.forms);
  const pages = [
    ...new Map(
      [
        {
          url: home.data.url,
          status: "scanned" as const,
          httpStatus: home.data.status,
        },
        ...linked.map(({ page }) => page),
      ].map((page) => [page.url, page]),
    ).values(),
  ];
  const audit = buildAudit({
    url: home.data.url,
    tools,
    forms,
    signals,
    limitations,
    registrations,
    pages,
  });
  return {
    kind: "complete",
    report: {
      url: home.data.url,
      scannedAt: new Date().toISOString(),
      status: tools.some((tool) => tool.kind === "declarative")
        ? "markup-found"
        : signals.length || tools.length
          ? "script-signals"
          : "no-evidence",
      coverage: {
        pages: inspected.length,
        scripts:
          scripts.filter(Boolean).length +
          inspected.reduce(
            (count, { inspection }) =>
              count +
              inspection.scripts.filter((script) => script.url === null).length,
            0,
          ),
        skippedScripts,
        failedResources,
      },
      pages,
      tools,
      forms,
      audit,
      signals,
      limitations,
    },
  };
};
