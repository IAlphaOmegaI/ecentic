"use server";

/**
 * Brand visibility analysis: measures how AI engines perceive and discuss the
 * store's brand, instead of scoring individual product matchups. The engine
 * asks ChatGPT to answer 20 realistic shopper queries spread across six
 * visibility dimensions, audits each answer for whether (and how) the brand
 * appears, aggregates the results deterministically, and has the model write
 * the diagnostic narrative from that evidence. ChatGPT is the only engine
 * wired up today; the per-query `model` field keeps room for more.
 */

import { resultify } from "@zenncore/utils";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { schema } from "../../database";
import * as AI from "../../utils/ai";
import { withAuthentication } from "../../utils/authentication";
import { Environment } from "../../utils/environment";
import * as HTTP from "../../utils/http";
import * as BrandSnapshot from "../brand-snapshot";
import * as Competitor from "../competitor";
import * as Product from "../product";
import * as Store from "../store";
import {
  CRITICAL_CRAWLERS,
  hasAiSpecificRules,
  isCrawlerBlocked,
  parseRobots,
} from "./robots";

const QUERY_COUNT = 20;
const SIMULATION_BATCH_SIZE = 5;
const FETCH_TIMEOUT_MS = 8000;
const PRODUCT_SAMPLE_SIZE = 30;

/** The engine every query runs on today. More engines will join this label. */
const ENGINE = "ChatGPT";

const DIMENSIONS = [
  "find",
  "consider",
  "evaluate",
  "support",
  "presence",
  "authority",
] as const;

export type Dimension = (typeof DIMENSIONS)[number];
export type FunnelStage = "find" | "consider" | "evaluate" | "support";
export type DimensionLevel = "weak" | "developing" | "strong";
export type QueryPosition = "top" | "listed" | "absent";
export type CheckStatus = "pass" | "warn" | "fail";

export type QueryResult = {
  query: string;
  dimension: Dimension;
  /** Whether the shopper query names the brand. */
  branded: boolean;
  engine: string;
  answer: string;
  mentioned: boolean;
  position: QueryPosition;
  sentiment: "positive" | "neutral" | "negative" | null;
  brands: string[];
  sources: string[];
};

export type DimensionScore = {
  dimension: Dimension;
  score: number;
  level: DimensionLevel;
};

export type CrawlabilityCheck = {
  status: CheckStatus;
  headline: string;
  detail?: string;
};

export type Crawlability = {
  ready: boolean;
  robots: CrawlabilityCheck;
  llms: CrawlabilityCheck;
  engines: CrawlabilityCheck & { blocked: string[] };
};

export type FunnelEntry = {
  level: DimensionLevel;
  narrative: string;
  improvements: string[];
};

export type Report = {
  summary: string;
  metrics: {
    /** % of all responses that mention the brand. */
    mentionRate: number;
    /** % of unbranded queries where the brand still surfaced. */
    unpromptedRate: number;
    /** % of brand-named queries the engine answered about the right brand. */
    namedRate: number;
  };
  dimensions: DimensionScore[];
  keyFindings: string[];
  perception: { strengths: string[]; concerns: string[] };
  funnel: Record<FunnelStage, FunnelEntry>;
  crawlability: Crawlability;
  topCompetitors: { name: string; mentions: number }[];
  topSources: { domain: string; citations: number }[];
  queries: QueryResult[];
  engines: string[];
};

type StoreRecord = { id: string; name: string; domain: string };

const querySetSchema = z.object({
  category: z
    .string()
    .describe(
      "The product category this store competes in, e.g. 'shisha tobacco and accessories'.",
    ),
  queries: z
    .array(
      z.object({
        query: z.string().describe("The shopper's question, verbatim."),
        dimension: z.enum(DIMENSIONS),
        branded: z
          .boolean()
          .describe("true when the query names the brand explicitly."),
      }),
    )
    .min(QUERY_COUNT)
    .describe(`Exactly ${QUERY_COUNT} queries.`),
});

