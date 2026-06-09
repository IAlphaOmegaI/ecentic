import {
  ArrowRightIcon,
  BullseyeIcon,
  GaugeIcon,
  PlusIcon,
  RadarIcon,
  TrendDownIcon,
  TrendUpIcon,
} from "@zenncore/icons";
import { cn, unwrapResult } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import type { SearchParamsProps } from "@zenncore/web/types";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { formatRelativeTime } from "@/lib/date";
import * as Product from "@/server/app/product";
import * as Scan from "@/server/app/scan";
import * as Tracking from "@/server/app/tracking";
import { Environment } from "@/server/utils/environment";
import { extractPaginationParams, type Pager } from "@/server/utils/pagination";
import { AgentVisitsChart } from "../_components/agent-visits-chart";
import {
  ClosingGutter,
  Crosshair,
  SectionGutter,
  SectionKicker,
  StatLabel,
} from "../_components/grid";
import { ProductsTable } from "../_components/products-table";
import {
  OptimizationBreakdown,
  ProductsModelRates,
  ProductsWinRateTrend,
  QualityDistribution,
} from "./_components/products-charts";
import { ScanInsightsCarousel } from "./_components/scan-insights-carousel";

const emptyStatCards = [
  { label: "Total Products", icon: RadarIcon, color: "text-warning" },
  { label: "Average Win Rate", icon: GaugeIcon, color: "text-primary" },
  { label: "High Performers", icon: TrendUpIcon, color: "text-success" },
  { label: "Needs Attention", icon: BullseyeIcon, color: "text-error" },
] as const;

export default ({ searchParams }: SearchParamsProps<keyof Pager>) => (
  <div className="flex flex-col">
    <div className="mx-8 border-accent-foreground border-x">
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="mx-8 flex flex-col gap-6 px-6 py-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Suspense
              fallback={
                <div className="h-4 w-56 animate-pulse bg-foreground/10" />
              }
            >
              <LastScanned />
            </Suspense>
            <h1 className="mt-3 font-medium text-4xl text-foreground">
              Products
            </h1>
            <p className="mt-1 font-light text-foreground-dimmed text-lg">
              How each product in your catalog performs across AI shopping
              agents.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* <Button variant="outline" color="accent">
              <DownloadIcon className="size-4" />
              Export
            </Button> */}
            <Button
              variant="flat"
              color="primary"
              render={<Link href="/onboarding/products" />}
            >
              <PlusIcon className="size-4" />
              Add Products
            </Button>
          </div>
        </div>
      </div>

      <div className="-mx-8 border-accent-foreground border-b">
        <div className="relative mx-8 bg-background-rich">
          <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
          <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
          <Suspense fallback={<StatsSkeleton />}>
            <StatCards />
          </Suspense>
        </div>
      </div>

      <SectionGutter />

      <div className="-mx-8 border-accent-foreground border-t border-b">
        <div className="mx-8 bg-background-rich">
          <Suspense fallback={<ChartSkeleton />}>
            <Performance />
          </Suspense>
        </div>
      </div>

      <SectionGutter />

      <div className="-mx-8 border-accent-foreground border-t border-b">
        <div className="mx-8 bg-background-rich">
          <Suspense fallback={<TableSkeleton />}>
            <Products searchParams={searchParams} />
          </Suspense>
        </div>
      </div>

      <SectionGutter />

      <div className="-mx-8 border-accent-foreground border-t border-b">
        <div className="mx-8 bg-background-rich">
          <Suspense fallback={<TrafficSkeleton />}>
            <AgentTraffic />
          </Suspense>
        </div>
      </div>

      <SectionGutter />

      <div className="-mx-8 border-accent-foreground border-t border-b">
        <div className="mx-8 bg-background-rich">
          <Suspense fallback={<InsightsSkeleton />}>
            <Insights />
          </Suspense>
        </div>
      </div>

      <ClosingGutter />
    </div>
  </div>
);

