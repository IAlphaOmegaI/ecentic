import { ArrowRightIcon, ClockIcon } from "@zenncore/icons";
import { unwrapResult } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { formatRelativeTime } from "@/lib/date";
import * as Competitor from "@/server/app/competitor";
import * as Product from "@/server/app/product";
import * as Scan from "@/server/app/scan";
import { Environment } from "@/server/utils/environment";
import {
  AgentVisitsPanel,
  AgentVisitsPanelSkeleton,
} from "../../_components/agent-visits-panel";
import {
  CompetitorTableSkeleton,
  TableSkeleton,
} from "../../_components/chrome-skeletons";
import { CompetitorsTable } from "../../_components/competitors-table";
import { OverviewActions } from "../../_components/overview-actions";
import {
  OverviewCharts,
  OverviewRecentScans,
} from "../../_components/overview-charts";
import { OverviewDetails } from "../../_components/overview-details";
import { ProductsTable } from "../../_components/products-table";
import {
  OverviewPerformanceSkeleton,
  OverviewRecentScansSkeleton,
} from "./_components/performance-skeleton";
import {
  OverviewActionsSkeleton,
  OverviewShell,
  OverviewUpdatedSkeleton,
} from "./_components/shell";
import { OverviewSummary } from "./_components/summary";
import { OverviewSummarySkeleton } from "./_components/summary-skeleton";
import {
  OverviewTraffic,
  OverviewTrafficSkeleton,
} from "./_components/traffic-summary";

type StoreParams = PageProps<"/[locale]/dashboard/[store]">["params"];

// Synchronous so the frame, heading and section borders prerender into the
// static shell. `params` is request data — awaiting it here would strand the
// whole page behind the route skeleton, so it is handed to the Suspense leaves
// that actually need a store id.
export default ({
  params,
  searchParams,
}: PageProps<"/[locale]/dashboard/[store]">) => (
  <OverviewShell
    statusPill={
      <Suspense fallback={<OverviewUpdatedSkeleton />}>
        <LastUpdated params={params} />
      </Suspense>
    }
    actions={
      <Suspense fallback={<OverviewActionsSkeleton />}>
        <OverviewActions />
      </Suspense>
    }
    stats={
      <Suspense fallback={<OverviewSummarySkeleton />}>
        <OverviewSummary params={params} />
      </Suspense>
    }
    performance={
      <Suspense fallback={<OverviewPerformanceSkeleton />}>
        <Performance params={params} />
      </Suspense>
    }
    traffic={
      <Suspense fallback={<OverviewTrafficSkeleton />}>
        <OverviewTraffic params={params} />
      </Suspense>
    }
    recent={
      <Suspense fallback={<OverviewRecentScansSkeleton />}>
        <RecentScans params={params} />
      </Suspense>
    }
    details={
      <Suspense fallback={null}>
        <LegacyDetails params={params} searchParams={searchParams} />
      </Suspense>
    }
  />
);

// Existing bookmarked overview tabs remain usable, but no longer duplicate
// three full workspaces on the default overview or start their queries there.
const LegacyDetails = async ({
  params,
  searchParams,
}: PageProps<"/[locale]/dashboard/[store]">) => {
  const { view } = await searchParams;
  if (view !== "products" && view !== "competitors" && view !== "agents")
    return null;
  return (
    <div className="border-accent-foreground border-t">
      <OverviewDetails
        products={
          <Suspense fallback={<TableSkeleton />}>
            <TopProducts params={params} />
          </Suspense>
        }
        competitors={
          <Suspense fallback={<CompetitorTableSkeleton />}>
            <TopCompetitors params={params} />
          </Suspense>
        }
        agents={
          <Suspense fallback={<AgentVisitsPanelSkeleton />}>
            <AgentVisitsPanel params={params} />
          </Suspense>
        }
      />
    </div>
  );
};

const LastUpdated = async ({ params }: { params: StoreParams }) => {
  const locale = await getLocale();

  await connection();
  const { store } = await params;
  const translate = await getTranslations("dashboard.overview.summary");
  const status = await getTranslations("dashboard.shared.status");
  const scans = await unwrapResult(
    Scan.getLatest(Environment.SERVER, { store, status: "complete", limit: 1 }),
  );
  const latest = scans.find((scan) => scan.status === "complete");

  return (
    <span className="inline-flex items-center gap-2 text-foreground-dimmed text-xs">
      <ClockIcon aria-hidden className="size-4" />
      {latest
        ? translate("updated", {
            time: formatRelativeTime(latest.updatedAt, locale),
          })
        : status("noScansYet")}
    </span>
  );
};

