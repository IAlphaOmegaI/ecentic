import type { ShoppingResearch } from "@/lib/outbound-shopping-research";
import type { Evidence } from "@/server/utils/outbound/shopping-assessment";
import type { ResultBrandSelection } from "@/server/utils/outbound/shopping-discovery-review";
import type { createProductUseCatalog } from "@/server/utils/outbound/shopping-product-use";

/** Same-use synthetic model stub; quoted contexts are supplied by the real runtime catalog. */
export const compatibleSelectionFromPrompt = (
  prompt: string,
  selection: ResultBrandSelection,
) => {
  const catalog = (
    JSON.parse(prompt) as {
      productUseEvidence?: ReturnType<typeof createProductUseCatalog>;
    }
  ).productUseEvidence;
  if (!catalog) return selection;
  const product = catalog.productExcerpts[0];
  if (!product) throw new Error("Synthetic product evidence missing.");
  return {
    ...selection,
    productUse: {
      decision: "compatible" as const,
      reason: "Labeled synthetic alternatives serve the same stated use.",
      matches: selection.brands.map((brand) => {
        const answer = catalog.answerContexts.find(
          (item) => item.brandExcerptId === brand.quoteId,
        )?.excerpt;
        if (!answer) throw new Error("Synthetic answer context missing.");
        return {
          brandExcerptId: brand.quoteId,
          productExcerptId: product.id,
          answerContextId: answer.id,
          productQuote: product.text.slice(0, 1200),
          answerQuote: answer.text.slice(0, 1200),
          reason: "The labeled synthetic product uses match.",
        };
      }),
    },
  };
};

/** Labeled same-use synthetic fixtures only. Runtime never assumes compatibility from catalog IDs. */
export const compatibleBrandSelection = async (
  evidence: Evidence,
  selection: ResultBrandSelection,
  now = Date.now(),
) => {
  const { resultBrandCatalog } = await import(
    "@/server/utils/outbound/shopping-discovery-review"
  );
  const { createProductUseCatalog } = await import(
    "@/server/utils/outbound/shopping-product-use"
  );
  const catalog = createProductUseCatalog(
    evidence,
    resultBrandCatalog(evidence, now),
    now,
  );
  const product = catalog.productExcerpts[0];
  if (!product) throw new Error("Synthetic product evidence missing.");
  return {
    ...selection,
    productUse: {
      decision: "compatible" as const,
      reason: "Synthetic named alternatives serve the same stated use.",
      matches: selection.brands.map((brand) => {
        const answer = catalog.answerContexts.find(
          (item) => item.brandExcerptId === brand.quoteId,
        )?.excerpt;
        if (!answer) throw new Error("Synthetic answer context missing.");
        return {
          brandExcerptId: brand.quoteId,
          productExcerptId: product.id,
          answerContextId: answer.id,
          productQuote: product.text.slice(0, 1200),
          answerQuote: answer.text.slice(0, 1200),
          reason:
            "Both labeled synthetic products serve the described category/use.",
        };
      }),
    },
  };
};

export const withCompatibleProductUse = async (
  evidence: Evidence,
  receipt: ShoppingResearch,
  now = Date.now(),
) => {
  if (receipt.selected.kind !== "discovery-absence") return receipt;
  const { projectCompatibleResultBrands } = await import(
    "@/server/utils/outbound/shopping-discovery-review"
  );
  const selection = await compatibleBrandSelection(
    evidence,
    {
      decision: "supported",
      reason: "Synthetic exact compatible brands.",
      brands: (receipt.discovery?.brandProjection?.brands ?? []).map(
        (brand) => ({ name: brand.name, quoteId: brand.excerptIds[0] ?? "" }),
      ),
    },
    now,
  );
  const result = projectCompatibleResultBrands(
    evidence,
    receipt,
    selection,
    now,
  );
  if (result.status !== "researched") throw new Error(result.reason);
  return result.receipt;
};
