import { unwrapResult } from "@zenncore/utils";
import { connection } from "next/server";
import * as Competitor from "@/server/app/competitor";
import * as Product from "@/server/app/product";
import { Environment } from "@/server/utils/environment";
import { SimulationsClient } from "./_components/simulations-client";

export default async () => {
  await connection();

  const [products, competitors] = await Promise.all([
    unwrapResult(Product.skimForCurrentUser(Environment.SERVER)),
    unwrapResult(Competitor.skimForCurrentUser(Environment.SERVER)),
  ]);

  const selected = competitors.filter((record) => record.selected);

  return (
    <div className="flex flex-col">
      <div className="mx-8 border-accent-foreground border-x">
        <div className="-mx-8 border-accent-foreground border-b">
          <div className="mx-8 px-6 py-8">
            <h1 className="font-medium text-4xl text-foreground">
              Simulations
            </h1>
            <p className="mt-1 font-light text-2xl text-foreground-dimmed">
              Re-run competitor discovery and win-rate simulations anytime.
            </p>
          </div>
        </div>

        <SimulationsClient
          productIds={products.map((record) => record.id)}
          productCount={products.length}
          competitorCount={competitors.length}
          selectedCompetitorCount={selected.length}
        />
      </div>
    </div>
  );
};
