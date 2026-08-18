import type {
  DiscoveryModelResult,
  DiscoveryQueryResult,
  DiscoveryRunResult,
} from "./discovery-run";

/**
 * Access code + Markdown rendering for the headless `/api/dev/discovery`
 * endpoint, which serves the same report the `/dev/discovery` page renders to
 * an AI platform that can only fetch a URL.
 */

// Deliberately a single shared code rather than per-caller credentials: the
// endpoint is a manual research lane, the code is pasted into a chat by hand,
// and it is swapped without a deploy through DEV_DISCOVERY_TOKEN. Replace this
// with real per-agent keys (schema.agentApiKey) before it serves anyone but us.
//
// The literal below is a development convenience, never a production
// credential: it lives in the repository, so anyone reading it could spend the
// AI budget. Deployed environments have no fallback — `null` means the endpoint
// refuses every request until DEV_DISCOVERY_TOKEN is set.
const DEVELOPMENT_ACCESS_CODE = "ecentic-discovery-dev";

export const accessCode = (): string | null =>
  process.env.DEV_DISCOVERY_TOKEN?.trim() ||
  (process.env.NODE_ENV === "production" ? null : DEVELOPMENT_ACCESS_CODE);

/**
 * True when any of the places a caller can carry the code holds the right one.
 * Every candidate is tried rather than the first one present: chat platforms
 * attach their own `Authorization` header freely, and a correct `?code=` should
 * not be shadowed by one.
 */
export const isAuthorized = (
  candidates: readonly (string | null | undefined)[],
): boolean => {
  const code = accessCode();

  return (
    code !== null &&
    candidates.some(
      (candidate) => typeof candidate === "string" && candidate.trim() === code,
    )
  );
};

// Model prose lands inside list items and table cells, so anything that would
// break out of the row — newlines, stray pipes — is flattened rather than
// trusted to render.
const flatten = (value: string): string =>
  value.replace(/\s+/g, " ").trim() || "—";

const cell = (value: string): string => flatten(value).replace(/\|/g, "\\|");

const rankLabel = (result: DiscoveryModelResult): string => {
  switch (true) {
    case result.status === "error":
      return "error";
    case result.targetRank === null:
      return "not recommended";
    default:
      return `#${result.targetRank} of ${result.stores.length}`;
  }
};

const storeList = (result: DiscoveryModelResult): string => {
  if (result.stores.length === 0) return "_No stores returned._";

  return result.stores
    .map((store, index) => {
      const domain = store.domain ? ` (${flatten(store.domain)})` : "";
      const target = store.isTarget ? " — **TARGET STORE**" : "";
      return `${index + 1}. **${flatten(store.name)}**${domain}${target} — ${flatten(store.reason)}`;
    })
    .join("\n");
};

const modelSection = (result: DiscoveryModelResult): string => {
  const heading = `### ${result.modelLabel} — ${rankLabel(result)}`;

  if (result.status === "error")
    return `${heading}\n\nThis agent failed to answer: ${flatten(result.error ?? "unreachable")}`;

  const verdict = result.targetIncluded
    ? "Why it ranks where it does"
    : "Why it was left out";

  return `${heading}\n\n**${verdict}:** ${flatten(result.targetReason)}\n\n${storeList(result)}`;
};

const querySection = (result: DiscoveryQueryResult, index: number): string =>
  [
    `## Query ${index + 1} — "${flatten(result.query)}"`,
    ...result.models.map(modelSection),
  ].join("\n\n");

const summaryTable = (report: DiscoveryRunResult): string => {
  const labels =
    report.queries[0]?.models.map((model) => model.modelLabel) ?? [];
  if (labels.length === 0) return "";

  const rows = report.queries.map(
    (query) =>
      `| ${cell(query.query)} | ${query.models.map((model) => rankLabel(model)).join(" | ")} |`,
  );

  return [
    `| Query | ${labels.map(cell).join(" | ")} |`,
    `| --- | ${labels.map(() => "---").join(" | ")} |`,
    ...rows,
  ].join("\n");
};

/**
 * The run rendered as a self-contained Markdown briefing: headline numbers
 * first, then a rank matrix, then each agent's ranked shelf and its verdict on
 * the target store.
 */
export const toMarkdown = (report: DiscoveryRunResult): string => {
  const runs = report.queries.flatMap((query) => query.models);
  const answered = runs.filter((run) => run.status === "ok");
  const recommended = answered.filter((run) => run.targetRank !== null);
  const ranks = recommended.map((run) => run.targetRank ?? 0);
  const averageRank =
    ranks.length > 0
      ? (ranks.reduce((total, rank) => total + rank, 0) / ranks.length).toFixed(
          1,
        )
      : null;
  const share =
    answered.length > 0
      ? Math.round((recommended.length / answered.length) * 100)
      : 0;

  const headline = [
    `# AI Discovery report — ${flatten(report.targetStore)}`,
    "",
    `- Target store: \`${flatten(report.targetStore)}\``,
    `- Shopping queries: ${report.queries.length}`,
    `- AI agents per query: ${report.totalModels}`,
    `- Agent runs: ${runs.length} (${answered.length} answered, ${runs.length - answered.length} failed)`,
    `- Recommended the target: ${recommended.length} of ${answered.length} answered runs (${share}%)`,
    `- Average rank when recommended: ${averageRank ?? "n/a"}`,
    `- Generated: ${new Date().toISOString()}`,
  ].join("\n");

  const table = summaryTable(report);

  return [
    headline,
    ...(table ? [`## Rank summary\n\n${table}`] : []),
    ...report.queries.map(querySection),
  ]
    .join("\n\n")
    .concat("\n");
};
