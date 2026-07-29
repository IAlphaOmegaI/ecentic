import { unwrapResult } from "@zenncore/utils";
import type { SearchParamsProps } from "@zenncore/web/types";
import { redirect } from "next/navigation";
import * as Competitor from "@/server/app/competitor";
import * as Product from "@/server/app/product";
import { Environment } from "@/server/utils/environment";
import { CompetitorReview } from "./_components/competitor-review";

export default async ({ searchParams }: SearchParamsProps<"store">) => {
  const params = await searchParams;

  // The detect step hands the store down through the URL; falling back keeps a
  // directly-opened review from showing every store's rivals at once.
  const store =
    typeof params.store === "string" && params.store
      ? params.store
      : await unwrapResult(
          Product.resolveStoreForSelection(Environment.SERVER),
        );

  if (!store) redirect("/onboarding/connect");

  const competitors = await unwrapResult(
    Competitor.skimForCurrentUser(Environment.SERVER, { store }),
  );

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
