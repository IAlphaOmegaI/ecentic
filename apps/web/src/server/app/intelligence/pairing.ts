import * as Evidence from "@/lib/competitor-evidence";
import type * as Competitor from "../competitor";

/**
 * What gets judged against what.
 *
 * Deliberately not `"use server"` and deliberately pure: both the scan engine
 * (`background-scan.ts`) and the enqueue path (`simulate.ts`) must shape pairs
 * identically. The enqueue freezes a roster and a `totalSimulations` count onto
 * the scan row; if the engine later shapes pairs differently, the progress bar
 * either stalls short of 100% or runs past it.
 *
 * The judgeability floor itself lives in `lib/competitor-evidence.ts`, next to
 * the capture-gap rules the formatter and the client estimators share.
 */

export type Pair<Product> = {
  product: Product;
  competitors: Competitor.Type[];
};

/**
 * Shapes the pair graph for a scan.
 *
 * A product carrying its own measured offers is judged against THOSE; a product
 * without any keeps the store-wide roster, which is every row that predates
 * offer discovery.
 *
 * This is what makes product-level competitors affordable. Pairing every
 * product with every rival is a cartesian product, and each pair costs six
 * model calls (three perspectives, judged in both orderings to cancel primacy
 * bias) — a 50-product store with eight offers each would go from ~3,000 calls
 * to ~120,000. Pairing each product with its own offers is ~2,400: cheaper than
 * the store-wide roster it replaces, and every comparison becomes same-product
 * rather than same-category.
 *
 * The roster FILTERS, never expands. Picking a product-linked rival in the
 * per-scan roster compares it against its own product only — letting it fan out
 * across every product would quietly reintroduce the blowup through the roster
 * path.
 */
export const pairCompetitors = <Product extends { id: string }>(
  products: Product[],
  competitors: Competitor.Type[],
): Pair<Product>[] => {
  const judgeable = competitors.filter(Evidence.isJudgeable);
  const storeWide = judgeable.filter(
    (competitor) => competitor.productId === null,
  );

  return products.map((product) => {
    const linked = judgeable.filter(
      (competitor) => competitor.productId === product.id,
    );
    return { product, competitors: linked.length > 0 ? linked : storeWide };
  });
};