const LastScanned = async () => {
  await connection();
  const data = await unwrapResult(
    Product.gatherIntelligence(Environment.SERVER),
  );

  return (
    <div className="flex items-center gap-2.5 text-foreground-dimmed text-xs uppercase tracking-[0.2em]">
      <span
        className={cn(
          "size-2",
          data.scan?.updatedAt ? "bg-success" : "bg-accent-rich",
        )}
      />
      {data.scan?.updatedAt
        ? `Live — last scanned ${formatRelativeTime(data.scan.updatedAt)}`
        : "No scans run yet"}
    </div>
  );
};

const StatCards = async () => {
  await connection();
  const data = await unwrapResult(
    Product.gatherIntelligence(Environment.SERVER),
  );
  const { products } = data;

  if (products.length === 0)
    return (
      <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-2 xl:grid-cols-4">
        {emptyStatCards.map(({ label, icon: Icon, color }) => (
          <div
            key={label}
            className="relative flex h-44 flex-col justify-between bg-background-rich p-5"
          >
            <StatLabel
              label={label}
              icon={<Icon className={cn("size-8 shrink-0", color)} />}
            />
            <div className="flex flex-col items-center gap-2 pb-4">
              <p className="font-light text-foreground-dimmed text-sm">
                No data yet
              </p>
            </div>
          </div>
        ))}
      </div>
    );

  const averageWinRate = Math.round(
    products.reduce((sum, product) => sum + product.winRate.total, 0) /
      products.length,
  );

  const highPerformers = products.filter(
    (product) => product.winRate.total >= 60,
  ).length;

  const needsAttention = products.filter(
    (product) => product.winRate.total < 30,
  ).length;

  const scans = await unwrapResult(Scan.getLatest(Environment.SERVER));
  const completed = scans.filter((scan) => scan.status === "completed");

  const trend = (() => {
    if (completed.length < 2) return 0;

    const current = completed[0];
    const previous = completed[1];

    if (!current || !previous) return 0;

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
          label="Total Products"
          icon={<RadarIcon className="size-8 shrink-0 text-warning" />}
        />
        <div>
          <p className="font-medium text-5xl text-foreground tabular-nums tracking-tight">
            {products.length}
            <span className="ml-1 font-light text-2xl text-foreground-dimmed">
              / 100
            </span>
          </p>
          <div className="mt-3">
            <div className="h-1 w-full bg-accent-foreground">
              <div
                className="h-full bg-primary"
                style={{ width: `${(products.length / 100) * 100}%` }}
              />
            </div>
            <p className="mt-2 font-light text-foreground-dimmed text-xs">
              {100 - products.length} slots remaining
            </p>
          </div>
        </div>
      </div>

      <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
        <StatLabel
          label="Average Win Rate"
          icon={<GaugeIcon className="size-8 shrink-0 text-primary" />}
        />
        <div>
          <p className="font-medium text-5xl text-foreground tabular-nums tracking-tight">
            {averageWinRate}
            <span className="ml-0.5 font-light text-2xl text-foreground-dimmed">
              %
            </span>
          </p>
          {trend !== 0 ? (
            <p className="mt-3 flex items-center gap-2">
              <span
                className={cn(
                  "flex items-center gap-1.5 text-sm",
                  trend >= 0 ? "text-success" : "text-error",
                )}
              >
                {trend >= 0 ? (
                  <TrendUpIcon className="size-6" />
                ) : (
                  <TrendDownIcon className="size-6" />
                )}
                {trend >= 0 ? "+" : ""}
                {trend}%
              </span>
              <span className="font-light text-foreground-dimmed text-sm">
                vs last scan
              </span>
            </p>
          ) : (
            <p className="mt-3 font-light text-foreground-dimmed text-sm">
              across {products.length}{" "}
              {products.length === 1 ? "product" : "products"}
            </p>
          )}
        </div>
      </div>

      <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
        <StatLabel
          label="High Performers"
          icon={<TrendUpIcon className="size-8 shrink-0 text-success" />}
        />
        <div>
          <p className="font-medium text-5xl text-success tabular-nums tracking-tight">
            {highPerformers}
          </p>
          <p className="mt-3 font-light text-foreground-dimmed text-sm">
            products with {"≥"}60% win rate
          </p>
        </div>
      </div>

      <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
        <StatLabel
          label="Needs Attention"
          icon={<BullseyeIcon className="size-8 shrink-0 text-error" />}
        />
        <div>
          <p className="font-medium text-5xl text-error tabular-nums tracking-tight">
            {needsAttention}
          </p>
          <p className="mt-3 font-light text-foreground-dimmed text-sm">
            products below 30% win rate
          </p>
        </div>
      </div>
    </div>
  );
};

const Performance = async () => {
  await connection();
  const [{ products }, scans] = await Promise.all([
    unwrapResult(Product.gatherIntelligence(Environment.SERVER)),
    unwrapResult(Scan.getLatest(Environment.SERVER)),
  ]);

  const models =
    products.length > 0
      ? [
          {
            label: "GPT-4",
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
          {
            label: "Perplexity",
            rate: Math.round(
              products.reduce(
                (sum, p) => sum + (p.winRate.perplexity ?? 0),
                0,
              ) / products.length,
            ),
          },
        ]
      : [];

  const completed = scans.filter((scan) => scan.status === "completed");

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

  const data = trend.map((point) => point.winRate);
  const labels = trend.map((point) => formatRelativeTime(new Date(point.date)));

  const change = (() => {
    if (data.length < 2) return 0;
    return (data[data.length - 1] ?? 0) - (data[0] ?? 0);
  })();

  const average =
    products.length > 0
      ? Math.round(
          products.reduce((sum, p) => sum + p.quality, 0) / products.length,
        )
      : 0;

  const segments = [
    {
      label: "Good (≥75%)",
      count: products.filter((p) => p.quality >= 75).length,
      color: "bg-success",
    },
    {
      label: "Fair (50-74%)",
      count: products.filter((p) => p.quality >= 50 && p.quality < 75).length,
      color: "bg-warning",
    },
    {
      label: "Poor (<50%)",
      count: products.filter((p) => p.quality < 50).length,
      color: "bg-error",
    },
  ];

  const totalSimulations = products.reduce((sum, p) => sum + p.simulations, 0);

  const optimized = products.filter(
    (p) => p.quality >= 75 && p.winRate.total >= 60,
  ).length;

  const pending = products.filter(
    (p) =>
      p.simulations > 0 &&
      !(p.quality >= 75 && p.winRate.total >= 60) &&
      p.winRate.total >= 30,
  ).length;
  const unoptimized = products.length - optimized - pending;

  return (
    <div className="grid grid-cols-1 gap-px bg-accent-foreground xl:grid-cols-3">
      <div className="flex flex-col bg-background-rich xl:col-span-2">
        <div className="flex items-start justify-between p-4">
          <div>
            <SectionKicker>01 — Performance</SectionKicker>
            <p className="mt-2 font-medium text-2xl text-foreground">
              Win Rate by Model
            </p>
          </div>
          <p className="font-light text-foreground-dimmed text-sm">
            {totalSimulations} total simulations
          </p>
        </div>

        <ProductsModelRates models={models} />

        <ProductsWinRateTrend data={data} labels={labels} change={change} />
      </div>

      <div className="flex flex-col gap-px bg-accent-foreground">
        <div className="flex-1 bg-background-rich">
          <QualityDistribution
            segments={segments}
            total={products.length}
            averageQuality={average}
          />
        </div>
        <div className="flex-1 bg-background-rich">
          <OptimizationBreakdown
            optimized={optimized}
            pending={pending}
            unoptimized={unoptimized}
            total={products.length}
          />
        </div>
        <div className="flex items-center justify-between bg-background-rich p-4">
          <Button
            variant="outline"
            color="accent"
            render={<Link href="/dashboard/optimize" />}
          >
            Optimizations
          </Button>
          <Button
            variant="outline"
            color="primary"
            render={<Link href="/dashboard/ucp" />}
          >
            UCP Manager <ArrowRightIcon className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

const Products = async ({
  searchParams,
}: {
  searchParams: SearchParamsProps<keyof Pager>["searchParams"];
}) => {
  await connection();
  const { page, size } = await extractPaginationParams(searchParams);
  const { items, pagination } = await unwrapResult(
    Product.paginateWithIntelligence(Environment.SERVER, { page, size }),
  );

  const pageCount = Math.max(1, Math.ceil(pagination.total / pagination.size));

  return (
    <ProductsTable
      paginated
      rows={items}
      pageCount={pageCount}
      pageSize={pagination.size}
      pageIndex={pagination.page}
      kicker="02 — Catalog"
      action={
        <p className="font-light text-foreground-dimmed">
          {pagination.total} products
        </p>
      }
    />
  );
};

const AgentTraffic = async () => {
  await connection();
  const [summary, timeSeries] = await Promise.all([
    unwrapResult(Tracking.getAgentTrafficSummary(Environment.SERVER)),
    unwrapResult(Tracking.getAgentTrafficTimeSeries(Environment.SERVER)),
  ]);

  const max = Math.max(1, ...summary.byAgentType.map((entry) => entry.count));

  return (
    <div className="bg-background-rich">
      <div className="flex flex-col gap-6 p-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <SectionKicker>03 — Traffic</SectionKicker>
          <p className="mt-2 font-medium text-2xl text-foreground">
            AI Agent Visits to Products
          </p>
          <p className="mt-1 font-light text-foreground-dimmed text-sm">
            Browser-visible AI and referral signals from your ScriptTag tracker.
          </p>
        </div>
        <p className="font-medium text-5xl text-foreground tabular-nums tracking-tight">
          {summary.total30d}
          <span className="ml-2 font-light text-foreground-dimmed text-sm">
            last 30d
          </span>
        </p>
      </div>

      <AgentVisitsChart data={timeSeries} className="px-4 pb-6" />

      {summary.byAgentType.length === 0 ? (
        <p className="px-4 pb-4 font-light text-foreground-dimmed text-sm">
          No AI agent visits recorded yet. Traffic appears when shoppers arrive
          via AI referrers or user-agents your tracker recognizes.
        </p>
      ) : (
        <ul className="flex flex-col gap-3 px-4 pb-4">
          {summary.byAgentType.map((entry) => (
            <li key={entry.agentType}>
              <div className="mb-1 flex items-center justify-between gap-4">
                <span className="font-light text-foreground text-sm">
                  {entry.label}
                </span>
                <span className="shrink-0 font-medium text-foreground text-sm tabular-nums">
                  {entry.count}
                </span>
              </div>
              <div className="h-1 w-full bg-accent-foreground">
                <div
                  className="h-full bg-primary"
                  style={{
                    width: `${Math.round((entry.count / max) * 100)}%`,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const Insights = async () => {
  await connection();
  const scans = await unwrapResult(Scan.getLatest(Environment.SERVER));

  const items = scans.map((scan) => ({
    date: scan.createdAt.toISOString(),
    ...scan,
  }));

  return <ScanInsightsCarousel scans={items} />;
};

const StatsSkeleton = () => (
  <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-2 xl:grid-cols-4">
    {(["a", "b", "c", "d"] as const).map((key) => (
      <div
        key={key}
        className="relative flex h-44 flex-col justify-between bg-background-rich p-5"
      >
        <div className="flex items-center justify-between">
          <div className="h-3 w-28 animate-pulse bg-foreground/10" />
          <div className="absolute top-5 right-5 size-8 animate-pulse bg-foreground/10" />
        </div>
        <div>
          <div className="h-11 w-24 animate-pulse bg-foreground/10" />
          <div className="mt-3 h-4 w-32 animate-pulse bg-foreground/10" />
        </div>
      </div>
    ))}
  </div>
);

const ChartSkeleton = () => (
  <div className="grid grid-cols-1 gap-px bg-accent-foreground xl:grid-cols-3">
    <div className="bg-background-rich xl:col-span-2">
      <div className="p-4">
        <div className="h-3 w-32 animate-pulse bg-foreground/10" />
        <div className="mt-2 h-8 w-44 animate-pulse bg-foreground/10" />
      </div>
      <div className="grid grid-cols-4 divide-x divide-accent-foreground border-accent-foreground border-y px-4">
        {(["a", "b", "c", "d"] as const).map((key) => (
          <div
            key={key}
            className="flex flex-col items-center gap-1 p-6 first:pl-0 last:pr-0"
          >
            <div className="flex w-full flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-8 animate-pulse rounded-full bg-foreground/10" />
                <div className="h-3 w-14 animate-pulse bg-foreground/10" />
              </div>
              <div className="flex items-baseline gap-0.5">
                <div className="h-8 w-10 animate-pulse bg-foreground/10" />
                <div className="h-4 w-3 animate-pulse bg-foreground/10" />
              </div>
            </div>
            <div className="mt-2 h-1 w-full animate-pulse bg-foreground/10" />
          </div>
        ))}
      </div>
      <div className="p-4">
        <div className="mb-4 h-3 w-28 animate-pulse bg-foreground/10" />
        <div className="h-64 w-full animate-pulse bg-foreground/10" />
      </div>
    </div>
    <div className="flex flex-col gap-px bg-accent-foreground">
      <div className="flex-1 bg-background-rich p-4">
        <div className="h-7 w-40 animate-pulse bg-foreground/10" />
        <div className="mt-6 h-2 w-full animate-pulse bg-foreground/10" />
        <div className="mt-4 grid grid-cols-3 gap-4">
          {(["x", "y", "z"] as const).map((key) => (
            <div key={key} className="space-y-2">
              <div className="h-3 w-16 animate-pulse bg-foreground/10" />
              <div className="h-4 w-8 animate-pulse bg-foreground/10" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 bg-background-rich p-4">
        <div className="h-7 w-40 animate-pulse bg-foreground/10" />
        <div className="mt-6 h-2 w-full animate-pulse bg-foreground/10" />
        <div className="mt-4 grid grid-cols-3 gap-4">
          {(["x", "y", "z"] as const).map((key) => (
            <div key={key} className="space-y-2">
              <div className="h-3 w-16 animate-pulse bg-foreground/10" />
              <div className="h-8 w-10 animate-pulse bg-foreground/10" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between bg-background-rich p-4">
        <div className="h-9 w-28 animate-pulse bg-foreground/10" />
        <div className="h-9 w-36 animate-pulse bg-foreground/10" />
      </div>
    </div>
  </div>
);

const TableSkeleton = () => (
  <div>
    <div className="flex items-end justify-between border-accent-foreground border-b p-4">
      <div className="space-y-2">
        <div className="h-3 w-28 animate-pulse bg-foreground/10" />
        <div className="h-7 w-40 animate-pulse bg-foreground/10" />
      </div>
      <div className="h-4 w-24 animate-pulse bg-foreground/10" />
    </div>
    <div className="overflow-x-auto bg-background-rich">
      <table className="w-full">
        <thead>
          <tr className="border-accent-foreground border-b">
            {[
              "Product",
              "Price",
              "Win Rate",
              "GPT-4",
              "Claude",
              "Gemini",
              "Perplexity",
              "Quality",
              "Last Scan",
              "",
            ].map((header) => (
              <th key={header} className="px-4 py-3 text-left">
                {header && (
                  <div className="h-3 w-16 animate-pulse bg-foreground/10" />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(["a", "b", "c", "d", "e"] as const).map((key) => (
            <tr
              key={key}
              className="border-accent-foreground border-b last:border-b-0"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="size-9 shrink-0 animate-pulse bg-foreground/10" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-32 animate-pulse bg-foreground/10" />
                    <div className="h-3 w-16 animate-pulse bg-foreground/10" />
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="h-4 w-14 animate-pulse bg-foreground/10" />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-12 animate-pulse bg-foreground/10" />
                  <div className="h-4 w-8 animate-pulse bg-foreground/10" />
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="h-4 w-8 animate-pulse bg-foreground/10" />
              </td>
              <td className="px-4 py-3">
                <div className="h-4 w-8 animate-pulse bg-foreground/10" />
              </td>
              <td className="px-4 py-3">
                <div className="h-4 w-8 animate-pulse bg-foreground/10" />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-1 w-10 animate-pulse bg-foreground/10" />
                  <div className="h-4 w-6 animate-pulse bg-foreground/10" />
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="h-3 w-14 animate-pulse bg-foreground/10" />
              </td>
              <td className="px-4 py-3">
                <div className="h-4 w-10 animate-pulse bg-foreground/10" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const TrafficSkeleton = () => (
  <div className="bg-background-rich">
    <div className="flex flex-col gap-6 p-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="h-3 w-24 animate-pulse bg-foreground/10" />
        <div className="mt-2 h-8 w-64 animate-pulse bg-foreground/10" />
        <div className="mt-1 h-4 w-72 animate-pulse bg-foreground/10" />
      </div>
      <div className="h-12 w-28 animate-pulse bg-foreground/10" />
    </div>
    <div className="flex items-center gap-6 px-4">
      {(["a", "b", "c", "d"] as const).map((key) => (
        <div key={key} className="flex items-center gap-2">
          <div className="size-4 animate-pulse bg-foreground/10" />
          <div className="h-3 w-14 animate-pulse bg-foreground/10" />
        </div>
      ))}
    </div>
    <div className="px-4 pt-4 pb-6">
      <div className="h-64 w-full animate-pulse bg-foreground/10" />
    </div>
    <div className="flex flex-col gap-3 px-4 pb-4">
      {(["d", "e", "f"] as const).map((key) => (
        <div key={key}>
          <div className="mb-1 flex items-center justify-between">
            <div className="h-4 w-28 animate-pulse bg-foreground/10" />
            <div className="h-4 w-8 animate-pulse bg-foreground/10" />
          </div>
          <div className="h-1 w-full animate-pulse bg-foreground/10" />
        </div>
      ))}
    </div>
  </div>
);

const InsightsSkeleton = () => (
  <div className="bg-background-rich">
    <div className="flex items-start justify-between border-accent-foreground border-b p-4">
      <div className="space-y-2">
        <div className="h-3 w-24 animate-pulse bg-foreground/10" />
        <div className="h-7 w-32 animate-pulse bg-foreground/10" />
      </div>
      <div className="space-y-1.5">
        <div className="h-4 w-24 animate-pulse bg-foreground/10" />
        <div className="h-3 w-28 animate-pulse bg-foreground/10" />
      </div>
    </div>
    <div className="p-6">
      <div className="h-5 w-3/4 animate-pulse bg-foreground/10" />
    </div>
    <div className="grid grid-cols-1 gap-px border-accent-foreground border-y bg-accent-foreground sm:grid-cols-[1fr_auto]">
      <div className="bg-background-rich p-6">
        <div className="size-12 animate-pulse bg-foreground/10" />
        <div className="mt-4 h-3 w-16 animate-pulse bg-foreground/10" />
        <div className="mt-2 h-4 w-full animate-pulse bg-foreground/10" />
      </div>
      <div className="flex flex-col items-center justify-center bg-background-rich p-6 sm:min-w-44">
        <div className="h-11 w-20 animate-pulse bg-foreground/10" />
        <div className="mt-2 h-4 w-16 animate-pulse bg-foreground/10" />
      </div>
    </div>
    <div className="flex flex-col gap-4 p-4">
      <div className="h-3 w-32 animate-pulse bg-foreground/10" />
      <div className="flex flex-wrap gap-2">
        {(["a", "b", "c", "d"] as const).map((key) => (
          <div key={key} className="h-7 w-24 animate-pulse bg-foreground/10" />
        ))}
      </div>
    </div>
    <div className="flex items-center justify-between border-accent-foreground border-t p-4">
      <div className="space-y-2">
        <div className="h-3 w-16 animate-pulse bg-foreground/10" />
        <div className="h-7 w-28 animate-pulse bg-foreground/10" />
      </div>
      <div className="h-9 w-24 animate-pulse bg-foreground/10" />
    </div>
  </div>
);
