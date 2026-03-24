import {
  ArrowRightIcon,
  BoxMinusIcon,
  CheckBadgeIcon,
  DownloadIcon,
  PlusIcon,
  RadarIcon,
  TrendUpIcon,
} from "@zenncore/icons";
import { unwrapResult } from "@zenncore/utils";
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
import { ProductsTable } from "../_components/products-table";
import {
  OptimizationBreakdown,
  ProductsModelRates,
  ProductsWinRateTrend,
  QualityDistribution,
} from "./_components/products-charts";
import { ScanInsightsCarousel } from "./_components/scan-insights-carousel";

export default ({ searchParams }: SearchParamsProps<keyof Pager>) => (
  <div className="flex flex-col">
    <div className="mx-8 border-accent-foreground border-x">
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="mx-8 flex items-baseline justify-between px-6 py-8">
          <div>
            <h1 className="font-medium text-4xl text-foreground">Products</h1>
            <Suspense
              fallback={
                <p className="mt-1 font-light text-2xl text-foreground-dimmed">
                  Loading...
                </p>
              }
            >
              <LastScanned />
            </Suspense>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" color="accent">
              <DownloadIcon className="size-4" />
              Export
            </Button>
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
        <div className="mx-8">
          <Suspense fallback={<StatsSkeleton />}>
            <StatCards />
          </Suspense>
        </div>
      </div>

      <div className="h-8" />
      <div className="-mx-8 border-accent-foreground border-t border-b">
        <div className="mx-8">
          <Suspense fallback={<ChartSkeleton />}>
            <Performance />
          </Suspense>
        </div>
      </div>

      <div className="h-8" />
      <div className="-mx-8 border-accent-foreground border-t border-b">
        <div className="mx-8">
          <Suspense fallback={<TableSkeleton />}>
            <Products searchParams={searchParams} />
          </Suspense>
        </div>
      </div>

      <div className="h-8" />
      <div className="-mx-8 mb-12 border-accent-foreground border-t border-b">
        <div className="mx-8">
          <Suspense fallback={<TrafficSkeleton />}>
            <AgentTraffic />
          </Suspense>
        </div>
      </div>

      <div className="-mx-8 mb-12 border-accent-foreground border-t border-b">
        <div className="mx-8">
          <Suspense fallback={<InsightsSkeleton />}>
            <Insights />
          </Suspense>
        </div>
      </div>
    </div>
  </div>
);

