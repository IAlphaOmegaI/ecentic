import { parseSearchParam, unwrapResult } from "@zenncore/utils";
import { Motion } from "@/components/motion";
import * as Competitor from "@/server/app/competitor";
import { CompetitorManager } from "./_components/competitor-manager";

export default async ({
  searchParams,
}: {
  searchParams: Promise<{ products?: string }>;
}) => {
  const params = await searchParams;

  const products = parseSearchParam(params.products, "list", []);
  const competitors = await unwrapResult(Competitor.getForCurrentUser());

  return (
    <CompetitorManager existing={competitors} products={products}>
      <Motion.Item className="border-accent-foreground border-x p-6">
        <h2 className="font-medium text-4xl text-foreground">
          Who are your competitors?
        </h2>
        <p className="mt-1 font-light text-2xl text-foreground-dimmed">
          We'll test your products head-to-head against these competitors in AI
          agent simulations.
        </p>
      </Motion.Item>
    </CompetitorManager>
  );
};
