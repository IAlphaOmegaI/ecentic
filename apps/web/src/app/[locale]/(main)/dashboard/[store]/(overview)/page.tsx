import {
  ArrowRightIcon,
  AwardIcon,
  BullseyeIcon,
  GaugeIcon,
  RadarIcon,
  TrendDownIcon,
  TrendUpIcon,
} from "@zenncore/icons";
import { cn, unwrapResult } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Suspense } from "react";
import { formatRelativeTime } from "@/lib/date";
import * as Competitor from "@/server/app/competitor";
import * as Product from "@/server/app/product";
import * as Scan from "@/server/app/scan";
import { Environment } from "@/server/utils/environment";
import { AgentVisitsPanel } from "../../_components/agent-visits-panel";
import {
  ChartSkeleton,
  CompetitorTableSkeleton,
  StatsSkeleton,
  StatusPillSkeleton,
  TableSkeleton,
} from "../../_components/chrome-skeletons";
import { CompetitorsTable } from "../../_components/competitors-table";
import { StatLabel, StatusPill } from "../../_components/grid";
import { OverviewActions } from "../../_components/overview-actions";
import { OverviewCharts } from "../../_components/overview-charts";
import { ProductsTable } from "../../_components/products-table";
import { OverviewShell } from "./_components/shell";

type StoreParams = PageProps<"/dashboard/[store]">["params"];

// Synchronous so the frame, heading and section borders prerender into the
// static shell. `params` is request data — awaiting it here would strand the
// whole page behind the route skeleton, so it is handed to the Suspense leaves
// that actually need a store id.
export default ({ params }: PageProps<"/dashboard/[store]">) => (
  <OverviewShell
    statusPill={
      <Suspense fallback={<StatusPillSkeleton className="w-42" />}>
        <LastUpdated params={params} />
      </Suspense>
    }
    actions={<OverviewActions params={params} />}
    stats={
      <Suspense fallback={<StatsSkeleton />}>
        <StatCards params={params} />
      </Suspense>
    }
    performance={
      <Suspense fallback={<ChartSkeleton />}>
        <Performance params={params} />
      </Suspense>
    }
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
      <Suspense fallback={<TableSkeleton />}>
        <AgentVisitsPanel params={params} />
      </Suspense>
    }
  />
);

const LastUpdated = async ({ params }: { params: StoreParams }) => {
  await connection();
  const { store } = await params;
  const translate = await getTranslations("dashboard.shared.status");
  const data = await unwrapResult(
    Product.gatherIntelligence(Environment.SERVER, { store }),
  );

  return (
    <StatusPill tone={data.scan?.updatedAt ? "success" : "neutral"}>
      {data.scan?.updatedAt
        ? translate("liveUpdated", {
            time: formatRelativeTime(data.scan.updatedAt),
          })
        : translate("noScansYet")}
    </StatusPill>
  );
};

