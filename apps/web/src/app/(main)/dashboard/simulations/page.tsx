import { resultify, unwrapResult } from "@zenncore/utils";
import { connection } from "next/server";
import { Suspense } from "react";
import * as Competitor from "@/server/app/competitor";
import * as Product from "@/server/app/product";
import * as Scan from "@/server/app/scan";
import { Environment } from "@/server/utils/environment";
import { SimulationsClient } from "./_components/simulations-client";

export default () => (
  <div className="flex flex-col">
    <div className="mx-8 border-accent-foreground border-x">
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="mx-8 px-6 py-8">
          <h1 className="font-medium text-4xl text-foreground">Simulations</h1>
          <p className="mt-1 font-light text-2xl text-foreground-dimmed">
            Re-run competitor discovery and win-rate simulations anytime.
          </p>
        </div>
      </div>

      <Suspense fallback={<SimulationsSkeleton />}>
        <SimulationsData />
      </Suspense>
    </div>
  </div>
);

const SimulationsData = async () => {
  await connection();

  const [products, competitors] = await Promise.all([
    unwrapResult(Product.skimForCurrentUser(Environment.SERVER)),
    unwrapResult(Competitor.skimForCurrentUser(Environment.SERVER)),
  ]);

  const selected = competitors.filter((record) => record.selected);

  const latestScans = await resultify(() =>
    unwrapResult(Scan.getLatest(Environment.SERVER, { limit: 1 })),
  );
  const latestCompletedScan = latestScans.success
    ? (latestScans.data.find((scan) => scan.status === "complete") ?? null)
    : null;

  const lastScan = await (async () => {
    if (!latestCompletedScan) return null;
    const result = await Scan.getShareData(Environment.SERVER, {
      id: latestCompletedScan.id,
    });
    if (!result.success) return null;
    return {
      id: result.data.scan.id,
      wins: result.data.scan.wins,
      losses: result.data.scan.losses,
      topFinding: result.data.scan.topFinding ?? null,
      modelRates: result.data.modelRates,
    };
  })();

  return (
    <SimulationsClient
      productIds={products.map((record) => record.id)}
      productCount={products.length}
      competitorCount={competitors.length}
      selectedCompetitorCount={selected.length}
      lastScan={lastScan}
    />
  );
};

const SimulationsSkeleton = () => (
  <>
    <div className="-mx-8 border-accent-foreground border-b">
      <div className="mx-8">
        <div className="grid grid-cols-1 gap-px bg-accent-foreground xl:grid-cols-3">
          {[
            "Products",
            "Competitors selected",
            "Estimated scan simulations",
          ].map((label) => (
            <div key={label} className="bg-background-dimmed p-4">
              <p className="font-light text-foreground-dimmed">{label}</p>
              <div className="mt-2 h-10 w-16 animate-pulse bg-foreground/10" />
            </div>
          ))}
        </div>
      </div>
    </div>

    <div className="h-8" />
    <div className="-mx-8 border-accent-foreground border-t border-b">
      <div className="mx-8">
        <div className="bg-background-dimmed">
          <div className="border-accent-foreground border-b p-4">
            <div className="h-7 w-52 animate-pulse bg-foreground/10" />
            <div className="mt-2 h-4 w-80 animate-pulse bg-foreground/10" />
            <div className="mt-2 h-3.5 w-44 animate-pulse bg-foreground/10" />
          </div>
          <div className="h-[520px] animate-pulse bg-foreground/5" />
        </div>
      </div>
    </div>

    <div className="h-8" />
    <div className="-mx-8 mb-12 border-accent-foreground border-t border-b">
      <div className="mx-8">
        <div className="bg-background-dimmed">
          <div className="flex items-center justify-between border-accent-foreground border-b p-4">
            <div>
              <div className="h-7 w-44 animate-pulse bg-foreground/10" />
              <div className="mt-2 h-4 w-96 animate-pulse bg-foreground/10" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-9 w-20 animate-pulse bg-foreground/10" />
              <div className="h-9 w-32 animate-pulse bg-foreground/10" />
            </div>
          </div>
          <div className="space-y-4 p-4">
            <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-4">
              {["Phase", "Progress", "Wins / Losses", "Elapsed"].map(
                (label) => (
                  <div key={label} className="bg-background-dimmed p-3">
                    <p className="font-light text-foreground-dimmed text-sm">
                      {label}
                    </p>
                    <div className="mt-1 h-5 w-16 animate-pulse bg-foreground/10" />
                  </div>
                ),
              )}
            </div>
            <div className="h-1 w-full bg-accent-foreground" />
            <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-4">
              {["GPT-4", "Claude", "Gemini", "Perplexity"].map((label) => (
                <div key={label} className="bg-background-dimmed p-3">
                  <div className="h-5 w-16 animate-pulse bg-foreground/10" />
                  <div className="mt-1 h-3.5 w-12 animate-pulse bg-foreground/10" />
                  <div className="mt-1 h-3.5 w-16 animate-pulse bg-foreground/10" />
                </div>
              ))}
            </div>
            <div className="h-72 border border-accent-foreground bg-background-dimmed p-3">
              <div className="h-3.5 w-72 animate-pulse bg-foreground/10" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </>
);
