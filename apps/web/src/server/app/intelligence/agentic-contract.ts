/**
 * Wire contract for is-agentic.com — Vercel Labs' agent-readiness score, whose
 * scan engine is Ora. Two surfaces, deliberately layered by how stable they are:
 *
 * - `GET /api/v1/report` is the documented, versioned, public API. It is the
 *   durable contract, but it only carries the score, three headline buckets and
 *   the *failing* checks — never the full roster.
 * - `GET /api/scan/stream` is the SSE endpoint the official `npx is-agentic`
 *   CLI drives. It always runs a fresh scan and emits every check with its
 *   evidence and fix. It is **not** one of the three surfaces their docs
 *   publish, so nothing here may assume it keeps working: every payload is
 *   parsed leniently, and a shape we no longer recognise degrades to the
 *   documented report instead of breaking the page.
 *
 * Schemas live in this module rather than beside the actions because a
 * `"use server"` file may only export async functions.
 */

import * as z from "zod";

export const IS_AGENTIC_ORIGIN = "https://is-agentic.com";

/** Sent on every request so their logs can attribute the traffic to us. */
export const USER_AGENT = "ecentic-agentic-score/1.0 (+https://ecentic.ai)";

/**
 * A `running` row older than this is a run that died mid-stream — the client
 * navigated away, or the function was killed — not one still in flight.
 */
export const RUNNING_STALE_MS = 5 * 60 * 1000;

/**
 * How long a completed scan is treated as current. The scanner is a free
 * third-party service, so the button re-reads rather than re-scans until this
 * lapses.
 */
export const SCAN_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/**
 * Ceiling on the scan body. `HTTP.request`'s timeout only covers the response
 * headers, so without this a stalled SSE body would hold the action open until
 * the platform killed it.
 */
export const SCAN_DEADLINE_MS = 240_000;

export const LAYER_IDS = [
  "discovery",
  "accessibility",
  "usability",
  "payments",
] as const;

export type LayerId = (typeof LAYER_IDS)[number];

/**
 * The stream's own vocabulary, which is **not** the documented report API's:
 * `/api/v1/report` says `partial`/`failed`, the stream says `warning`/`fail`,
 * and it additionally distinguishes `error` (the check itself blew up) from
 * `fail` (the site does not satisfy it). Both are surfaced as written — telling
 * a merchant they failed a check that actually errored would be a lie.
 *
 * `unknown` is ours: a status they add later lands there rather than being
 * coerced into `na`, which would quietly relabel a real failure as
 * "not applicable".
 */
export const CHECK_STATUSES = [
  "pass",
  "warning",
  "fail",
  "error",
  "na",
  "unknown",
] as const;

export type CheckStatus = (typeof CHECK_STATUSES)[number];

const isCheckStatus = (value: string): value is CheckStatus =>
  (CHECK_STATUSES as readonly string[]).includes(value);

const checkStatusSchema = z
  .string()
  .transform<CheckStatus>((value) =>
    isCheckStatus(value) ? value : "unknown",
  );

const checkSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: checkStatusSchema,
  score: z.number(),
  maxScore: z.number(),
  /** Bonus checks add points but never subtract, so a fail is not a problem. */
  bonus: z.boolean().optional(),
  tier: z.string().optional(),
  maturity: z.string().optional(),
  specUrl: z.string().optional(),
  details: z.string().optional(),
  recommendation: z.string().optional(),
  /** Points the score would gain if this check passed. Ranks the fix list. */
  estScoreGain: z.number().optional(),
});

export type Check = z.infer<typeof checkSchema>;

const layerSchema = z.object({
  id: z.string(),
  name: z.string(),
  score: z.number(),
  maxScore: z.number(),
  checks: z.array(checkSchema),
});

export type Layer = z.infer<typeof layerSchema>;

const topFixSchema = z.object({
  id: z.string(),
  layerId: z.string(),
  name: z.string(),
  estScoreGain: z.number(),
  bonus: z.boolean().optional(),
  recommendation: z.string(),
});

export type TopFix = z.infer<typeof topFixSchema>;

const resultSchema = z.object({
  contractVersion: z.string().optional(),
  domain: z.string().optional(),
  score: z.number(),
  scoreMax: z.number().optional(),
  grade: z.string().optional(),
  ctaMessage: z.string().optional(),
  scannedAt: z.string(),
  durationMs: z.number().optional(),
  finalUrl: z.string().optional(),
  layers: z.array(layerSchema),
  topFixes: z.array(topFixSchema).optional(),
});

