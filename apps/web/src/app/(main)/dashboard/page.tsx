import {
  ArrowRightIcon,
  BoxMinusIcon,
  CheckBadgeIcon,
  RadarIcon,
  TrendUpIcon,
} from "@zenncore/icons";
import { unwrapResult } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import Link from "next/link";
import { Suspense } from "react";
import { formatRelativeTime } from "@/lib/date";
import * as Product from "@/server/app/product";
import * as Scan from "@/server/app/scan";
import { OverviewActions } from "./_components/overview-actions";
import { OverviewCharts } from "./_components/overview-charts";
import { OverviewTable } from "./_components/overview-table";

export default () => (
  <div className="flex flex-col">
    <div className="mx-8 border-accent-foreground border-x">
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="mx-8 flex items-baseline justify-between px-6 py-8">
          <div>
            <h1 className="font-medium text-4xl text-foreground">Overview</h1>
            <Suspense
              fallback={
                <p className="mt-1 font-light text-2xl text-foreground-dimmed">
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

      <div className="-mx-8 mb-12 border-accent-foreground border-t border-b">
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
  const data = await unwrapResult(Product.gatherIntelligence());

  return (
    <p className="mt-1 font-light text-2xl text-foreground-dimmed">
      {data.scan?.updatedAt
        ? `Last updated: ${formatRelativeTime(data.scan.updatedAt)}`
        : "No scans run yet"}
    </p>
  );
};

const StatCards = async () => {
  const data = await unwrapResult(Product.gatherIntelligence());
  const { products } = data;

  if (products.length === 0)
    return (
      <div className="mon-h-39 grid h-39 grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-2 xl:grid-cols-4">
        {[
          "Overall Win Rate",
          "Products Scanned",
          "Top Performer",
          "Biggest Opportunity",
        ].map((label) => {
          const icon = (() => {
            switch (label) {
              case "Overall Win Rate":
                return <BoxMinusIcon className="size-12" />;
              case "Products Scanned":
                return <RadarIcon className="size-12" />;
              case "Top Performer":
                return <TrendUpIcon className="size-12" />;
              case "Biggest Opportunity":
                return <CheckBadgeIcon className="size-12" />;
            }
          })();
          return (
            <div key={label} className="h-full bg-background-dimmed p-4">
              <p className="mb-4 text-foreground-dimmed">{label}</p>
              <div className="flex flex-col items-center justify-center gap-2">
                {icon}
                <p className="text-foreground-dimmed">No data yet</p>
              </div>
            </div>
          );
        })}
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

  const scans = await unwrapResult(Scan.getLatest());
  const completed = scans.filter((scan) => scan.status === "completed");

  const trend = (() => {
    if (completed.length < 2) return 0;

    const c = completed[0];
    const p = completed[1];

    if (!c) return 0;
    if (!p) return 0;

    const cTotal = c.wins + c.losses;
    const pTotal = p.wins + p.losses;

    const cRate = cTotal > 0 ? Math.round((c.wins / cTotal) * 100) : 0;
    const pRate = pTotal > 0 ? Math.round((p.wins / pTotal) * 100) : 0;

    return cRate - pRate;
  })();

  return (
    <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-2 xl:grid-cols-4">
      <div className="flex flex-col justify-between bg-background-dimmed p-4">
        <div>
          <p className="text-foreground-dimmed">Overall Win Rate</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-4xl text-foreground tabular-nums">
              {overall}%
            </span>
            {trend !== 0 && (
              <span className={trend >= 0 ? "text-success" : "text-error"}>
                {trend >= 0 ? "+" : ""}
                {trend}% since last scan
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-between bg-background-dimmed p-4">
        <div>
          <p className="text-foreground-dimmed">Products Scanned</p>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-4xl text-foreground tabular-nums">
              {data.total}
            </span>
            <span className="text-foreground-dimmed">/ 100</span>
          </div>
        </div>
        <div className="mt-4">
          <div className="h-1 w-full bg-accent-foreground">
            <div
              className="h-full bg-primary"
              style={{ width: `${(data.total / 100) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-foreground-dimmed">
            {100 - data.total} slots remaining
          </p>
        </div>
      </div>

      {top && (
        <div className="flex flex-col justify-between bg-background-dimmed p-4">
          <div>
            <p className="text-foreground-dimmed">Top Performer</p>
            <p className="text-foreground">{top.title}</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl text-success tabular-nums">
                {top.winRate.total}%
              </span>
              <span className="text-foreground-dimmed">win rate</span>
            </div>
          </div>
          <Button
            variant="outline"
            color="accent"
            className="mt-auto ml-auto"
            render={<Link href={`/dashboard/products/${top._id}`} />}
          >
            View details <ArrowRightIcon className="size-4" />
          </Button>
        </div>
      )}

      {opportunity && (
        <div className="flex flex-col justify-between bg-background-dimmed p-4">
          <div>
            <p className="font-light text-foreground-dimmed">
              Biggest Opportunity
            </p>
            <p className="text-foreground leading-snug">{opportunity.title}</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl text-error tabular-nums">
                {opportunity.winRate.total}%
              </span>
              <span className="text-foreground-dimmed">win rate</span>
            </div>
          </div>
          <Button
            variant="outline"
            color="accent"
            className="mt-auto ml-auto"
            render={<Link href={`/dashboard/products/${opportunity._id}`} />}
          >
            Optimize now <ArrowRightIcon className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

const Performance = async () => {
  const [data, scans] = await Promise.all([
    unwrapResult(Product.gatherIntelligence()),
    unwrapResult(Scan.getLatest()),
  ]);

  const { products } = data;

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

  const activity = scans.slice(0, 5).map((scan) => ({
    id: scan.id,
    type:
      scan.status === "completed"
        ? ("simulation_complete" as const)
        : ("simulation_running" as const),
    message:
      scan.status === "completed"
        ? `Simulation completed — ${scan.wins} wins, ${scan.losses} losses`
        : `Simulation in progress — ${scan.completedSimulations}/${scan.totalSimulations}`,
    detail: scan.topFinding,
    timestamp: scan.createdAt.toISOString(),
  }));

  return <OverviewCharts models={models} trend={trend} activity={activity} />;
};

const TopProducts = async () => {
  const data = await unwrapResult(Product.gatherIntelligence());

  const sorted = [...data.products]
    .sort((a, b) => b.winRate.total - a.winRate.total)
    .slice(0, 10);

  const rows = sorted.map((product) => ({
    ...product,
  }));

  return <OverviewTable products={rows} />;
};

const StatsSkeleton = () => {
  const keys = ["rate", "scanned", "top", "opportunity"];

  return (
    <div className="grid h-39 min-h-39 grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-2 xl:grid-cols-4">
      {keys.map((key) => (
        <div key={key} className="bg-background-dimmed p-4">
          <div className="h-4 w-28 animate-pulse bg-foreground/10" />
          <div className="mt-4 h-10 w-20 animate-pulse bg-foreground/10" />
          <div className="mt-3 h-3 w-32 animate-pulse bg-foreground/10" />
        </div>
      ))}
    </div>
  );
};

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
      <div className="flex-1 bg-background-dimmed">
        <div className="mb-2 px-4 pt-4">
          <div className="h-3 w-28 animate-pulse bg-foreground/10" />
        </div>
        <div className="flex flex-col">
          {["d", "e", "f"].map((key) => (
            <div
              key={key}
              className="flex items-start gap-2 border-accent-foreground border-b p-4 first:border-t last:border-b-0"
            >
              <div className="size-6 shrink-0 animate-pulse bg-foreground/10" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-full animate-pulse bg-foreground/10" />
                <div className="h-3 w-3/4 animate-pulse bg-foreground/10" />
                <div className="h-2.5 w-16 animate-pulse bg-foreground/10" />
              </div>
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

const TableSkeleton = () => {
  const keys = ["a", "b", "c", "d", "e"];

  return (
    <div>
      <div className="flex items-center justify-between border-accent-foreground border-b px-4 py-3">
        <div className="h-7 w-40 animate-pulse bg-foreground/10" />
        <div className="h-9 w-40 animate-pulse bg-foreground/10" />
      </div>
      <div className="overflow-x-auto bg-background-rich">
        <table className="w-full">
          <thead>
            <tr className="border-accent-foreground border-b">
              {[
                "Product",
                "Win Rate",
                "GPT-4",
                "Claude",
                "Gemini",
                "Quality",
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
            {keys.map((key) => (
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
                  <div className="flex items-center gap-2">
                    <div className="h-1 w-24 animate-pulse bg-foreground/10" />
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
                    <div className="h-1 w-24 animate-pulse bg-foreground/10" />
                    <div className="h-4 w-8 animate-pulse bg-foreground/10" />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="size-9 animate-pulse bg-foreground/10" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