const auditSchema = z.object({
  answer: z
    .string()
    .describe("A 2-4 sentence summary of the answer you would give."),
  brands: z
    .array(z.string())
    .describe(
      "Brands or stores the answer recommends or mentions, most prominent first.",
    ),
  mentioned: z
    .boolean()
    .describe("Whether the audited brand appears anywhere in the answer."),
  position: z
    .enum(["top", "listed", "absent"])
    .describe(
      "top = the audited brand is the primary recommendation; listed = mentioned but not first; absent = not mentioned.",
    ),
  sentiment: z
    .enum(["positive", "neutral", "negative"])
    .nullable()
    .describe(
      "Tone toward the audited brand when mentioned; null when absent.",
    ),
  sources: z
    .array(z.string())
    .describe(
      "Domains or source types the answer draws on or would cite, e.g. reddit.com, youtube.com, editorial reviews.",
    ),
});

const synthesisSchema = z.object({
  summary: z
    .string()
    .describe(
      "A 4-6 sentence diagnostic summary of where the brand shows up, where it is absent, and why.",
    ),
  keyFindings: z
    .array(z.string())
    .min(3)
    .max(6)
    .describe("Evidence-backed observations, each grounded in the query log."),
  strengths: z.array(z.string()).min(2).max(5),
  concerns: z.array(z.string()).min(2).max(5),
  funnel: z.object({
    find: z.object({
      narrative: z.string().describe("One or two sentences on this stage."),
      improvements: z.array(z.string()).max(4),
    }),
    consider: z.object({
      narrative: z.string(),
      improvements: z.array(z.string()).max(4),
    }),
    evaluate: z.object({
      narrative: z.string(),
      improvements: z.array(z.string()).max(4),
    }),
    support: z.object({
      narrative: z.string(),
      improvements: z.array(z.string()).max(4),
    }),
  }),
});

const batched = async <T, R>(
  items: T[],
  size: number,
  run: (item: T) => Promise<R>,
): Promise<R[]> => {
  const chunks = Array.from(
    { length: Math.ceil(items.length / size) },
    (_, chunkIndex) => items.slice(chunkIndex * size, chunkIndex * size + size),
  );

  const results: R[] = [];
  for (const chunk of chunks) {
    results.push(...(await Promise.all(chunk.map(run))));
  }
  return results;
};

const generateQuerySet = async (
  store: StoreRecord,
  productTitles: string[],
  competitorNames: string[],
) =>
  AI.generate({
    label: "brand.queries",
    model: "gpt",
    output: querySetSchema,
    instructions: `You design realistic shopper queries for a brand visibility audit. The queries simulate what real people ask AI assistants (ChatGPT, Perplexity, Gemini) before, during, and after buying in this store's category.

Spread the ${QUERY_COUNT} queries across six dimensions:
- find — unbranded category discovery ("best X", "top brands for Y"). Never name the brand.
- consider — side-by-side comparisons; mix unbranded shortlists with direct "brand vs competitor" questions.
- evaluate — brand-named questions vetting specifics (quality, longevity, ingredients, sizing).
- support — brand-named usage, setup, troubleshooting, or policy questions from existing customers.
- presence — where-to-buy queries: online, by region, marketplaces. Mostly unbranded.
- authority — reputation and trust queries ("is <brand> legit", "best brands ranked"); mix branded and unbranded.

Aim for roughly 4/4/3/3/3/3 across find/consider/evaluate/support/presence/authority. Write queries a real shopper would type — specific to the category, varied in phrasing, no marketing language. Set \`branded\` accurately for every query.`,
    prompt: `Brand: "${store.name}" (${store.domain})
Sample products:
${productTitles.map((title) => `- ${title}`).join("\n") || "- (no products synced)"}
Known competitors: ${competitorNames.join(", ") || "unknown — infer likely rivals from the category"}

Infer the category, then produce the ${QUERY_COUNT} queries.`,
  });

