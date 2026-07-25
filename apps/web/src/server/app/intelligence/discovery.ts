"use server";

import { resultify } from "@zenncore/utils";
import { z } from "zod";
import { withAuthentication } from "@/server/utils/authentication";
import * as AI from "../../utils/ai";
import { ValidationError } from "../../utils/error";

// The AI shopping agents we simulate. The first three are the same Azure-gateway
// models the scan engine uses (server/app/intelligence/simulate.ts); Perplexity
// Sonar adds a live-web-search perspective. Each model runs independently and a
// failure (e.g. the gateway has no Perplexity route configured) surfaces as an
// error row rather than failing the whole run.
const perspectives = [
  { id: "gpt4", label: "GPT-4o", model: "gpt-4o" as AI.ModelId },
  {
    id: "claude",
    label: "Claude Sonnet",
    model: "claude-sonnet-4-20250514" as AI.ModelId,
  },
  {
    id: "gemini",
    label: "Gemini",
    model: "gemini-2.5-flash" as AI.ModelId,
  },
  {
    id: "perplexity",
    label: "Perplexity Sonar",
    model: "sonar" as AI.ModelId,
  },
] as const;

const MAX_QUERIES = 8;
const BATCH_SIZE = 8;

const DISCOVERY_SYSTEM = `You are an AI shopping assistant. A shopper describes what they want to buy, and you recommend the online stores you would actually point them to — exactly as you would in a real conversation.

Rules:
- Recommend REAL online stores/retailers you genuinely know, ranked best-fit first. Aim for 5–8 stores.
- Base each recommendation on what you actually know about the store: how relevant its catalog is to the request, brand recognition, trustworthiness, selection, and typical pricing/availability. Do NOT invent stores or guess domains you are unsure of.
- One of the stores is a TARGET store the user is evaluating. Judge it on the SAME merits as every other store — do not give it special treatment just because it was named. If you don't recognize it, or it isn't a strong fit for this request, it should rank low or not appear at all, and you must say so honestly.
- Every reason must be specific and concrete. No marketing fluff ("great quality", "huge selection") without substance.`;

const buildPrompt = (targetStore: string, query: string): string =>
  `Shopper request: "${query}"

TARGET store being evaluated: ${targetStore}

1. List the online stores you would recommend for this request, ranked best first. Give a short, concrete reason for each.
2. State whether ${targetStore} appears among your recommendations and, if so, at what rank.
3. Explain why ${targetStore} ranks where it does — or, if it does not appear, the specific reasons it was left out and how it compares to the stores you did recommend (brand awareness, catalog relevance, trust signals, price, availability, etc.).`;

const suggestionSchema = z.object({
  stores: z
    .array(
      z.object({
        name: z.string().describe("Store or retailer name"),
        domain: z
          .string()
          .nullable()
          .describe(
            "Primary website domain if you know it (e.g. nike.com), otherwise null",
          ),
        reason: z
          .string()
          .describe("Concrete reason this store fits the shopper's request"),
      }),
    )
    .describe("Recommended stores in ranked order, best match first"),
  targetIncluded: z
    .boolean()
    .describe("Whether the TARGET store appears in your recommendations"),
  targetRank: z
    .number()
    .int()
    .nullable()
    .describe(
      "1-based position of the target store in your ranked list, or null if it is not recommended",
    ),
  targetReason: z
    .string()
    .describe(
      "If the target store is recommended: why it ranks where it does. If NOT recommended: the concrete reasons it was left out and how it compares to the stores you did recommend.",
    ),
});

export type DiscoveryStore = {
  name: string;
  domain: string | null;
  reason: string;
  isTarget: boolean;
};

export type DiscoveryModelResult = {
  model: string;
  modelLabel: string;
  status: "ok" | "error";
  error?: string;
  stores: DiscoveryStore[];
  targetIncluded: boolean;
  targetRank: number | null;
  targetReason: string;
};

export type DiscoveryQueryResult = {
  query: string;
  models: DiscoveryModelResult[];
};

export type DiscoveryRunResult = {
  targetStore: string;
  totalModels: number;
  queries: DiscoveryQueryResult[];
};

// Reduce a store URL/domain to a bare host for comparison: drop protocol, a
// leading www., any path, and lowercase it. "https://www.Nike.com/shoes" → "nike.com".
const normalizeDomain = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .replace(/\/+$/, "");

