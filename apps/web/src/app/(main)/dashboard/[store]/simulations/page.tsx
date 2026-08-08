import { resultify, unwrapResult } from "@zenncore/utils";
import { connection } from "next/server";
import { Suspense } from "react";
import { formatRelativeTime } from "@/lib/date";
import * as Competitor from "@/server/app/competitor";
import * as Product from "@/server/app/product";
import * as Scan from "@/server/app/scan";
import { Environment } from "@/server/utils/environment";
import { StatusPillSkeleton } from "../../_components/chrome-skeletons";
import { StatusPill } from "../../_components/grid";
import { SimulationsShell, SimulationsSkeleton } from "./_components/shell";
import { SimulationsClient } from "./_components/simulations-client";

type StoreParams = PageProps<"/dashboard/[store]/simulations">["params"];

export default ({ params }: PageProps<"/dashboard/[store]/simulations">) => (
  <SimulationsShell
    statusPill={
      <Suspense fallback={<StatusPillSkeleton />}>
        <LastRun params={params} />
      </Suspense>
    }
  >
    <Suspense fallback={<SimulationsSkeleton />}>
      <SimulationsData params={params} />
    </Suspense>
  </SimulationsShell>
);
const LastRun = async ({ params }: { params: StoreParams }) => {
  await connection();
  const { store } = await params;
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

const SimulationsData = async ({ params }: { params: StoreParams }) => {
  await connection();
  const { store } = await params;

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
