import type { DashboardData } from "@/server/app/optimization";
import { listingQueue } from "../../optimize/_components/queue";

/** Use the catalog's six-field score and the same actionable queue as Optimize. */
export const overviewPriorities = (
  products: readonly { quality: number; simulations: number }[],
  optimization: DashboardData | null,
) => {
  const incompleteCount = products.filter(
    (product) => product.quality < 100,
  ).length;
  const untestedCount = products.filter(
    (product) => product.simulations === 0,
  ).length;
  const opportunityCount = optimization
    ? listingQueue(optimization).length
    : null;
  const hasProducts = products.length > 0;

  return {
    hasProducts,
    incompleteCount,
    untestedCount,
    opportunityCount,
    allClear:
      hasProducts &&
      incompleteCount === 0 &&
      untestedCount === 0 &&
      opportunityCount === 0,
  };
};
