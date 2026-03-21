import { ArrowRightIcon } from "@zenncore/icons";
import { cn, unwrapResult } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import Link from "next/link";
import { Suspense } from "react";
import { formatRelativeTime } from "@/lib/date";
import * as Dashboard from "@/server/app/dashboard";
import { OverviewActions } from "./_components/overview-actions";
import { OverviewCharts } from "./_components/overview-charts";
import { OverviewTable } from "./_components/overview-table";

export default () => (
  <div className="flex flex-col">
    <div className="mx-8 border-accent-foreground border-x">
      {/* Title */}
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="mx-8 flex items-center justify-between px-6 py-8">
          <div>
            <h1 className="font-medium text-3xl text-foreground">Overview</h1>
            <Suspense
              fallback={
                <p className="font-light text-foreground-dimmed text-sm">
                  Loading...
                </p>
              }
            >
              <LastUpdated />
            </Suspense>
          </div>
          <OverviewActions />
        </div>
      </div>

      {/* Stat cards */}
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="mx-8">
          <Suspense fallback={<StatsSkeleton />}>
            <StatCards />
          </Suspense>
        </div>
      </div>

      {/* Charts + Activity */}
      <div className="h-8" />
      <div className="-mx-8 border-accent-foreground border-t border-b">
        <div className="mx-8">
          <Suspense fallback={<ChartSkeleton />}>
            <Performance />
          </Suspense>
        </div>
      </div>

      {/* Product Win Rates table */}
      <div className="h-8" />
      <div className="-mx-8 border-accent-foreground border-t border-b">
        <div className="mx-8">
          <Suspense fallback={<TableSkeleton />}>
            <TopProducts />
          </Suspense>
        </div>
      </div>
    </div>
  </div>
);

const LastUpdated = async () => {
  const data = await unwrapResult(Dashboard.gatherIntelligence());

  return (
    <p className="font-light text-foreground-dimmed text-sm">
      {data.lastUpdated
        ? `Last updated: ${formatRelativeTime(data.lastUpdated)}`
        : "No scans run yet"}
    </p>
  );
};