const simulateQuery = async (
  store: StoreRecord,
  category: string,
  competitorNames: string[],
  entry: { query: string; dimension: Dimension; branded: boolean },
): Promise<QueryResult | null> => {
  const result = await resultify(() =>
    AI.generate({
      label: "brand.simulate",
      model: "gpt",
      output: auditSchema,
      instructions: `You are simulating ${ENGINE} answering a real shopper's question. Answer from your genuine knowledge of the market, its brands, retailers, and the community/editorial sources shoppers trust — exactly as you would for a real user.

The audited brand is named only so you can grade your own answer afterwards. Do NOT let it influence who you actually recommend — an inflated audit is worthless. If you would not naturally mention the brand, report it absent.

After forming the answer, fill the audit fields precisely.`,
      prompt: `Audited brand: "${store.name}" (${store.domain})
Category: ${category}
Known competitors: ${competitorNames.join(", ") || "unknown"}

Shopper query (${entry.dimension}${entry.branded ? ", brand-named" : ", unbranded"}): "${entry.query}"`,
    }),
  );

  if (!result.success) return null;

  return {
    query: entry.query,
    dimension: entry.dimension,
    branded: entry.branded,
    engine: ENGINE,
    answer: result.data.answer,
    mentioned: result.data.mentioned,
    position: result.data.position,
    sentiment: result.data.sentiment,
    brands: result.data.brands,
    sources: result.data.sources,
  };
};

const checkCrawlability = async (domain: string): Promise<Crawlability> => {
  const host = domain.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const fetchOptions = {
    method: "GET",
    headers: { "User-Agent": "EcenticAudit/1.0" },
  };

  const [robotsResponse, llmsResponse] = await Promise.all([
    HTTP.request(`https://${host}/robots.txt`, fetchOptions, {
      timeout: FETCH_TIMEOUT_MS,
    }),
    HTTP.request(`https://${host}/llms.txt`, fetchOptions, {
      timeout: FETCH_TIMEOUT_MS,
    }),
  ]);

  const llms: CrawlabilityCheck =
    llmsResponse.success && llmsResponse.data.ok
      ? {
          status: "pass",
          headline: "Published — AI engines have a declarative content map",
        }
      : {
          status: "warn",
          headline: "Not published",
          detail:
            "Publish an llms.txt at the domain root so AI engines get a declarative map of the store's key content.",
        };

  if (!robotsResponse.success || !robotsResponse.data.ok)
    return {
      ready: false,
      robots: {
        status: "warn",
        headline: "Unreachable",
        detail: `Could not fetch https://${host}/robots.txt — crawlers will assume everything is allowed, but verify the domain is reachable.`,
      },
      llms,
      engines: {
        status: "warn",
        headline: "Unknown — robots.txt could not be read",
        blocked: [],
      },
    };

  const body = await robotsResponse.data.text();
  const groups = parseRobots(body);
  const blocked = CRITICAL_CRAWLERS.filter((crawler) =>
    isCrawlerBlocked(groups, crawler),
  );

  const robots: CrawlabilityCheck = (() => {
    switch (true) {
      case blocked.length > 0:
        return {
          status: "fail" as const,
          headline: "Present — blocks AI crawlers",
          detail: `Remove the Disallow rules for ${blocked.join(", ")}; blocked agents cannot index or cite this store at all.`,
        };
      case !hasAiSpecificRules(groups):
        return {
          status: "warn" as const,
          headline: "Present — no AI-specific rules",
          detail:
            "Explicitly allow the major AI crawlers — OpenAI (GPTBot, ChatGPT-User), Anthropic (ClaudeBot, Claude-User), Perplexity (PerplexityBot), Google (Google-Extended). Naming them signals AI-friendly intent and prevents accidental blocks from broad Disallow rules.",
        };
      default:
        return {
          status: "pass" as const,
          headline: "Present — AI crawlers explicitly addressed",
        };
    }
  })();

  const engines: Crawlability["engines"] =
    blocked.length > 0
      ? {
          status: "fail",
          headline: `${blocked.length} AI crawlers blocked`,
          blocked,
        }
      : { status: "pass", headline: "No AI crawlers blocked", blocked: [] };

  return {
    ready: blocked.length === 0,
    robots,
    llms,
    engines,
  };
};

