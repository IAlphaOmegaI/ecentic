import "server-only";
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { resultify } from "@zenncore/utils";
import { type DefaultTreeAdapterTypes, parseFragment } from "parse5";
import { z } from "zod";
import {
  automaticAbsenceUseProblem,
  PRODUCT_USE_COMPATIBILITY_VERSION,
  productCaptureUrlMatches,
  type ShoppingBrandProof,
  type ShoppingResearch,
  shoppingProductUseCompatibilitySchema,
} from "@/lib/outbound-shopping-research";
import {
  projectBrowserExecution,
  reusableProductCapture,
} from "./live-shopping-browser";
import { parseShoppingAnswerCards } from "./shopping-answer-cards";
import type { Evidence } from "./shopping-assessment";
import { replayShoppingCapture } from "./shopping-presence";

const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const text = (value: string) => value.replace(/\s+/g, " ").trim();
const visible = (value: string): string => {
  const read = (node: DefaultTreeAdapterTypes.Node): string =>
    "value" in node
      ? node.value
      : "childNodes" in node
        ? node.childNodes.map(read).join(" ")
        : "";
  return text(parseFragment(value).childNodes.map(read).join(" "));
};
type BrandExcerpt = {
  id: string;
  sourceId: string;
  quote: string;
  brand: ShoppingBrandProof;
};
type UseExcerpt = z.infer<
  typeof shoppingProductUseCompatibilitySchema
>["matches"][number]["product"];
const excerpt = (
  input: Omit<UseExcerpt, "id">,
  locator: unknown,
): UseExcerpt => ({
  id: `use_${hash([input, locator]).slice(0, 24)}`,
  ...input,
});
const chunks = (value: string) =>
  Array.from({ length: Math.ceil(value.length / 2000) }, (_, index) => ({
    start: index * 2000,
    text: value.slice(index * 2000, (index + 1) * 2000),
  })).filter((part) => part.text.trim());

/** Required Azure fields only. IDs and quotations select original evidence, not invented product facts. */
export const productUseReviewSchema = z
  .object({
    decision: z.enum(["compatible", "incompatible", "uncertain"]),
    reason: z.string().min(1).max(1500),
    matches: z
      .array(
        z
          .object({
            brandExcerptId: z.string().min(1).max(80),
            productExcerptId: z.string().min(1).max(80),
            answerContextId: z.string().min(1).max(80),
            productQuote: z.string().min(1).max(1200),
            answerQuote: z.string().min(1).max(1200),
            reason: z.string().min(1).max(1000),
          })
          .strict(),
      )
      .max(3),
  })
  .strict();
export type ProductUseReview = z.infer<typeof productUseReviewSchema>;

/** All context is reconstructed from intact saved captures; this function never fetches or calls a model. */
export const createProductUseCatalog = (
  evidence: Evidence,
  brands: BrandExcerpt[],
  now = Date.now(),
) => {
  const product = evidence.answer.job.query.product;
  const browser = reusableProductCapture({
    browser: evidence.browser,
    product,
    now,
  });
  if (!browser)
    throw new Error(
      "Product-use review needs the intact rendered merchant product.",
    );
  const source = browser.sources.find((item) => item.id === "product-browser");
  const raw = browser.raw.find(
    (item) => source?.artifact === `sha256:${item.sha256}`,
  );
  const projected =
    raw &&
    projectBrowserExecution({
      capture: raw,
      url: product.url,
      id: "product-browser",
      productName: product.name,
      startedAt: raw.receivedAt,
      now,
    });
  if (!source || !raw || !projected)
    throw new Error("The saved product-use source cannot be replayed.");
  const nodes = (value: unknown): Record<string, unknown>[] => {
    if (Array.isArray(value)) return value.flatMap(nodes);
    const parsed = z.record(z.string(), z.unknown()).safeParse(value);
    if (!parsed.success) return [];
    return [parsed.data, ...nodes(parsed.data["@graph"])];
  };
  const descriptions = projected.rendered.structured.flatMap((body, index) => {
    const decoded = resultify(() => JSON.parse(body) as unknown);
    return decoded.success
      ? nodes(decoded.data).flatMap((node, nodeIndex) => {
          const type = node["@type"];
          const name = node["name"];
          const address = node["url"];
          const description = node["description"];
          if (
            !(Array.isArray(type) ? type : [type]).some(
              (item) => item === "Product" || item === "ProductGroup",
            ) ||
            typeof name !== "string" ||
            text(name).toLowerCase() !== text(product.name).toLowerCase() ||
            typeof address !== "string" ||
            !productCaptureUrlMatches(product.url, address) ||
            typeof description !== "string" ||
            !description.trim()
          )
            return [];
          return chunks(visible(description)).map((part) =>
            excerpt(
              {
                sourceId: source.id,
                artifact: source.artifact,
                context: "product-description",
                text: part.text,
              },
              [index, nodeIndex, part.start, name, address],
            ),
          );
        })
      : [];
  });
  // Prefer the same-name, same-URL Product description when supplied. This prevents
  // navigation or a short generic title from hiding a more specific intended use.
  const productExcerpts = descriptions.length
    ? descriptions
    : chunks(projected.rendered.text).map((part) =>
        excerpt(
          {
            sourceId: source.id,
            artifact: source.artifact,
            context: "rendered-product",
            text: part.text,
          },
          part.start,
        ),
      );
  const full = replayShoppingCapture(evidence.answer, now);
  if (full.completeness.status !== "complete")
    throw new Error("Product-use review needs the complete saved answer.");
  const cards = parseShoppingAnswerCards(full.answerText);
  if (cards.status === "invalid") throw new Error(cards.reason);
  const answerContexts = brands.map((brand) => {
    const cardSection =
      cards.status === "parsed"
        ? cards.sections.find((section) =>
            section.cards.some((card) => card.id === brand.brand.cardId),
          )
        : null;
    const card = cardSection?.cards.find(
      (item) => item.id === brand.brand.cardId,
    );
    const content = (() => {
      if (!card || !cardSection) return brand.quote;
      const next = cardSection.cards.find((item) => item.start > card.start);
      const end = next?.start ?? cardSection.end;
      const description = full.answerText.slice(card.end, end);
      if (description.length > 5000)
        throw new Error(
          "A product-card use description is too large to interpret without losing context.",
        );
      return `Section: ${cardSection.heading ?? "Unheaded product collection"}\nProduct: ${card.title}\nDescription: ${visible(description)}`;
    })();
    if (content.length > 6000)
      throw new Error("The answer use context exceeds its supported length.");
    return {
      brandExcerptId: brand.id,
      excerpt: excerpt(
        {
          sourceId: evidence.answer.source.id,
          artifact: `sha256:${full.answerHash}`,
          context: card ? "answer-card" : "answer-prose",
          text: content,
        },
        [brand.brand, cardSection?.id ?? null, cardSection?.headingRaw ?? null],
      ),
    };
  });
  const availableAt = Math.max(
    Date.parse(evidence.answer.executedAt),
    Date.parse(raw.receivedAt),
    Date.parse(source.checkedAt),
    ...evidence.answer.raw.map((capture) => Date.parse(capture.receivedAt)),
  );
  const catalog = { product, productExcerpts, answerContexts, availableAt };
  return {
    ...catalog,
    catalogHash: hash(catalog),
    answerHash: full.answerHash,
    linksHash: full.linksHash,
    queryHash: hash(evidence.answer.job.query),
  };
};