const Performance = async ({ params }: { params: StoreParams }) => {
  await connection();
  const { store } = await params;
  const scans = await unwrapResult(
    Scan.getLatest(Environment.SERVER, {
      store,
      status: "complete",
      limit: 30,
    }),
  );

  const completed = scans.filter(
    (scan) => scan.status === "complete" && scan.wins + scan.losses > 0,
  );

  const trend = completed
    .slice(0, 30)
    .reverse()
    .map((scan) => {
      const total = scan.wins + scan.losses;
      return {
        date: scan.createdAt.toISOString(),
        winRate: total > 0 ? Math.round((scan.wins / total) * 100) : 0,
      };
    });

  const latest = completed[0];
  const previous = completed[1];
  const latestRate = latest
    ? Math.round((latest.wins / (latest.wins + latest.losses)) * 100)
    : null;
  const previousRate = previous
    ? Math.round((previous.wins / (previous.wins + previous.losses)) * 100)
    : null;
  return (
    <OverviewCharts
      reportId={latest?.id}
      trend={trend}
      result={
        latest
          ? {
              wins: latest.wins,
              total: latest.wins + latest.losses,
              change:
                latestRate !== null && previousRate !== null
                  ? latestRate - previousRate
                  : null,
            }
          : undefined
      }
    />
  );
};

const RecentScans = async ({ params }: { params: StoreParams }) => {
  await connection();
  const { store } = await params;
  const translate = await getTranslations("dashboard.shared.activity");
  const simulation = await getTranslations("dashboard.simulation");
  const number = new Intl.NumberFormat(await getLocale());
  const scans = await unwrapResult(
    Scan.getLatest(Environment.SERVER, { store }),
  );
  const activity = scans.slice(0, 3).map((scan) => {
    const state = (() => {
      switch (scan.status) {
        case "complete":
          return {
            type: "simulation_complete" as const,
            message: translate("simulationComplete", {
              wins: number.format(scan.wins),
              losses: number.format(scan.losses),
            }),
          };
        case "pending":
          return {
            type: "simulation_pending" as const,
            message: simulation("states.queued"),
          };
        case "running":
          return {
            type: "simulation_running" as const,
            message: simulation("states.running"),
          };
        default:
          return {
            type: "simulation_failed" as const,
            message: simulation("toast.failed.title"),
          };
      }
    })();
    return {
      id: scan.id,
      ...state,
      detail: scan.storeId === store ? scan.topFinding : null,
      timestamp: scan.createdAt.toISOString(),
    };
  });

  return <OverviewRecentScans activity={activity} />;
};

const TopProducts = async ({ params }: { params: StoreParams }) => {
  await connection();
  const { store } = await params;
  const translate = await getTranslations("dashboard.shared");
  const data = await unwrapResult(
    Product.gatherIntelligence(Environment.SERVER, { store }),
  );

  const sorted = [...data.products].sort(
    (a, b) => b.winRate.total - a.winRate.total,
  );

  return (
    <ProductsTable
      preview
      rows={sorted}
      pageCount={1}
      title={translate("table.productWinRates")}
      action={
        <Button
          color="primary"
          render={<Link href={`/dashboard/${store}/products`} />}
        >
          {translate("action.viewAllProducts")}{" "}
          <ArrowRightIcon className="size-4" />
        </Button>
      }
    />
  );
};

const TopCompetitors = async ({ params }: { params: StoreParams }) => {
  await connection();
  const { store } = await params;
  const translate = await getTranslations("dashboard.shared");
  const data = await unwrapResult(
    Competitor.gatherIntelligence(Environment.SERVER, { store }),
  );

  return (
    <CompetitorsTable
      rows={data.brands}
      title={translate("table.topCompetitors")}
      pageCount={1}
      action={
        <Button
          color="primary"
          render={<Link href={`/dashboard/${store}/competitors`} />}
        >
          {translate("action.viewAll")} <ArrowRightIcon className="size-4" />
        </Button>
      }
    />
  );
};
