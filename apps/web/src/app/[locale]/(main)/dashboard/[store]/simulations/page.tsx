import { resultify, unwrapResult } from "@zenncore/utils";
import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { formatRelativeTime } from "@/lib/date";
import * as Competitor from "@/server/app/competitor";
import * as Product from "@/server/app/product";
import * as Scan from "@/server/app/scan";
import * as Simulation from "@/server/app/simulation";
import { Environment } from "@/server/utils/environment";
import { StatusPillSkeleton } from "../../_components/chrome-skeletons";
import { summarizeComparisons } from "../research/_components/evidence";
import { ResearchUnavailable } from "../research/_components/shell";
import { SimulationsShell, SimulationsSkeleton } from "./_components/shell";
import { SimulationsClient } from "./_components/simulations-client";

type StoreParams =
  PageProps<"/[locale]/dashboard/[store]/simulations">["params"];

export default ({
  params,
}: PageProps<"/[locale]/dashboard/[store]/simulations">) => (
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
  const locale = await getLocale();

  await connection();
  const { store } = await params;
  const translate = await getTranslations("dashboard.shared.status");
  const latestScans = await resultify(() =>
    unwrapResult(
      Scan.getLatest(Environment.SERVER, {
        limit: 1,
        store,
        status: "complete",
      }),
    ),
  );
  if (!latestScans.success) return null;
  const latestScan = latestScans.data[0] ?? null;

  return (
    <p className="text-foreground-dimmed text-xs">
      {latestScan
        ? translate("lastSimulation", {
            time: formatRelativeTime(latestScan.createdAt, locale),
          })
        : translate("noSimulationsYet")}
    </p>
  );
};

const SimulationsData = async ({ params }: { params: StoreParams }) => {
  await connection();
  const { store } = await params;

  // Full lists feed the scan-setup roster (pick products/competitors before a
  // run); the skim stays a 10-row preview for the detection tab only.
  const [productResult, skimmedResult, competitorResult] = await Promise.all([
    Product.listForCurrentUser(Environment.SERVER, { store }),
    Product.skimForCurrentUser(Environment.SERVER, { store }),
    Competitor.listForCurrentUser(Environment.SERVER, { store }),
  ]);
  if (
    !productResult.success ||
    !skimmedResult.success ||
    !competitorResult.success
  )
    return <ResearchUnavailable />;
  const products = productResult.data;
  const skimmedProducts = skimmedResult.data;
  const competitors = competitorResult.data;

  const latestScans = await resultify(() =>
    unwrapResult(
      Scan.getLatest(Environment.SERVER, {
        limit: 1,
        store,
        status: "complete",
      }),
    ),
  );
  if (!latestScans.success) return <ResearchUnavailable />;
  const latestCompletedScan = latestScans.data[0] ?? null;
  const comparisons = latestCompletedScan
    ? await Simulation.getForStore(Environment.SERVER, { store })
    : null;
  if (comparisons && !comparisons.success) return <ResearchUnavailable />;
  const lastScan =
    latestCompletedScan && comparisons?.success
      ? {
          id: latestCompletedScan.id,
          ...summarizeComparisons(
            comparisons.data.simulations,
            latestCompletedScan.id,
          ),
          // Legacy findings can cover several stores; only scoped evidence belongs here.
          topFinding: null,
        }
      : null;

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