export const projectProductUseCompatibility = (
  evidence: Evidence,
  receipt: ShoppingResearch,
  brands: BrandExcerpt[],
  selection: unknown,
  now = Date.now(),
  checkedAt = new Date(now).toISOString(),
) => {
  const review = productUseReviewSchema.parse(selection);
  if (review.decision !== "compatible")
    throw new Error(
      `Product-use compatibility is ${review.decision}: ${review.reason}`,
    );
  const catalog = createProductUseCatalog(evidence, brands, now);
  const selected = receipt.discovery?.brandProjection?.brands ?? [];
  if (
    receipt.selected.kind !== "discovery-absence" ||
    selected.length !== review.matches.length ||
    !selected.length
  )
    throw new Error(
      "Every named absence alternative needs its own product-use evidence.",
    );
  const reviewedAt = Date.parse(checkedAt);
  if (
    !Number.isFinite(reviewedAt) ||
    reviewedAt < catalog.availableAt ||
    reviewedAt > now
  )
    throw new Error("The product-use decision has an invalid review time.");
  const matches = selected.map((brand, index) => {
    const match = review.matches[index];
    const product = catalog.productExcerpts.find(
      (item) => item.id === match?.productExcerptId,
    );
    const answer = catalog.answerContexts.find(
      (item) =>
        item.brandExcerptId === brand.excerptIds[0] &&
        item.excerpt.id === match?.answerContextId,
    )?.excerpt;
    if (
      !match ||
      match.brandExcerptId !== brand.excerptIds[0] ||
      !product ||
      !answer ||
      !product.text.includes(match.productQuote) ||
      !answer.text.includes(match.answerQuote)
    )
      throw new Error(
        "A product-use decision needs exact quotations from this product and this named answer alternative.",
      );
    return {
      name: brand.name,
      brandExcerptId: match.brandExcerptId,
      product,
      answer,
      productQuote: match.productQuote,
      answerQuote: match.answerQuote,
      reason: match.reason,
    };
  });
  return shoppingProductUseCompatibilitySchema.parse({
    version: PRODUCT_USE_COMPATIBILITY_VERSION,
    method: "semantic",
    decision: "compatible",
    answerHash: catalog.answerHash,
    linksHash: catalog.linksHash,
    queryHash: catalog.queryHash,
    catalogHash: catalog.catalogHash,
    checkedAt,
    reason: review.reason,
    matches,
  });
};

export const validateProductUseCompatibility = (
  evidence: Evidence,
  receipt: ShoppingResearch,
  brands: BrandExcerpt[],
  now = Date.now(),
) => {
  const proof = receipt.discovery?.productUseCompatibility;
  if (
    !proof &&
    receipt.discovery?.brandProjection?.version !== "answer-brands-v2"
  )
    return null;
  const shape = automaticAbsenceUseProblem(receipt);
  if (shape || !proof) return shape ?? "The product-use proof is missing.";
  const replayed = resultify(() =>
    projectProductUseCompatibility(
      evidence,
      receipt,
      brands,
      {
        decision: "compatible",
        reason: proof.reason,
        matches: proof.matches.map((match) => ({
          brandExcerptId: match.brandExcerptId,
          productExcerptId: match.product.id,
          answerContextId: match.answer.id,
          productQuote: match.productQuote,
          answerQuote: match.answerQuote,
          reason: match.reason,
        })),
      },
      now,
      proof.checkedAt,
    ),
  );
  return replayed.success && isDeepStrictEqual(replayed.data, proof)
    ? null
    : "The product-use proof changed from its original product and answer context.";
};