// The brand label of a domain — its first dot-separated segment. "allbirds.com" → "allbirds".
const rootLabel = (domain: string): string =>
  normalizeDomain(domain).split(".")[0] ?? "";

const alphanumeric = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");

// Decide whether a suggested store is the target. Models are inconsistent about
// echoing the exact domain, so match either on normalized domain or on the
// brand label (e.g. target "allbirds.com" matches a store named "Allbirds").
const isTargetStore = (
  store: { name: string; domain: string | null },
  targetDomain: string,
  targetLabel: string,
): boolean => {
  const domainMatch =
    store.domain !== null && normalizeDomain(store.domain) === targetDomain;
  const labelMatch =
    targetLabel.length > 0 && alphanumeric(store.name) === targetLabel;
  return domainMatch || labelMatch;
};

const runPerspective = async (
  perspective: (typeof perspectives)[number],
  targetStore: string,
  query: string,
): Promise<DiscoveryModelResult> => {
  const targetDomain = normalizeDomain(targetStore);
  const targetLabel = rootLabel(targetStore);

  const generation = await resultify(() =>
    AI.generate({
      model: perspective.model,
      instructions: DISCOVERY_SYSTEM,
      prompt: buildPrompt(targetStore, query),
      schema: suggestionSchema,
      schemaName: "StoreDiscovery",
      schemaDescription:
        "Stores an AI shopping agent would recommend for a shopper request, with a verdict on the target store",
    }),
  );

  if (!generation.success) {
    return {
      model: perspective.id,
      modelLabel: perspective.label,
      status: "error",
      error: generation.error.message || "Model request failed",
      stores: [],
      targetIncluded: false,
      targetRank: null,
      targetReason: "",
    };
  }

  const stores: DiscoveryStore[] = generation.data.stores.map((store) => ({
    name: store.name,
    domain: store.domain,
    reason: store.reason,
    isTarget: isTargetStore(store, targetDomain, targetLabel),
  }));

  // Prefer the rank derived from the actual ranked list — it's the ground truth
  // the user sees — and fall back to the model's self-report only when the target
  // can't be matched against any listed store.
  const matchedIndex = stores.findIndex((store) => store.isTarget);
  const targetIncluded =
    matchedIndex >= 0 ? true : generation.data.targetIncluded;
  const targetRank =
    matchedIndex >= 0
      ? matchedIndex + 1
      : generation.data.targetIncluded
        ? generation.data.targetRank
        : null;

  return {
    model: perspective.id,
    modelLabel: perspective.label,
    status: "ok",
    stores,
    targetIncluded,
    targetRank,
    targetReason: generation.data.targetReason,
  };
};

export type DiscoveryInput = {
  targetStore: string;
  queries: string[];
};

export const runDiscovery = withAuthentication(
  async (_context, input: DiscoveryInput) => {
    const targetStore = input.targetStore.trim();

    if (!targetStore) {
      return {
        success: false as const,
        error: new ValidationError("Enter a target store domain."),
      };
    }

    // De-duplicate (case-insensitive) while preserving order, then cap.
    const seen = new Set<string>();
    const queries = input.queries
      .map((query) => query.trim())
      .filter((query) => {
        const key = query.toLowerCase();
        if (query.length === 0 || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, MAX_QUERIES);

    if (queries.length === 0) {
      return {
        success: false as const,
        error: new ValidationError("Enter at least one shopping query."),
      };
    }

    const tasks = queries.flatMap((query) =>
      perspectives.map(
        (perspective) => () => runPerspective(perspective, targetStore, query),
      ),
    );

    const settled: DiscoveryModelResult[] = [];
    for (let index = 0; index < tasks.length; index += BATCH_SIZE) {
      const batch = tasks.slice(index, index + BATCH_SIZE);
      settled.push(...(await Promise.all(batch.map((task) => task()))));
    }

    // Re-group the flat results back under their query, in input order.
    const queryResults: DiscoveryQueryResult[] = queries.map(
      (query, qIndex) => ({
        query,
        models: perspectives
          .map(
            (_perspective, pIndex) =>
              settled[qIndex * perspectives.length + pIndex],
          )
          .filter(
            (model): model is DiscoveryModelResult => model !== undefined,
          ),
      }),
    );

    return {
      success: true as const,
      data: {
        targetStore,
        totalModels: perspectives.length,
        queries: queryResults,
      } satisfies DiscoveryRunResult,
    };
  },
  "Discovery.runDiscovery",
);
