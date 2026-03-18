import { unwrapResult } from "@zenncore/utils";
import { Motion } from "@/components/motion";
import * as Competitor from "@/server/app/competitor";
import { CompetitorReview } from "./_components/competitor-review";

export default async () => {
  const competitors = await unwrapResult(Competitor.getForCurrentUser());

  return (
    <CompetitorReview existing={competitors}>
      <Motion.Up className="mb-6">
        <h1 className="font-medium text-2xl text-foreground">
          Review your competitors
        </h1>
        <p className="mt-1 font-light text-foreground-dimmed text-sm">
          Select the competitors you'd like to include in your AI agent
          simulations.
        </p>
      </Motion.Up>
    </CompetitorReview>
  );
};