const StatCards = async ({ params }: { params: StoreParams }) => {
  await connection();
  const { store } = await params;
  const translate = await getTranslations("dashboard.shared.stats");
  const data = await unwrapResult(
    Product.gatherIntelligence(Environment.SERVER, { store }),
  );
  const { products } = data;

  if (products.length === 0)
    return (
      <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: translate("overallWinRate"), icon: GaugeIcon },
          { label: translate("productsScanned"), icon: RadarIcon },
          { label: translate("topPerformer"), icon: AwardIcon },
          { label: translate("biggestOpportunity"), icon: BullseyeIcon },
        ].map(({ label, icon: Icon }) => (
          <div
            key={label}
            className="relative flex h-44 flex-col justify-between bg-background-rich p-5"
          >
            <StatLabel label={label} icon={<Icon className="size-7.5" />} />
            <div className="flex flex-col items-center gap-2 pb-4">
              <p className="font-light text-foreground-dimmed text-sm">
                {translate("noDataYet")}
              </p>
            </div>
          </div>
        ))}
      </div>
    );

  const overall = Math.round(
    products.reduce((sum, product) => sum + product.winRate.total, 0) /
      products.length,
  );

  const sorted = [...products].sort(
    (a, b) => b.winRate.total - a.winRate.total,
  );

  const top = sorted[0];
  const opportunity = sorted[sorted.length - 1];

  const scans = await unwrapResult(
    Scan.getLatest(Environment.SERVER, { store }),
  );
  const completed = scans.filter((scan) => scan.status === "complete");

  const trend = (() => {
    if (completed.length < 2) return 0;

    const current = completed[0];
    const previous = completed[1];

    if (!current) return 0;
    if (!previous) return 0;

    const currentTotal = current.wins + current.losses;
    const previousTotal = previous.wins + previous.losses;

    const currentRate =
      currentTotal > 0 ? Math.round((current.wins / currentTotal) * 100) : 0;
    const previousRate =
      previousTotal > 0 ? Math.round((previous.wins / previousTotal) * 100) : 0;

    return currentRate - previousRate;
  })();

  return (
    <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-2 xl:grid-cols-4">
      <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
        <StatLabel
          label={translate("overallWinRate")}
          icon={<GaugeIcon className="size-7.5 text-primary" />}
        />
        <div>
          <p className="font-bold text-4xl text-foreground-rich tabular-nums tracking-[-0.02em]">
            {overall}
            <span className="ml-0.5 font-medium text-foreground-dimmed text-xl">
              %
            </span>
          </p>
          {trend !== 0 ? (
            <p className="mt-3 flex items-center gap-2">
              <span
                className={cn(
                  "flex items-center gap-1 font-medium text-xs",
                  trend >= 0 ? "text-success" : "text-error",
                )}
              >
                {trend >= 0 ? (
                  <TrendUpIcon className="size-4" />
                ) : (
                  <TrendDownIcon className="size-4" />
                )}
                {trend >= 0 ? "+" : ""}
                {trend}%
              </span>
              <span className="text-foreground-dimmed text-xs">
                {translate("vsLastScan")}
              </span>
            </p>
          ) : (
            <p className="mt-3 text-foreground-dimmed text-xs">
              {translate("acrossProducts", { count: products.length })}
            </p>
          )}
        </div>
      </div>

      <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
        <StatLabel
          label={translate("productsScanned")}
          icon={<RadarIcon className="size-7.5 text-warning" />}
        />
        <div>
          <p className="font-bold text-4xl text-foreground-rich tabular-nums tracking-[-0.02em]">
            {data.total}
            <span className="ml-1 font-medium text-foreground-dimmed text-xl">
              / 100
            </span>
          </p>
          <div className="mt-3">
            <div className="h-1 w-full rounded-full bg-accent-foreground">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-600"
                style={{ width: `${(data.total / 100) * 100}%` }}
              />
            </div>
            <p className="mt-2 text-foreground-dimmed text-xs">
              {translate("slotsRemaining", { count: 100 - data.total })}
            </p>
          </div>
        </div>
      </div>

      {top && (
        <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
          <StatLabel
            label={translate("topPerformer")}
            icon={<AwardIcon className="size-7.5 text-success" />}
          />
          <div>
            <p className="line-clamp-1 text-foreground text-sm">{top.title}</p>
            <p className="mt-1 font-bold text-4xl text-success tabular-nums tracking-[-0.02em]">
              {top.winRate.total}
              <span className="ml-0.5 font-medium text-foreground-dimmed text-xl">
                %
              </span>
            </p>
            <Link
              href={`/dashboard/${store}/products/${top._id}`}
              className="mt-3 inline-flex items-center gap-1 text-primary text-sm transition-colors hover:text-primary-rich"
            >
              {translate("viewDetails")} <ArrowRightIcon className="size-4" />
            </Link>
          </div>
        </div>
      )}

      {opportunity && (
        <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
          <StatLabel
            label={translate("biggestOpportunity")}
            icon={<BullseyeIcon className="size-7.5 text-error" />}
          />
          <div>
            <p className="line-clamp-1 text-foreground text-sm">
              {opportunity.title}
            </p>
            <p className="mt-1 font-bold text-4xl text-error tabular-nums tracking-[-0.02em]">
              {opportunity.winRate.total}
              <span className="ml-0.5 font-medium text-foreground-dimmed text-xl">
                %
              </span>
            </p>
            <Link
              href={`/dashboard/${store}/products/${opportunity._id}`}
              className="mt-3 inline-flex items-center gap-1 text-primary text-sm transition-colors hover:text-primary-rich"
            >
              {translate("optimizeNow")} <ArrowRightIcon className="size-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

const Performance = async ({ params }: { params: StoreParams }) => {
  await connection();
  const { store } = await params;
  const translate = await getTranslations("dashboard.shared.activity");
  const [data, scans] = await Promise.all([
    unwrapResult(Product.gatherIntelligence(Environment.SERVER, { store })),
    unwrapResult(Scan.getLatest(Environment.SERVER, { store })),
  ]);

  const { products } = data;

  const models =
    products.length > 0
      ? [
          {
            label: "ChatGPT",
            rate: Math.round(
              products.reduce((sum, p) => sum + p.winRate.gpt4, 0) /
                products.length,
            ),
          },
          {
            label: "Claude",
            rate: Math.round(
              products.reduce((sum, p) => sum + p.winRate.claude, 0) /
                products.length,
            ),
          },
          {
            label: "Gemini",
            rate: Math.round(
              products.reduce((sum, p) => sum + p.winRate.gemini, 0) /
                products.length,
            ),
          },
        ]
      : [];

  const completed = scans.filter((scan) => scan.status === "complete");

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

  const activity = scans.slice(0, 5).map((scan) => ({
    id: scan.id,
    type:
      scan.status === "complete"
        ? ("simulation_complete" as const)
        : ("simulation_running" as const),
    message:
      scan.status === "complete"
        ? translate("simulationComplete", {
            wins: scan.wins,
            losses: scan.losses,
          })
        : translate("simulationInProgress", {
            completed: scan.completedSimulations,
            total: scan.totalSimulations,
          }),
    detail: scan.topFinding,
    timestamp: scan.createdAt.toISOString(),
  }));

  return <OverviewCharts models={models} trend={trend} activity={activity} />;
};

const TopProducts = async ({ params }: { params: StoreParams }) => {
  await connection();
  const { store } = await params;
  const translate = await getTranslations("dashboard.shared");
  const data = await unwrapResult(
    Product.gatherIntelligence(Environment.SERVER, { store }),
  );

  const sorted = [...data.products]
    .sort((a, b) => b.winRate.total - a.winRate.total)
    .slice(0, 10);

  return (
    <ProductsTable
      rows={sorted}
      pageCount={1}
      kicker={translate("sections.catalog")}
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
      kicker={translate("sections.competitiveLandscape")}
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