const POSITION_SCORES: Record<QueryPosition, number> = {
  top: 100,
  listed: 55,
  absent: 0,
};

const levelFor = (score: number): DimensionLevel => {
  switch (true) {
    case score < 40:
      return "weak";
    case score < 70:
      return "developing";
    default:
      return "strong";
  }
};

const rate = (matching: number, total: number) =>
  total === 0 ? 0 : Math.round((matching / total) * 100);

const scoreDimensions = (queries: QueryResult[]): DimensionScore[] =>
  DIMENSIONS.map((dimension) => {
    const relevant = queries.filter((entry) => entry.dimension === dimension);
    const score =
      relevant.length === 0
        ? 0
        : Math.round(
            relevant.reduce(
              (sum, entry) => sum + POSITION_SCORES[entry.position],
              0,
            ) / relevant.length,
          );
    return { dimension, score, level: levelFor(score) };
  });

const normalizeDomain = (source: string) =>
  source
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .trim();

const tally = (values: string[]) => {
  const counts = new Map<string, { label: string; count: number }>();
  for (const value of values) {
    const key = value.toLowerCase();
    const existing = counts.get(key);
    if (existing) existing.count += 1;
    else counts.set(key, { label: value, count: 1 });
  }
  return [...counts.values()].sort((left, right) => right.count - left.count);
};

const buildReport = async (store: StoreRecord) => {
  const [products, competitors] = await Promise.all([
    Product.find(Environment.SERVER, {
      where: and(
        eq(schema.product.storeId, store.id),
        eq(schema.product.status, "active"),
      ),
      limit: PRODUCT_SAMPLE_SIZE,
    }),
    Competitor.find(Environment.SERVER, {
      where: and(
        eq(schema.competitor.storeId, store.id),
        eq(schema.competitor.selected, true),
      ),
    }),
  ]);
  if (!products.success) throw products.error;
  if (!competitors.success) throw competitors.error;

  const productTitles = products.data.map((product) => product.title);
  const competitorNames = [
    ...new Set(
      competitors.data
        .map((competitor) => competitor.brand ?? competitor.title)
        .filter(Boolean),
    ),
  ];

  const querySet = await generateQuerySet(
    store,
    productTitles,
    competitorNames,
  );
  const plannedQueries = querySet.queries.slice(0, QUERY_COUNT);

  const [simulated, crawlability] = await Promise.all([
    batched(plannedQueries, SIMULATION_BATCH_SIZE, (entry) =>
      simulateQuery(store, querySet.category, competitorNames, entry),
    ),
    checkCrawlability(store.domain),
  ]);

  const queries = simulated.filter((entry) => entry !== null);
  if (queries.length < QUERY_COUNT / 2)
    throw new Error(
      `Brand analysis failed: only ${queries.length}/${plannedQueries.length} queries completed.`,
    );

  const unbranded = queries.filter((entry) => !entry.branded);
  const branded = queries.filter((entry) => entry.branded);
  const metrics = {
    mentionRate: rate(
      queries.filter((entry) => entry.mentioned).length,
      queries.length,
    ),
    unpromptedRate: rate(
      unbranded.filter((entry) => entry.mentioned).length,
      unbranded.length,
    ),
    namedRate: rate(
      branded.filter((entry) => entry.mentioned).length,
      branded.length,
    ),
  };

  const dimensions = scoreDimensions(queries);

  const brandKey = store.name.toLowerCase();
  const topCompetitors = tally(
    queries
      .flatMap((entry) => entry.brands)
      .filter((name) => {
        const key = name.toLowerCase();
        return !key.includes(brandKey) && !brandKey.includes(key);
      }),
  )
    .slice(0, 6)
    .map((entry) => ({ name: entry.label, mentions: entry.count }));

  const topSources = tally(
    queries.flatMap((entry) => entry.sources.map(normalizeDomain)),
  )
    .slice(0, 8)
    .map((entry) => ({ domain: entry.label, citations: entry.count }));

  const queryLog = queries
    .map(
      (entry, index) =>
        `${index + 1}. [${entry.dimension}${entry.branded ? ", branded" : ""}] "${entry.query}" → ${entry.position}${entry.sentiment ? ` (${entry.sentiment})` : ""}; recommends: ${entry.brands.slice(0, 5).join(", ") || "none"}; sources: ${entry.sources.slice(0, 4).join(", ") || "none"}. ${entry.answer}`,
    )
    .join("\n");

  const synthesis = await AI.generate({
    label: "brand.synthesis",
    model: "gpt",
    output: synthesisSchema,
    instructions: `You are a brand visibility analyst writing the diagnostic for a merchant dashboard. The evidence below is a log of ${queries.length} shopper queries answered by ${ENGINE}, each audited for whether the merchant's brand appeared.

Rules:
- Ground every statement in the query log — cite patterns (which query types the brand wins or loses, which competitors and sources dominate), never invent events.
- Name the engine (${ENGINE}) when attributing a perception.
- Write for the merchant in plain language: "the brand", "shoppers", no analyst jargon.
- keyFindings must be concrete and actionable-adjacent (what is happening and why it matters), one sentence or two each.
- funnel narratives describe how the brand performs at that stage; improvements are specific actions the merchant can take.`,
    prompt: `Brand: "${store.name}" (${store.domain})
Category: ${querySet.category}
Mentioned in ${metrics.mentionRate}% of responses; surfaced unprompted in ${metrics.unpromptedRate}% of unbranded queries; recognized in ${metrics.namedRate}% of brand-named queries.
Dimension scores (0-100): ${dimensions.map((entry) => `${entry.dimension} ${entry.score} (${entry.level})`).join(", ")}
Most-recommended competitors: ${topCompetitors.map((entry) => `${entry.name} (${entry.mentions})`).join(", ") || "none observed"}
Most-cited sources: ${topSources.map((entry) => entry.domain).join(", ") || "none observed"}

Query log:
${queryLog}`,
  });

  const levels = new Map(
    dimensions.map((entry) => [entry.dimension, entry.level]),
  );
  const funnel = Object.fromEntries(
    (["find", "consider", "evaluate", "support"] as const).map((stage) => [
      stage,
      {
        level: levels.get(stage) ?? "weak",
        narrative: synthesis.funnel[stage].narrative,
        improvements: synthesis.funnel[stage].improvements,
      },
    ]),
  ) as Record<FunnelStage, FunnelEntry>;

  return {
    summary: synthesis.summary,
    metrics,
    dimensions,
    keyFindings: synthesis.keyFindings,
    perception: {
      strengths: synthesis.strengths,
      concerns: synthesis.concerns,
    },
    funnel,
    crawlability,
    topCompetitors,
    topSources,
    queries,
    engines: [ENGINE],
  } satisfies Report;
};