/**
 * What we persist: their scan result plus the three things the stream carries
 * outside it — the one-line verdict, the per-check reasons a check does not
 * apply to this site, and the canonical public report to attribute back to.
 */
export type Report = z.infer<typeof resultSchema> & {
  summary: string | null;
  notApplicableReasons: Record<string, string>;
  reportUrl: string;
};

/**
 * The documented `/api/v1/report` shape. Kept separate from {@link Report}
 * because it is a different, much smaller contract — it must never be
 * widened into the rich one by optional fields.
 */
export const slimReportSchema = z.object({
  display_target: z.string(),
  report_url: z.string(),
  score: z.number().nullable(),
  score_label: z.string(),
  scanned_at: z.string(),
  eligible_checks: z.number(),
  score_breakdown: z.object({
    essential: z.object({ earned: z.number(), available: z.number() }),
    recommended: z.object({ earned: z.number(), available: z.number() }),
    bonus: z.object({ points: z.number(), positive_signals: z.number() }),
  }),
  issues: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      tier: z.string(),
      result: z.string(),
      details: z.string().optional(),
      recommendation: z.string().optional(),
    }),
  ),
});

export type SlimReport = z.infer<typeof slimReportSchema>;

/** How long the memoised methodology text is trusted before it is refetched. */
export const METHODOLOGY_TTL_MS = 12 * 60 * 60 * 1000;

/**
 * The `is_agentic_get_methodology` MCP tool. Only the fields we render are
 * declared; the tool also returns a `content[]` copy of the same prose.
 */
export const methodologyToolSchema = z.object({
  result: z
    .object({
      structuredContent: z.object({
        title: z.string(),
        canonical_url: z.string().optional(),
        content: z.string(),
      }),
    })
    .optional(),
  structuredContent: z
    .object({
      title: z.string(),
      canonical_url: z.string().optional(),
      content: z.string(),
    })
    .optional(),
});

export type MethodologyBlock =
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; text: string };

/**
 * Their methodology is plain Markdown — `##` headings and paragraphs, no
 * inline formatting. It is parsed into blocks rather than rendered as HTML:
 * this repo ships no Markdown renderer, and turning third-party prose into
 * markup would be an injection surface for no gain. The `#` title is dropped
 * because the section already carries one.
 */
export const parseMethodology = (markdown: string): MethodologyBlock[] =>
  markdown
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .flatMap<MethodologyBlock>((block) => {
      if (block.startsWith("# ")) return [];
      if (block.startsWith("## "))
        return [{ kind: "heading", text: block.slice(3).trim() }];
      return [{ kind: "paragraph", text: block.replace(/\s+/g, " ") }];
    });

/**
 * Only the stream frames we render. Every other frame type is ignored rather
 * than rejected, so their adding one never interrupts a scan in progress.
 */
export const streamFrameSchema = z.discriminatedUnion("type", [
  // `scan_init` is emitted twice with different shapes — once carrying the full
  // roster, once carrying only a count — so neither field can be required.
  z.object({
    type: z.literal("scan_init"),
    checkRoster: z.array(z.object({ id: z.string() })).optional(),
    totalChecks: z.number().optional(),
  }),
  // Likewise `discovery_phase`: some frames carry only `step`.
  z.object({
    type: z.literal("discovery_phase"),
    step: z.string().optional(),
    label: z.string().optional(),
    stepIndex: z.number().optional(),
    totalSteps: z.number().optional(),
  }),
  z.object({
    type: z.literal("check_complete"),
    checkId: z.string(),
    checkName: z.string(),
    layerName: z.string(),
    status: checkStatusSchema,
  }),
  z.object({
    type: z.literal("relevance_assessed"),
    reasons: z.record(z.string(), z.string()),
  }),
  z.object({ type: z.literal("summary_ready"), agenticSummary: z.string() }),
  z.object({ type: z.literal("scan_complete"), result: resultSchema }),
  z.object({ type: z.literal("error") }),
]);

/** Events the scan action streams to the client. */
export type ScanEvent =
  | { kind: "phase"; label: string }
  | { kind: "roster"; total: number }
  | {
      kind: "check";
      id: string;
      name: string;
      layer: string;
      status: CheckStatus;
      completed: number;
    }
  | { kind: "summary"; summary: string }
  | { kind: "report"; report: Report }
  /** The server declined to start a scan; the client renders the reason. */
  | { kind: "blocked"; reason: "cooldown" | "running"; availableAt: string }
  | { kind: "error"; message: string };

