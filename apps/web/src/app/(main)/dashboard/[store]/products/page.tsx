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
import { AgentVisitsChart } from "../../_components/agent-visits-chart";
import {
  Crosshair,
  SectionGutter,
  SectionKicker,
  StatLabel,
  StatusPill,
} from "../../_components/grid";
import { ProductsTable } from "../../_components/products-table";
import {
  OptimizationBreakdown,
  ProductsModelRates,
  ProductsWinRateTrend,
  QualityDistribution,
} from "./_components/products-charts";
import { ScanInsightsCarousel } from "./_components/scan-insights-carousel";
import {
  ChartSkeleton,
  InsightsSkeleton,
  StatsSkeleton,
  TableSkeleton,
  TrafficSkeleton,
} from "./skeletons";

const emptyStatCards = [
  { label: "Total Products", icon: RadarIcon },
  { label: "Average Win Rate", icon: GaugeIcon },
  { label: "High Performers", icon: TrendUpIcon },
  { label: "Needs Attention", icon: BullseyeIcon },
] as const;

/**
 * Store-wide call-to-action: enabling the app embed adds structured data to
 * every product page at once, so the nudge belongs here — not per product.
 * Renders nothing while the embed is live (or for non-Shopify stores).
 */
const EmbedBanner = async ({ store }: { store: string }) => {
  await connection();
  const result = await Product.getStoreEmbedStatus(Environment.SERVER, {
    store,
  });
  if (!result.success || !result.data.embedOff || !result.data.themeEditorUrl)
    return null;

  return (
    <div className="-mx-8 border-accent-foreground border-b">
      <div className="relative mx-8 flex flex-col gap-3 border-warning/30 bg-warning/5 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-sm text-warning">
            Structured data is not reaching your product pages
          </p>
          <p className="mt-0.5 max-w-2xl text-foreground-dimmed text-sm">
            The “Agentic structured data” app embed is off, so AI agents don't
            see machine-readable data on your products. Enabling it once adds
            structured data to every product in this store.
          </p>
        </div>
        <Button
          color="accent"
          className="shrink-0"
          render={
            <a
              href={result.data.themeEditorUrl}
              target="_blank"
              rel="noreferrer"
            />
          }
        >
          Enable app embed
          <ArrowRightIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
};

export default async ({
  params,
  searchParams,
}: SearchParamsProps<keyof Pager> & {
  params: Promise<{ store: string }>;
}) => {
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
                <LastScanned store={store} />
              </Suspense>
              <h1 className="mt-3 font-bold text-[28px] text-foreground-rich tracking-[-0.02em]">
                Products
              </h1>
              <p className="mt-1 text-foreground-dimmed text-sm">
                How each product in your catalog performs across AI shopping
                agents.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* <Button color="accent">
              <DownloadIcon className="size-4" />
              Export
            </Button> */}
              <Button
                color="primary"
                render={<Link href={`/dashboard/${store}/products/add`} />}
              >
                <PlusIcon className="size-4" />
                Add Products
              </Button>
            </div>
          </div>
        </div>

        <Suspense>
          <EmbedBanner store={store} />
        </Suspense>

        <div className="-mx-8 border-accent-foreground border-b">
          <div className="relative mx-8 bg-background-rich">
            <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
            <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
            <Suspense fallback={<StatsSkeleton />}>
              <StatCards store={store} />
            </Suspense>
          </div>
        </div>

        <SectionGutter />

        <div className="-mx-8 border-accent-foreground border-t border-b">
          <div className="relative mx-8 bg-background-rich">
            <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
            <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
            <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
            <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
            <Suspense fallback={<ChartSkeleton />}>
              <Performance store={store} />
            </Suspense>
          </div>
        </div>

        <SectionGutter />

        <div className="-mx-8 border-accent-foreground border-t border-b">
          <div className="relative mx-8 bg-background-rich">
            <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
            <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
            <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
            <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
            <Suspense fallback={<TableSkeleton />}>
              <Products store={store} searchParams={searchParams} />
            </Suspense>
          </div>
        </div>

        <SectionGutter />

        <div className="-mx-8 border-accent-foreground border-t border-b">
          <div className="relative mx-8 bg-background-rich">
            <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
            <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
            <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
            <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
            <Suspense fallback={<TrafficSkeleton />}>
              <AgentTraffic store={store} />
            </Suspense>
          </div>
        </div>

        <SectionGutter />

        <div className="-mx-8 border-accent-foreground border-t border-b">
          <div className="relative mx-8 bg-background-rich">
            <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
            <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
            <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
            <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
            <Suspense fallback={<InsightsSkeleton />}>
              <Insights store={store} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
};

const LastScanned = async ({ store }: { store: string }) => {
  await connection();
  const data = await unwrapResult(
    Product.gatherIntelligence(Environment.SERVER, { store }),
  );

  return (
    <StatusPill tone={data.scan?.updatedAt ? "success" : "neutral"}>
      {data.scan?.updatedAt
        ? `Live — last scanned ${formatRelativeTime(data.scan.updatedAt)}`
        : "No scans run yet"}
    </StatusPill>
  );
};

