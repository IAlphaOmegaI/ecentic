import { unwrapResult } from "@zenncore/utils";
import * as Competitor from "@/server/app/competitor";
import { CompetitorReview } from "./_components/competitor-review";

export default async () => {
  const competitors = await unwrapResult(Competitor.getForCurrentUser());

  return (
    <CompetitorReview existing={competitors}>
      <h1 className="font-medium text-4xl text-foreground">
        Review your competitors
      </h1>

      <p className="font-light text-2xl text-foreground-dimmed">
        Select the competitors you'd like to include in your AI agent
        simulations.
      </p>
    </CompetitorReview>
  );
};
