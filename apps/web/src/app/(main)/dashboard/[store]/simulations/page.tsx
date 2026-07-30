import { resultify, unwrapResult } from "@zenncore/utils";
import { connection } from "next/server";
import { Suspense } from "react";
import { formatRelativeTime } from "@/lib/date";
import * as Competitor from "@/server/app/competitor";
import * as Product from "@/server/app/product";
import * as Scan from "@/server/app/scan";
import { Environment } from "@/server/utils/environment";
import { Crosshair, StatusPill } from "../../_components/grid";
import { SimulationsClient } from "./_components/simulations-client";
import { SimulationsSkeleton } from "./_components/skeletons";

export default async ({ params }: { params: Promise<{ store: string }> }) => {
  const { store } = await params;

  return (
    <div className="flex flex-col">
      <div className="mx-8 border-accent-foreground border-x">
        <div className="-mx-8 border-accent-foreground border-b">
          <div className="relative mx-8 flex flex-col gap-6 px-6 py-8 sm:flex-row sm:items-end sm:justify-between">
            <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
            <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
            <div>
              <Suspense
                fallback={
                  <div className="h-4 w-56 animate-pulse bg-foreground/10" />
                }
              >
                <LastRun store={store} />
              </Suspense>
              <h1 className="mt-3 font-bold text-[28px] text-foreground-rich tracking-[-0.02em]">
                Simulations
              </h1>
              <p className="mt-1 text-foreground-dimmed text-sm">
                Re-run competitor discovery and win-rate simulations anytime.
              </p>
            </div>
          </div>
        </div>

        <Suspense fallback={<SimulationsSkeleton />}>
          <SimulationsData store={store} />
        </Suspense>
      </div>
    </div>
  );
};

const LastRun = async ({ store }: { store: string }) => {
  await connection();
  const latestScans = await resultify(() =>
    unwrapResult(Scan.getLatest(Environment.SERVER, { limit: 1, store })),
  );
  const latestScan = latestScans.success ? (latestScans.data[0] ?? null) : null;

  return (
    <StatusPill tone={latestScan ? "success" : "neutral"}>
      {latestScan
        ? `Last simulation ${formatRelativeTime(latestScan.createdAt)}`
        : "No simulations run yet"}
    </StatusPill>
  );
};

const SimulationsData = async ({ store }: { store: string }) => {
  await connection();

  // Full lists feed the scan-setup roster (pick products/competitors before a
  // run); the skim stays a 10-row preview for the detection tab only.
  const [products, skimmedProducts, competitors] = await Promise.all([
    unwrapResult(Product.listForCurrentUser(Environment.SERVER, { store })),
    unwrapResult(Product.skimForCurrentUser(Environment.SERVER, { store })),
    unwrapResult(Competitor.listForCurrentUser(Environment.SERVER, { store })),
  ]);

  const latestScans = await resultify(() =>
    unwrapResult(Scan.getLatest(Environment.SERVER, { limit: 1, store })),
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
      store={store}
      productIds={skimmedProducts.map((record) => record.id)}
      products={products}
      competitors={competitors}
      lastScan={lastScan}
    />
  );
};