const StatCards = async ({ store }: { store: string }) => {
  await connection();
  const data = await unwrapResult(
    Product.gatherIntelligence(Environment.SERVER, { store }),
  );
  const { products } = data;

  if (products.length === 0)
    return (
      <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-2 xl:grid-cols-4">
        {emptyStatCards.map(({ label, icon: Icon }) => (
          <div
            key={label}
            className="relative flex h-44 flex-col justify-between bg-background-rich p-5"
          >
            <StatLabel label={label} icon={<Icon className="size-7.5" />} />
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

  const scans = await unwrapResult(
    Scan.getLatest(Environment.SERVER, { store }),
  );
  const completed = scans.filter((scan) => scan.status === "complete");

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
          icon={<RadarIcon className="size-7.5 text-warning" />}
        />
        <div>
          <p className="font-bold text-4xl text-foreground-rich tabular-nums tracking-[-0.02em]">
            {products.length}
            <span className="ml-1 font-medium text-foreground-dimmed text-xl">
              / 100
            </span>
          </p>
          <div className="mt-3">
            <div className="h-1 w-full rounded-full bg-accent-foreground">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-600"
                style={{ width: `${(products.length / 100) * 100}%` }}
              />
            </div>
            <p className="mt-2 text-foreground-dimmed text-xs">
              {100 - products.length} slots remaining
            </p>
          </div>
        </div>
      </div>

      <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
        <StatLabel
          label="Average Win Rate"
          icon={<GaugeIcon className="size-7.5 text-primary" />}
        />
        <div>
          <p className="font-bold text-4xl text-foreground-rich tabular-nums tracking-[-0.02em]">
            {averageWinRate}
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
                vs last scan
              </span>
            </p>
          ) : (
            <p className="mt-3 text-foreground-dimmed text-xs">
              across {products.length}{" "}
              {products.length === 1 ? "product" : "products"}
            </p>
          )}
        </div>
      </div>

      <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
        <StatLabel
          label="High Performers"
          icon={<TrendUpIcon className="size-7.5 text-success" />}
        />
        <div>
          <p className="font-bold text-4xl text-success tabular-nums tracking-[-0.02em]">
            {highPerformers}
          </p>
          <p className="mt-3 text-foreground-dimmed text-xs">
            products with {"≥"}60% win rate
          </p>
        </div>
      </div>

      <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
        <StatLabel
          label="Needs Attention"
          icon={<BullseyeIcon className="size-7.5 text-error" />}
        />
        <div>
          <p className="font-bold text-4xl text-error tabular-nums tracking-[-0.02em]">
            {needsAttention}
          </p>
          <p className="mt-3 text-foreground-dimmed text-xs">
            products below 30% win rate
          </p>
        </div>
      </div>
    </div>
  );
};

const Performance = async ({ store }: { store: string }) => {
  await connection();
  const [{ products }, scans] = await Promise.all([
    unwrapResult(Product.gatherIntelligence(Environment.SERVER, { store })),
    unwrapResult(Scan.getLatest(Environment.SERVER, { store })),
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
            <p className="mt-2 font-semibold text-foreground-rich text-lg">
              Win Rate by Model
            </p>
          </div>
          <p className="text-foreground-dimmed text-sm">
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
            color="accent"
            render={<Link href={`/dashboard/${store}/optimize`} />}
          >
            Optimizations
          </Button>
          <Button
            color="primary"
            render={<Link href={`/dashboard/${store}/ucp`} />}
          >
            UCP Manager <ArrowRightIcon className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

const Products = async ({
  store,
  searchParams,
}: {
  store: string;
  searchParams: SearchParamsProps<keyof Pager>["searchParams"];
}) => {
  await connection();
  const { page, size } = await extractPaginationParams(searchParams);
  const { items, pagination } = await unwrapResult(
    Product.paginateWithIntelligence(Environment.SERVER, {
      page,
      size,
      store,
    }),
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
        <p className="text-foreground-dimmed text-sm">
          {pagination.total} products
        </p>
      }
    />
  );
};

const AgentTraffic = async ({ store }: { store: string }) => {
  await connection();
  const [summary, timeSeries] = await Promise.all([
    unwrapResult(
      Tracking.getAgentTrafficSummary(Environment.SERVER, { store }),
    ),
    unwrapResult(
      Tracking.getAgentTrafficTimeSeries(Environment.SERVER, { store }),
    ),
  ]);

  const max = Math.max(1, ...summary.byAgentType.map((entry) => entry.count));

  return (
    <div className="bg-background-rich">
      <div className="flex flex-col gap-6 p-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <SectionKicker>03 — Traffic</SectionKicker>
          <p className="mt-2 font-semibold text-foreground-rich text-lg">
            AI Agent Visits to Products
          </p>
          <p className="mt-1 text-foreground-dimmed text-sm">
            Browser-visible AI and referral signals from your ScriptTag tracker.
          </p>
        </div>
        <p className="font-bold text-4xl text-foreground-rich tabular-nums tracking-[-0.02em]">
          {summary.total30d}
          <span className="ml-2 font-medium text-foreground-dimmed text-sm">
            last 30d
          </span>
        </p>
      </div>

      <AgentVisitsChart data={timeSeries} className="px-4 pb-6" />

      {summary.byAgentType.length === 0 ? (
        <p className="px-4 pb-4 text-foreground-dimmed text-sm">
          No AI agent visits recorded yet. Traffic appears when shoppers arrive
          via AI referrers or user-agents your tracker recognizes.
        </p>
      ) : (
        <ul className="flex flex-col gap-3 px-4 pb-4">
          {summary.byAgentType.map((entry) => (
            <li key={entry.agentType}>
              <div className="mb-1 flex items-center justify-between gap-4">
                <span className="text-foreground text-sm">{entry.label}</span>
                <span className="shrink-0 font-medium text-foreground-rich text-sm tabular-nums">
                  {entry.count}
                </span>
              </div>
              <div className="h-1 w-full rounded-full bg-accent-foreground">
                <div
                  className="h-full rounded-full bg-primary"
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

const Insights = async ({ store }: { store: string }) => {
  await connection();
  const scans = await unwrapResult(
    Scan.getLatest(Environment.SERVER, { store }),
  );

  const items = scans.map((scan) => ({
    date: scan.createdAt.toISOString(),
    ...scan,
  }));

  return <ScanInsightsCarousel scans={items} />;
};
