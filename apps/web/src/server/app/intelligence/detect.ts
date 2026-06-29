import { resultify } from "@zenncore/utils";
import { streamObject } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getBrandLogo } from "@/lib/logo";
import { schema } from "../../database";
import * as AI from "../../utils/ai";
import { Environment } from "../../utils/environment";
import type * as Competitor from "../competitor";
import { create } from "../competitor";
import * as Product from "../product";
import * as Judge from "./judge";

const candidate = z.object({
  title: z.string(),
  brand: z.string(),
  price: z.string(),
  currency: z.string(),
  source: z.string(),
  url: z.string().nullable(),
  description: z.string().nullable(),
});

// Streamed back to the client as detection runs. Each candidate the model names
// is persisted immediately and pushed as a `competitor` event, so the UI fills
// in live instead of waiting for the whole batch.
export type DetectionEvent =
  | { kind: "status"; message: string }
  | { kind: "competitor"; competitor: Competitor.Type }
  | { kind: "done"; total: number }
  | { kind: "error"; message: string };

// Competitor detection as a single synchronous streaming pass — no detached
// /api/detect hop, no URL grounding. gpt-4o reliably returns real, well-known
// competitor brands; an earlier HTTP-grounding gate discarded most of them
// because the model cannot guess exact retailer URLs (a real product on a
// guessed-wrong Amazon ASIN 404s). We keep the model's set and stream each
// competitor in as it is named, persisting it the moment it lands.
export const stream = ({
  user,
  products: ids,
}: {
  user: string;
  products: string[];
}) =>
  AI.stream<DetectionEvent>(async (update) => {
    const products = await Product.find(Environment.SERVER, {
      where: eq(schema.product.userId, user),
    });
    if (!products.success) {
      update({ kind: "error", message: "Could not read your catalog." });
      return;
    }

    const selected = products.data.filter((product) =>
      ids.includes(product.id),
    );
    if (selected.length === 0) {
      update({ kind: "done", total: 0 });
      return;
    }

    update({
      kind: "status",
      message: `Reading ${selected.length} product${selected.length === 1 ? "" : "s"} from your catalog`,
    });

    const summaries = selected
      .map(
        (product) =>
          `- ${product.title}${product.price ? ` (${product.price} ${product.currency})` : ""}${product.description ? `: ${product.description.slice(0, 200)}` : ""}`,
      )
      .join("\n");
    const prompt = Judge.buildDetectionPrompt(summaries);
    const cap = selected.length * 5;

    update({
      kind: "status",
      message: "Querying the intelligence model for competitors…",
    });

    // Dedupe by brand + title and cap to a sane volume. Each survivor is
    // persisted immediately and streamed — an interrupted run leaves FEWER
    // competitors, never a partial-entity set.
    const seen = new Set<string>();
    const persisted: Competitor.Type[] = [];
    const persist = async (entry: z.infer<typeof candidate>) => {
      const title = entry.title.trim();
      const brand = entry.brand.trim();
      if (title.length === 0) return;

      const key = `${title.toLowerCase()}|${brand.toLowerCase()}`;
      if (seen.has(key) || persisted.length >= cap) return;
      seen.add(key);

      const creation = await create(Environment.SERVER, {
        ...entry,
        title,
        brand,
        userId: user,
        selected: true,
        image: getBrandLogo(brand || title),
      });
      if (!creation.success) return;

      persisted.push(creation.data);
      update({ kind: "competitor", competitor: creation.data });
    };

    // Primary path: stream array elements as the model emits them.
    const streamed = await resultify(async () => {
      const generation = streamObject({
        model: "gpt-4o",
        output: "array",
        schema: candidate,
        instructions: Judge.DETECTION_SYSTEM,
        prompt,
        providerOptions: AI.providerOptions,
        onError: () => {},
      });
      for await (const entry of generation.elementStream) await persist(entry);
    });

    // Fallback: if streaming produced nothing (transport/parse hiccup or an
    // empty list), fetch the set in one non-streaming call, retried — the same
    // reliable path the diagnostic confirmed returns a full set.
    if (persisted.length === 0) {
      const generated = await (async () => {
        for (const _attempt of [0, 1, 2]) {
          const generation = await resultify(() =>
            AI.generate({
              instructions: Judge.DETECTION_SYSTEM,
              prompt,
              schema: z.object({ competitors: z.array(candidate) }),
            }),
          );
          if (generation.success && generation.data.competitors.length > 0)
            return generation.data.competitors;
        }
        return null;
      })();
      if (generated) for (const entry of generated) await persist(entry);
    }

    if (persisted.length === 0 && !streamed.success) {
      update({ kind: "error", message: "Detection failed. Please try again." });
      return;
    }

    update({ kind: "done", total: persisted.length });
  });
