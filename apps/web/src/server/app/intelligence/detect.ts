import { resultify } from "@zenncore/utils";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getBrandLogo } from "@/lib/logo";
import { schema, withTransaction } from "../../database";
import * as AI from "../../utils/ai";
import { Environment } from "../../utils/environment";
import * as HTTP from "../../utils/http";
import * as Competitor from "../competitor";
import * as Product from "../product";
import * as Judge from "./judge";

const shape = z.object({
  competitors: z.array(
    z.object({
      title: z.string(),
      brand: z.string(),
      price: z.string(),
      currency: z.string(),
      source: z.string(),
      url: z.string().nullable(),
      description: z.string().nullable(),
    }),
  ),
});

// Ground a detected competitor against the live web: fetch its proposed page
// and confirm the HTML actually names the brand. Hallucinated products have no
// resolvable page (or one that never mentions them); real ones pass. Best-effort
// and fail-closed PER ENTRY — a retailer anti-bot block reads as "unverified",
// and runDetection falls back to the ungrounded set when nothing verifies, so
// this prunes hallucinations without ever stranding the user at zero competitors.
const verify = async (entry: {
  brand: string;
  url: string | null;
}): Promise<boolean> => {
  const link = entry.url;
  if (!link) return false;
  if (!resultify(() => new URL(link)).success) return false;

  const response = await HTTP.request(
    link,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    },
    { timeout: 8000 },
  );
  if (!response.success || !response.data.ok) return false;

  const text = await resultify(() => response.data.text());
  if (!text.success) return false;

  const brand = entry.brand.trim().toLowerCase();
  return brand.length > 0 && text.data.toLowerCase().includes(brand);
};

// Headless competitor detection used by the /api/detect drain. Runs detached
// from the originating request so it completes even if the user leaves, and
// persists the result in a single atomic insert — an interrupted run never
// leaves a partial set in the database.
export const runDetection = async ({
  user,
  products: ids,
}: {
  user: string;
  products: string[];
}) => {
  const products = await Product.find(Environment.SERVER, {
    where: eq(schema.product.userId, user),
  });
  if (!products.success) return products;

  const selected = products.data.filter((product) => ids.includes(product.id));
  if (selected.length === 0)
    return { success: true as const, data: [] as Competitor.Type[] };

  const summaries = selected
    .map(
      (product) =>
        `- ${product.title}${product.price ? ` (${product.price} ${product.currency})` : ""}${product.description ? `: ${product.description.slice(0, 200)}` : ""}`,
    )
    .join("\n");

  const prompt = Judge.buildDetectionPrompt(summaries);

  // The model occasionally emits unparseable JSON (a NoObjectGeneratedError the
  // SDK doesn't retry) or an empty list — retry a few times before giving up.
  const detected = await (async () => {
    for (const _attempt of [0, 1, 2]) {
      const generation = await resultify(() =>
        AI.generate({ system: Judge.DETECTION_SYSTEM, prompt, schema: shape }),
      );
      if (generation.success && generation.data.competitors.length > 0)
        return generation.data.competitors;
    }
    return null;
  })();
  if (!detected)
    return { success: true as const, data: [] as Competitor.Type[] };

  // Clean (drop empties), dedupe by brand + title, and cap to a sane volume so
  // the saved list is consistent run-to-run.
  const cleaned = [
    ...new Map(
      detected
        .map((entry) => ({
          ...entry,
          title: entry.title.trim(),
          brand: entry.brand.trim(),
        }))
        .filter((entry) => entry.title.length > 0)
        .map(
          (entry) =>
            [
              `${entry.title.toLowerCase()}|${entry.brand.toLowerCase()}`,
              entry,
            ] as const,
        ),
    ).values(),
  ].slice(0, selected.length * 5);

  if (cleaned.length === 0)
    return { success: true as const, data: [] as Competitor.Type[] };

  // Ground the candidates against the live web in parallel, keeping only those
  // whose proposed page exists and names the brand. If anti-bot blocking defeats
  // verification for ALL of them, fall back to the ungrounded set so the user is
  // never left with zero competitors (no regression on today's behavior).
  const verifications = await Promise.all(
    cleaned.map((entry) => verify(entry)),
  );
  const verified = cleaned.filter((_entry, index) => verifications[index]);
  const grounded = verified.length > 0 ? verified : cleaned;

  // Persist through the repository in a single transaction so the saved set is
  // all-or-nothing — an interrupted run never leaves a partial set behind.
  const created = await resultify(() =>
    withTransaction((tx) =>
      Promise.all(
        grounded.map(async (entry) => {
          const creation = await Competitor.create(
            Environment.SERVER,
            {
              ...entry,
              userId: user,
              selected: true,
              image: getBrandLogo(entry.brand),
            },
            { tx },
          );
          if (!creation.success) throw creation.error;
          if (!creation.data)
            throw new Error("Competitor creation returned no data");
          return creation.data;
        }),
      ),
    ),
  );
  if (!created.success) return created;

  return { success: true as const, data: created.data };
};
