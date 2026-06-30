"use server";

import { resultify } from "@zenncore/utils";
import { generateText, isStepCount, tool } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { schema } from "../../../database";
import * as AI from "../../../utils/ai";
import { withAuthentication } from "../../../utils/authentication";
import { Environment } from "../../../utils/environment";
import { RequestError } from "../../../utils/error";
import * as Competitor from "../../competitor";
import * as Product from "../../product";
import * as Formating from "../formating";
import * as Ucp from "./profile";

// A single consistent judge carries the lift measurement — the metric is the
// delta between passes, so one model is cleaner (and cheaper) than the full
// four-model fan-out. gpt-4o matches simulate.ts's proven scoring path.
const MODEL = "gpt-4o" as AI.ModelId;

// The tool-gathering step rides the playground's proven tool-calling path
// (google/gemini-2.5-flash through the same gateway) — it only needs to fetch
// and summarize the merchant's UCP data, not act as the judge.
const GATHER_MODEL = "google/gemini-2.5-flash";

const verdict = z.object({
  winner: z.enum(["product", "competitor"]),
  productScore: z.number().min(0).max(100),
  competitorScore: z.number().min(0).max(100),
  reasoning: z.string(),
});

type Verdict = z.infer<typeof verdict>;

const scoringSystem = `You are a rigorous, skeptical AI shopping agent performing an evidence-based audit. You compare two product listings and recommend the one with stronger verifiable evidence.

- Be harsh. Most real listings are mediocre (30-55). Reserve 70+ for genuinely complete, specific, well-evidenced listings.
- Missing or vague data is a FAILURE, not neutral — penalize it.
- Do NOT favor either listing by its label ("PRODUCT" vs "COMPETITOR") — labels are arbitrary.
- Reward concrete, verifiable specifics; ignore marketing fluff without evidence.
- Output only the structured fields.`;

const scoringPrompt = (
  product: Product.Type,
  competitor: Competitor.Type,
  ucpIntel?: string,
) => `A consumer is choosing between these two products. Audit each listing and pick the stronger one.

--- PRODUCT (the merchant) ---
${Formating.formatProduct(product)}
${
  ucpIntel
    ? `\n--- MERCHANT UCP DATA (agent-readable data this merchant publishes, which a UCP-aware agent can fetch) ---\n${ucpIntel}\n`
    : ""
}
--- COMPETITOR ---
${Formating.formatCompetitor(competitor)}

Score each 0-100, pick "product" or "competitor", and explain which concrete data points drove the decision.`;

const score = (
  product: Product.Type,
  competitor: Competitor.Type,
  ucpIntel?: string,
): Promise<Verdict> =>
  AI.generate({
    model: MODEL,
    instructions: scoringSystem,
    prompt: scoringPrompt(product, competitor, ucpIntel),
    schema: verdict,
    schemaName: "ListingComparison",
  });

// Real shopping agents discover and FETCH a merchant's UCP-published data before
// recommending. We give the judge that same capability via a read-only tool and
// let it summarize what the UCP data reveals beyond the raw listing.
const gatherUcpIntel = async (product: Product.Type, merchant: string) => {
  const payload = {
    merchant,
    productStructuredData: product.structuredData ?? "(none published)",
  };

  const fetchMerchantUcp = tool({
    description:
      "Fetch the merchant's UCP-published, agent-readable data (merchant profile, policies, certifications, and this product's structured JSON-LD) — the data a UCP-aware shopping agent retrieves before recommending a product.",
    inputSchema: z.object({
      reason: z.string().describe("Why you need the merchant's UCP data"),
    }),
    execute: async () => payload,
  });

  const result = await generateText({
    model: GATHER_MODEL,
    providerOptions: AI.providerOptions,
    instructions:
      "You are an AI shopping agent. Before judging a merchant's product you retrieve the merchant's UCP-published data the way a real agent would. Call fetchMerchantUcp once, then summarize in 4-6 bullet points the concrete, decision-relevant facts (policies, certifications, structured specs, guarantees) the UCP data reveals BEYOND a basic listing. If it is empty or adds nothing, say so plainly.",
    prompt: `Retrieve and summarize the UCP-published data for "${product.title}".`,
    tools: { fetchMerchantUcp },
    stopWhen: isStepCount(3),
  });

  return result.text;
};