const LastScanned = async () => {
  await connection();
  const data = await unwrapResult(
    Product.gatherIntelligence(Environment.SERVER),
  );

  return (
    <p className="mt-1 font-light text-2xl text-foreground-dimmed">
      {data.scan?.updatedAt
        ? `Last scanned: ${formatRelativeTime(data.scan.updatedAt)}`
        : "No scans run yet"}
    </p>
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
      <div className="grid h-39 min-h-39 grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Products", icon: <RadarIcon className="size-12" /> },
          {
            label: "Average Win Rate",
            icon: <BoxMinusIcon className="size-12" />,
          },
          {
            label: "High Performers",
            icon: <TrendUpIcon className="size-12" />,
          },
          {
            label: "Needs Attention",
            icon: <CheckBadgeIcon className="size-12" />,
          },
        ].map(({ label, icon }) => (
          <div key={label} className="h-full bg-background-dimmed p-4">
            <p className="mb-4 text-foreground-dimmed">{label}</p>
            <div className="flex flex-col items-center justify-center gap-2">
              {icon}
              <p className="text-foreground-dimmed">No data yet</p>
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
      <div className="flex flex-col justify-between bg-background-dimmed p-4">
        <p className="text-foreground-dimmed">Total Products</p>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-4xl text-foreground tabular-nums">
            {products.length}
          </span>
          <span className="text-foreground-dimmed">/ 100</span>
        </div>
        <div className="mt-4">
          <div className="h-1 w-full bg-accent-foreground">
            <div
              className="h-full bg-primary"
              style={{ width: `${(products.length / 100) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-foreground-dimmed">
            {100 - products.length} slots remaining
          </p>
        </div>
      </div>

      <div className="flex flex-col justify-between bg-background-dimmed p-4">
        <p className="text-foreground-dimmed">Average Win Rate</p>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-4xl text-foreground tabular-nums">
            {averageWinRate}%
          </span>
          {trend !== 0 && (
            <span className={trend >= 0 ? "text-success" : "text-error"}>
              {trend >= 0 ? "+" : ""}
              {trend}% since last scan
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col justify-between bg-background-dimmed p-4">
        <p className="text-foreground-dimmed">High Performers</p>
        <span className="mt-2 text-4xl text-success tabular-nums">
          {highPerformers}
        </span>
        <p className="mt-2 font-light text-foreground-dimmed text-sm">
          products with {"\u2265"}60% win rate
        </p>
      </div>

      <div className="flex flex-col justify-between bg-background-dimmed p-4">
        <p className="text-foreground-dimmed">Needs Attention</p>
        <span className="mt-2 text-4xl text-error tabular-nums">
          {needsAttention}
        </span>
        <p className="mt-2 font-light text-foreground-dimmed text-sm">
          products below 30% win rate
        </p>
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
      label: "Good (\u226575%)",
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
      <div className="bg-background-dimmed xl:col-span-2">
        <div className="flex items-start justify-between p-4">
          <div>
            <p className="font-light text-foreground-dimmed uppercase tracking-widest">
              Performance
            </p>
            <p className="mt-1 font-medium text-2xl text-foreground">
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
        <div className="flex-1 bg-background-dimmed">
          <QualityDistribution
            segments={segments}
            total={products.length}
            averageQuality={average}
          />
        </div>
        <div className="flex-1 bg-background-dimmed">
          <OptimizationBreakdown
            optimized={optimized}
            pending={pending}
            unoptimized={unoptimized}
            total={products.length}
          />
        </div>
        <div className="flex items-center justify-between bg-background-dimmed p-4">
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

  const pageCount = Math.max(
    1,
    Math.ceil(pagination.total / pagination.size),
  );

  return (
    <ProductsTable
      paginated
      rows={items}
      pageCount={pageCount}
      pageSize={pagination.size}
      pageIndex={pagination.page}
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
    <div className="bg-background-dimmed p-4">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-light text-foreground-dimmed uppercase tracking-widest">
            Traffic
          </p>
          <p className="mt-1 font-medium text-2xl text-foreground">
            AI Agent Visits to Products
          </p>
          <p className="mt-1 font-light text-foreground-dimmed text-sm">
            Browser-visible AI and referral signals from your ScriptTag tracker.
          </p>
        </div>
        <p className="text-4xl text-foreground tabular-nums">
          {summary.total30d}
          <span className="ml-1 font-light text-foreground-dimmed text-sm">
            last 30d
          </span>
        </p>
      </div>

      <AgentVisitsChart data={timeSeries} className="mb-6" />

      {summary.byAgentType.length === 0 ? (
        <p className="font-light text-foreground-dimmed text-sm">
          No AI agent visits recorded yet. Traffic appears when shoppers arrive
          via AI referrers or user-agents your tracker recognizes.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
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
  const completed = scans.filter((scan) => scan.status === "completed");

  console.log({ completed });

  // if (completed.length === 0) return null;

  const items = scans.map((scan) => ({
    date: scan.createdAt.toISOString(),
    ...scan,
  }));

  return <ScanInsightsCarousel scans={items} />;
};

const StatsSkeleton = () => (
  <div className="grid h-39 min-h-39 grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-2 xl:grid-cols-4">
    {["rate", "win", "high", "attention"].map((key) => (
      <div key={key} className="bg-background-dimmed p-4">
        <div className="h-4 w-28 animate-pulse bg-foreground/10" />
        <div className="mt-4 h-10 w-20 animate-pulse bg-foreground/10" />
        <div className="mt-3 h-3 w-32 animate-pulse bg-foreground/10" />
      </div>
    ))}
  </div>
);

const ChartSkeleton = () => (
  <div className="grid grid-cols-1 gap-px bg-accent-foreground xl:grid-cols-3">
    <div className="bg-background-dimmed xl:col-span-2">
      <div className="p-4">
        <div className="h-3 w-24 animate-pulse bg-foreground/10" />
        <div className="mt-2 h-7 w-40 animate-pulse bg-foreground/10" />
      </div>
      <div className="grid grid-cols-3 divide-x divide-accent-foreground border-accent-foreground border-y px-4">
        {["a", "b", "c"].map((key) => (
          <div
            key={key}
            className="flex flex-col items-center gap-1 p-6 first:pl-0 last:pr-0"
          >
            <div className="flex w-full flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-6 animate-pulse bg-foreground/10" />
                <div className="h-3 w-16 animate-pulse bg-foreground/10" />
              </div>
              <div className="flex items-baseline gap-1">
                <div className="h-10 w-12 animate-pulse bg-foreground/10" />
                <div className="h-5 w-4 animate-pulse bg-foreground/10" />
              </div>
            </div>
            <div className="mt-2 h-1 w-full animate-pulse bg-foreground/10" />
          </div>
        ))}
      </div>
      <div className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="h-3 w-28 animate-pulse bg-foreground/10" />
        </div>
        <div className="h-64 w-full animate-pulse bg-foreground/10" />
      </div>
    </div>
    <div className="flex flex-col gap-px bg-accent-foreground">
      <div className="flex-1 bg-background-dimmed p-4">
        <div className="h-3 w-24 animate-pulse bg-foreground/10" />
        <div className="mt-2 h-7 w-40 animate-pulse bg-foreground/10" />
        <div className="mt-6 h-2 w-full animate-pulse bg-foreground/10" />
        <div className="mt-4 grid grid-cols-3 gap-4">
          {["x", "y", "z"].map((key) => (
            <div key={key} className="space-y-2">
              <div className="h-3 w-16 animate-pulse bg-foreground/10" />
              <div className="h-4 w-8 animate-pulse bg-foreground/10" />
            </div>
          ))}
        </div>
      </div>
      <div className="bg-background-dimmed p-4">
        <div className="h-3 w-24 animate-pulse bg-foreground/10" />
        <div className="mt-2 h-7 w-40 animate-pulse bg-foreground/10" />
        <div className="mt-6 h-2 w-full animate-pulse bg-foreground/10" />
        <div className="mt-4 grid grid-cols-3 gap-4">
          {["x", "y", "z"].map((key) => (
            <div key={key} className="space-y-2">
              <div className="h-3 w-16 animate-pulse bg-foreground/10" />
              <div className="h-8 w-10 animate-pulse bg-foreground/10" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between bg-background-dimmed p-4">
        <div className="h-9 w-28 animate-pulse bg-foreground/10" />
        <div className="h-9 w-36 animate-pulse bg-foreground/10" />
      </div>
    </div>
  </div>
);

const TableSkeleton = () => (
  <div>
    <div className="flex items-center justify-between border-accent-foreground border-b px-4 py-3">
      <div className="h-7 w-40 animate-pulse bg-foreground/10" />
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
          {["a", "b", "c", "d", "e"].map((key) => (
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
  <div className="bg-background-dimmed p-4">
    <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="h-3 w-16 animate-pulse bg-foreground/10" />
        <div className="mt-2 h-7 w-48 animate-pulse bg-foreground/10" />
        <div className="mt-1 h-4 w-64 animate-pulse bg-foreground/10" />
      </div>
      <div className="h-10 w-20 animate-pulse bg-foreground/10" />
    </div>
    <div className="mb-6 flex items-center gap-6">
      {["a", "b", "c"].map((key) => (
        <div key={key} className="flex items-center gap-2">
          <div className="size-4 animate-pulse bg-foreground/10" />
          <div className="h-3 w-14 animate-pulse bg-foreground/10" />
        </div>
      ))}
    </div>
    <div className="mb-6 h-64 w-full animate-pulse bg-foreground/10" />
    <div className="flex flex-col gap-3">
      {["d", "e", "f"].map((key) => (
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
  <div>
    <div className="flex items-start justify-between">
      <div>
        <div className="h-3 w-16 animate-pulse bg-foreground/10" />
        <div className="mt-2 h-7 w-28 animate-pulse bg-foreground/10" />
      </div>
      <div className="space-y-1.5 text-right">
        <div className="h-4 w-24 animate-pulse bg-foreground/10" />
        <div className="h-3 w-32 animate-pulse bg-foreground/10" />
      </div>
    </div>
    <div className="my-5 h-px animate-pulse bg-foreground/10" />
    <div className="mb-4 h-5 w-3/4 animate-pulse bg-foreground/10" />
    <div className="grid grid-cols-1 gap-px sm:grid-cols-[1fr_auto]">
      <div className="h-24 animate-pulse bg-foreground/10" />
      <div className="h-24 w-28 animate-pulse bg-foreground/10" />
    </div>
    <div className="mt-6">
      <div className="mb-3 h-3 w-32 animate-pulse bg-foreground/10" />
      <div className="flex flex-wrap gap-2">
        {["a", "b", "c", "d"].map((key) => (
          <div key={key} className="h-7 w-24 animate-pulse bg-foreground/10" />
        ))}
      </div>
    </div>
  </div>
);