const StatCards = async () => {
  const data = await unwrapResult(Dashboard.gatherIntelligence());
  const { stats } = data;

  return (
    <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-2 xl:grid-cols-4">
      {/* Overall Win Rate */}
      <div className="flex flex-col justify-between bg-background-dimmed p-5">
        <div>
          <p className="font-light text-foreground-dimmed text-sm">
            Overall Win Rate
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-semibold text-4xl text-foreground tabular-nums">
              {stats.overallWinRate}%
            </span>
            {stats.winRateTrend !== 0 && (
              <span
                className={cn(
                  "font-medium text-xs",
                  stats.winRateTrend >= 0 ? "text-success" : "text-error",
                )}
              >
                {stats.winRateTrend >= 0 ? "+" : ""}
                {stats.winRateTrend}% since last scan
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Products Scanned */}
      <div className="flex flex-col justify-between bg-background-dimmed p-5">
        <div>
          <p className="font-light text-foreground-dimmed text-sm">
            Products Scanned
          </p>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="font-semibold text-4xl text-foreground tabular-nums">
              {stats.productsScanned}
            </span>
            <span className="font-light text-foreground-dimmed text-sm">
              / {stats.productLimit}
            </span>
          </div>
        </div>
        <div className="mt-4">
          <div className="h-px w-full bg-accent-foreground">
            <div
              className="h-full bg-primary"
              style={{
                width: `${(stats.productsScanned / stats.productLimit) * 100}%`,
              }}
            />
          </div>
          <p className="mt-2 font-light text-foreground-dimmed text-xs">
            {stats.productLimit - stats.productsScanned} slots remaining
          </p>
        </div>
      </div>

      {/* Top Performer */}
      <div className="flex flex-col justify-between bg-background-dimmed p-5">
        <div>
          <p className="font-light text-foreground-dimmed text-sm">
            Top Performer
          </p>
          {stats.topPerformer ? (
            <>
              <p className="mt-2 font-medium text-base text-foreground leading-snug">
                {stats.topPerformer.title}
              </p>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="font-semibold text-3xl text-success tabular-nums">
                  {stats.topPerformer.winRate}%
                </span>
                <span className="font-light text-foreground-dimmed text-xs">
                  win rate
                </span>
              </div>
            </>
          ) : (
            <p className="mt-2 font-light text-foreground-dimmed text-sm">
              No data yet
            </p>
          )}
        </div>
        {stats.topPerformer && (
          <Button
            variant="ghost"
            color="accent"
            className="mt-4"
            render={<Link href={`/dashboard/products/${stats.topPerformer.id}`} />}
          >
            View details <ArrowRightIcon className="size-3" />
          </Button>
        )}
      </div>

      {/* Biggest Opportunity */}
      <div className="flex flex-col justify-between bg-background-dimmed p-5">
        <div>
          <p className="font-light text-foreground-dimmed text-sm">
            Biggest Opportunity
          </p>
          {stats.biggestOpportunity ? (
            <>
              <p className="mt-2 font-medium text-base text-foreground leading-snug">
                {stats.biggestOpportunity.title}
              </p>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="font-semibold text-3xl text-error tabular-nums">
                  {stats.biggestOpportunity.winRate}%
                </span>
                <span className="font-light text-foreground-dimmed text-xs">
                  win rate
                </span>
              </div>
            </>
          ) : (
            <p className="mt-2 font-light text-foreground-dimmed text-sm">
              No data yet
            </p>
          )}
        </div>
        {stats.biggestOpportunity && (
          <Button
            variant="ghost"
            color="accent"
            className="mt-4"
            render={<Link href={`/dashboard/products/${stats.biggestOpportunity.id}`} />}
          >
            Optimize now <ArrowRightIcon className="size-3" />
          </Button>
        )}
      </div>
    </div>
  );
};

const Performance = async () => {
  const data = await unwrapResult(Dashboard.gatherIntelligence());

  return (
    <OverviewCharts
      models={data.models}
      trend={data.trend}
      activity={data.activity}
    />
  );
};

const TopProducts = async () => {
  const data = await unwrapResult(Dashboard.gatherIntelligence());

  return <OverviewTable products={data.products} />;
};

const StatsSkeleton = () => {
  const keys = ["rate", "scanned", "top", "opportunity"];

  return (
    <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-2 xl:grid-cols-4">
      {keys.map((key) => (
        <div key={key} className="bg-background-dimmed p-5">
          <div className="h-3 w-24 animate-pulse bg-foreground/10" />
          <div className="mt-4 h-9 w-20 animate-pulse bg-foreground/10" />
          <div className="mt-3 h-3 w-32 animate-pulse bg-foreground/10" />
        </div>
      ))}
    </div>
  );
};

const ChartSkeleton = () => (
  <div className="grid grid-cols-1 gap-px bg-accent-foreground xl:grid-cols-3">
    <div className="bg-background-dimmed p-4 xl:col-span-2">
      <div className="h-3 w-20 animate-pulse bg-foreground/10" />
      <div className="mt-2 h-5 w-36 animate-pulse bg-foreground/10" />
      <div className="mt-8 grid grid-cols-3 gap-8">
        {["a", "b", "c"].map((key) => (
          <div key={key} className="flex flex-col items-center gap-2">
            <div className="h-3 w-12 animate-pulse bg-foreground/10" />
            <div className="h-9 w-16 animate-pulse bg-foreground/10" />
            <div className="h-0.5 w-full animate-pulse bg-foreground/10" />
          </div>
        ))}
      </div>
      <div className="mt-10 h-20 w-full animate-pulse bg-foreground/10" />
    </div>
    <div className="bg-background-dimmed p-4">
      <div className="h-5 w-28 animate-pulse bg-foreground/10" />
      <div className="mt-4 flex flex-col gap-3">
        {["d", "e", "f"].map((key) => (
          <div key={key} className="flex items-start gap-2">
            <div className="size-6 animate-pulse bg-foreground/10" />
            <div className="flex-1 space-y-1">
              <div className="h-3 w-full animate-pulse bg-foreground/10" />
              <div className="h-3 w-16 animate-pulse bg-foreground/10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const TableSkeleton = () => {
  const keys = ["a", "b", "c", "d", "e"];

  return (
    <div>
      <div className="flex items-center justify-between border-accent-foreground border-b px-4 py-3">
        <div className="h-4 w-32 animate-pulse bg-foreground/10" />
        <div className="h-3 w-24 animate-pulse bg-foreground/10" />
      </div>
      {keys.map((key) => (
        <div
          key={key}
          className="flex items-center gap-4 border-accent-foreground border-b px-4 py-3 last:border-b-0"
        >
          <div className="size-9 animate-pulse bg-foreground/10" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 w-32 animate-pulse bg-foreground/10" />
            <div className="h-3 w-20 animate-pulse bg-foreground/10" />
          </div>
          <div className="h-4 w-12 animate-pulse bg-foreground/10" />
          <div className="h-4 w-12 animate-pulse bg-foreground/10" />
          <div className="h-4 w-12 animate-pulse bg-foreground/10" />
          <div className="h-4 w-16 animate-pulse bg-foreground/10" />
        </div>
      ))}
    </div>
  );
};