export const runUcpLift = withAuthentication(
  async (context, { limit = 5 }: { limit?: number } = {}) => {
    const user = context.session.user.id;

    const [profiles, products, competitors] = await Promise.all([
      Ucp.find(Environment.SERVER, {
        where: eq(schema.ucpProfile.userId, user),
      }),
      Product.find(Environment.SERVER, {
        where: eq(schema.product.userId, user),
      }),
      Competitor.find(Environment.SERVER, {
        where: eq(schema.competitor.userId, user),
      }),
    ]);
    if (!profiles.success) return profiles;
    if (!products.success) return products;
    if (!competitors.success) return competitors;

    const profile = profiles.data[0] ?? null;
    const selected = competitors.data.filter((record) => record.selected);

    if (products.data.length === 0 || selected.length === 0)
      return {
        success: false as const,
        error: new RequestError(
          "Add products and select competitors before measuring UCP lift.",
        ),
      };

    // Lift is meaningless without agent-readable UCP data to fetch.
    const hasUcp =
      Boolean(profile?.generatedJson) ||
      products.data.some((record) => record.structuredData);
    if (!hasUcp)
      return {
        success: false as const,
        error: new RequestError(
          "No UCP profile or product structured data found. Generate UCP / structured data first, then measure its lift.",
        ),
      };

    const merchant =
      profile?.generatedJson ??
      JSON.stringify(
        {
          name: profile?.merchantName ?? null,
          description: profile?.description ?? null,
          shippingPolicy: profile?.shippingPolicy ?? null,
          returnPolicy: profile?.returnPolicy ?? null,
          paymentMethods: profile?.paymentMethods ?? null,
          certifications: profile?.certifications ?? null,
          sustainability: profile?.sustainability ?? null,
          contactEmail: profile?.contactEmail ?? null,
        },
        null,
        2,
      );

    // One representative competitor per product, capped at `limit`.
    const pairs = products.data.slice(0, limit).flatMap((product, index) => {
      const competitor = selected[index % selected.length];
      return competitor ? [{ product, competitor }] : [];
    });

    const results = await Promise.all(
      pairs.map(async ({ product, competitor }) => {
        const [baseline, intel] = await Promise.all([
          resultify(() => score(product, competitor)),
          resultify(() => gatherUcpIntel(product, merchant)),
        ]);

        const enriched = await resultify(() =>
          score(product, competitor, intel.success ? intel.data : undefined),
        );

        return {
          product: product.title,
          competitor: competitor.title,
          baselineWinner: baseline.success ? baseline.data.winner : null,
          ucpWinner: enriched.success ? enriched.data.winner : null,
        };
      }),
    );

    const scored = results.filter(
      (result) => result.baselineWinner && result.ucpWinner,
    );
    const baselineWins = scored.filter(
      (result) => result.baselineWinner === "product",
    ).length;
    const ucpWins = scored.filter(
      (result) => result.ucpWinner === "product",
    ).length;

    const rate = (wins: number) =>
      scored.length > 0 ? Math.round((wins / scored.length) * 100) : 0;
    const baselineWinRate = rate(baselineWins);
    const ucpWinRate = rate(ucpWins);

    return {
      success: true as const,
      data: {
        model: "GPT-4",
        sampleSize: scored.length,
        baselineWinRate,
        ucpWinRate,
        lift: ucpWinRate - baselineWinRate,
        pairs: scored.map((result) => ({
          product: result.product,
          competitor: result.competitor,
          baselineWinner: result.baselineWinner,
          ucpWinner: result.ucpWinner,
          flipped: result.baselineWinner !== result.ucpWinner,
        })),
      },
    };
  },
  "UcpSimulation.runUcpLift",
);