/**
 * The six payment checks are the ones this product exists to fix, so each one
 * points at the ecentic page that fixes it instead of at a spec the merchant
 * would have to implement alone. Segments are relative to the store dashboard.
 */
export const PAYMENT_CHECK_REMEDIES: Record<string, string> = {
  "ucp-support": "/ucp",
  "acp-support": "/ucp",
  "acp-delegate-payment": "/ucp",
  "ap2-support": "/ucp",
  "mpp-support": "/ucp-playground",
  "x402-support": "/ucp-playground",
};

export const LAYER_ORDER: Record<string, number> = {
  payments: 0,
  discovery: 1,
  accessibility: 2,
  usability: 3,
};

/**
 * Layers in merchant-priority order, not the order the scanner emits them:
 * payments is what ecentic sells, and usability is mostly developer-API
 * surface a storefront will never have.
 */
export const orderedLayers = (report: Report): Layer[] =>
  [...report.layers].sort(
    (first, second) =>
      (LAYER_ORDER[first.id] ?? 99) - (LAYER_ORDER[second.id] ?? 99),
  );

/**
 * Applicable checks first, then the ones the scanner ruled out — an N/A check
 * is not a missed check and must not read as one.
 */
export const orderedChecks = (layer: Layer): Check[] =>
  [...layer.checks].sort((first, second) => {
    if ((first.status === "na") !== (second.status === "na"))
      return first.status === "na" ? 1 : -1;
    return (second.estScoreGain ?? 0) - (first.estScoreGain ?? 0);
  });

export type Tally = {
  passed: number;
  warning: number;
  /**
   * `fail` and `error` together — both stand between the store and the points,
   * and the distinction only matters on the check itself.
   */
  failed: number;
  notApplicable: number;
  /** Checks the scanner ruled out are not shortfalls, so they leave this count. */
  applicable: number;
};

export const tally = (checks: readonly Check[]): Tally => {
  const notApplicable = checks.filter((check) => check.status === "na").length;

  return {
    passed: checks.filter((check) => check.status === "pass").length,
    warning: checks.filter((check) => check.status === "warning").length,
    failed: checks.filter(
      (check) => check.status === "fail" || check.status === "error",
    ).length,
    notApplicable,
    applicable: checks.length - notApplicable,
  };
};

/** design.md §4.4 — the shared status scale, not a local one. */
export const scoreTone = (score: number) => {
  switch (true) {
    case score >= 60:
      return "success" as const;
    case score >= 30:
      return "warning" as const;
    default:
      return "error" as const;
  }
};

export const CHECK_TONES = {
  pass: "success",
  warning: "warning",
  fail: "error",
  error: "error",
  na: "neutral",
  unknown: "neutral",
} as const;

/**
 * A real domain name: dot-separated labels ending in an alphabetic TLD. The
 * final-label rule is what rejects bare IP literals — `127.0.0.1` is otherwise
 * a run of labels and dots, and handing a third-party scanner an internal
 * address is not something a competitor URL should be able to ask for.
 */
const HOSTNAME =
  /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.[a-z](?:[a-z0-9-]*[a-z0-9])?$/;

/**
 * The scanner takes a bare host. Two very different things arrive here: a
 * merchant's `store.domain`, which the platform hands us clean, and a
 * competitor's `url`, which is a scraped product link and may be anything at
 * all. Both are run through `URL` rather than a regex so ports, credentials,
 * query strings and unicode hosts are handled, and anything that is not a
 * plausible hostname returns "" for the caller to reject.
 *
 * `www.` is stripped because it is not a distinct storefront: without that,
 * a competitor linked as `www.acme.com` would not match a store whose domain
 * is `acme.com`, and a merchant could end up scanning themselves as a rival.
 */
export const normalizeTarget = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const parsed = ((): URL | null => {
    try {
      return new URL(
        /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
          ? trimmed
          : `https://${trimmed}`,
      );
    } catch {
      return null;
    }
  })();
  if (!parsed) return "";

  const host = parsed.hostname
    .toLowerCase()
    .replace(/\.$/, "")
    .replace(/^www\./, "");
  return HOSTNAME.test(host) ? host : "";
};