/**
 * Runs the full brand visibility analysis for a store and persists it as a
 * {@link schema.brandSnapshot} row. Returns the completed snapshot. The run
 * takes on the order of a minute (20 audited queries + synthesis), so callers
 * should await it from an explicit user action, not a render path.
 */
export const analyze = withAuthentication(
  async (context, { store: storeId }: { store: string }) => {
    const userId = context.session.user.id;

    const store = await Store.get(Environment.SERVER, storeId);
    if (!store.success) return store;

    const storeRecord = store.data;
    if (!storeRecord || storeRecord.userId !== userId)
      return { success: false as const, error: new Error("Store not found") };

    const snapshot = await BrandSnapshot.create(Environment.SERVER, {
      userId,
      storeId,
      status: "running",
    });
    if (!snapshot.success) return snapshot;

    const report = await resultify(() =>
      buildReport({
        id: storeRecord.id,
        name: storeRecord.name,
        domain: storeRecord.domain,
      }),
    );

    if (!report.success) {
      await BrandSnapshot.update(Environment.SERVER, snapshot.data.id, {
        status: "failed",
        error: report.error.message,
      });
      return report;
    }

    return BrandSnapshot.update(Environment.SERVER, snapshot.data.id, {
      status: "complete",
      report: report.data,
    });
  },
  "Brand.analyze",
);
