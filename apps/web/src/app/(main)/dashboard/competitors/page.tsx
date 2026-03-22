import {
  ArrowRightIcon,
  CheckBadgeIcon,
  PlusIcon,
  RadarIcon,
  ShieldCheckIcon,
  TrendUpIcon,
} from "@zenncore/icons";
import { cn, unwrapResult } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import type { SearchParamsProps } from "@zenncore/web/types";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { formatRelativeTime } from "@/lib/date";
import * as Competitor from "@/server/app/competitor";
import * as Scan from "@/server/app/scan";
import type { Pager } from "@/server/utils/pagination";
import { extractPaginationParams } from "@/server/utils/pagination";
import { CompetitorsTable } from "../_components/competitors-table";
import { WinRateTiersChart } from "./_components/win-rate-tiers-chart";

export default ({ searchParams }: SearchParamsProps<keyof Pager>) => (
  <div className="flex flex-col">
    <div className="mx-8 border-accent-foreground border-x">
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="mx-8 flex items-baseline justify-between px-6 py-8">
          <div>
            <h1 className="font-medium text-4xl text-foreground">
              Competitor Intelligence
            </h1>
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
            <Button
              variant="flat"
              color="primary"
              render={<Link href="/onboarding/competitors" />}
            >
              <PlusIcon className="size-4" />
              Add Competitor
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
          <Suspense fallback={<LandscapeSkeleton />}>
            <CompetitiveLandscape />
          </Suspense>
        </div>
      </div>

      <div className="h-8" />
      <div className="-mx-8 border-accent-foreground border-t border-b">
        <div className="mx-8">
          <Suspense fallback={<TableSkeleton />}>
            <Competitors searchParams={searchParams} />
          </Suspense>
        </div>
      </div>

      <div className="h-8" />
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
  const data = await unwrapResult(Competitor.gatherIntelligence());

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
  const data = await unwrapResult(Competitor.gatherIntelligence());
  if (!data) return null;

  const { brands } = data;

  if (brands.length === 0)
    return (
      <div className="grid h-39 min-h-39 grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Brands Tracked",
            icon: <RadarIcon className="size-12" />,
          },
          {
            label: "Winning Against",
            icon: <TrendUpIcon className="size-12" />,
          },
          {
            label: "Most Dangerous",
            icon: <ShieldCheckIcon className="size-12" />,
          },
          {
            label: "Total Simulations",
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

  const winning = brands.filter((brand) => brand.winRate >= 50).length;
  const totalSimulations = brands.reduce(
    (sum, brand) => sum + brand.simulations,
    0,
  );
  const dangerous =
    brands.length > 0
      ? brands.reduce((worst, brand) =>
          brand.winRate < worst.winRate ? brand : worst,
        )
      : null;

  const scans = await unwrapResult(Scan.getLatest());
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

  const overallWinRate =
    brands.length > 0
      ? Math.round(
          brands.reduce((sum, brand) => sum + brand.winRate, 0) / brands.length,
        )
      : 0;

  return (
    <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-2 xl:grid-cols-4">
      <div className="flex flex-col justify-between bg-background-dimmed p-4">
        <p className="text-foreground-dimmed">Brands Tracked</p>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-4xl text-foreground tabular-nums">
            {brands.length}
          </span>
          <span className="text-foreground-dimmed">
            {brands.reduce((sum, brand) => sum + brand.products, 0)} products
          </span>
        </div>
      </div>

      <div className="flex flex-col justify-between bg-background-dimmed p-4">
        <p className="text-foreground-dimmed">Winning Against</p>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-4xl text-success tabular-nums">
            {winning}
            <span className="font-light text-foreground-dimmed text-sm">
              {" "}
              / {brands.length}
            </span>
          </span>
          {trend !== 0 && (
            <span className={trend >= 0 ? "text-success" : "text-error"}>
              {trend >= 0 ? "+" : ""}
              {trend}% since last scan
            </span>
          )}
        </div>
        <div className="mt-4">
          <div className="h-1 w-full bg-accent-foreground">
            <div
              className="h-full bg-success"
              style={{
                width: `${brands.length > 0 ? Math.round((winning / brands.length) * 100) : 0}%`,
              }}
            />
          </div>
          <p className="mt-2 font-light text-foreground-dimmed text-sm">
            {overallWinRate}% average win rate
          </p>
        </div>
      </div>

      {dangerous ? (
        <div className="flex flex-col justify-between bg-background-dimmed p-4">
          <div>
            <p className="text-foreground-dimmed">Most Dangerous</p>
            <p className="mt-1 text-foreground">{dangerous.brand}</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl text-error tabular-nums">
                {dangerous.winRate}%
              </span>
              <span className="text-foreground-dimmed">win rate</span>
            </div>
          </div>
          <Button
            variant="outline"
            color="accent"
            className="mt-auto ml-auto"
            render={<Link href={`/dashboard/competitors/${dangerous._id}`} />}
          >
            View battlecard <ArrowRightIcon className="size-4" />
          </Button>
        </div>
      ) : (
        <div className="flex flex-col justify-between bg-background-dimmed p-4">
          <p className="text-foreground-dimmed">Most Dangerous</p>
          <p className="mt-2 text-foreground-dimmed">No data yet</p>
        </div>
      )}

      <div className="flex flex-col justify-between bg-background-dimmed p-4">
        <p className="text-foreground-dimmed">Total Simulations</p>
        <span className="mt-2 text-4xl text-foreground tabular-nums">
          {totalSimulations}
        </span>
        <p className="mt-2 font-light text-foreground-dimmed text-sm">
          across {brands.length} competitor{brands.length !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
};

const CompetitiveLandscape = async () => {
  await connection();
  const data = await unwrapResult(Competitor.gatherIntelligence());

  const { brands } = data;

  if (brands.length === 0) return null;

  const sorted = [...brands].sort((a, b) => a.winRate - b.winRate);

  const tiers = [
    {
      label: "Dominating (\u226575%)",
      count: brands.filter((brand) => brand.winRate >= 75).length,
      color: "bg-success",
    },
    {
      label: "Competitive (50\u201374%)",
      count: brands.filter((brand) => brand.winRate >= 50 && brand.winRate < 75)
        .length,
      color: "bg-primary",
    },
    {
      label: "At Risk (30\u201349%)",
      count: brands.filter((brand) => brand.winRate >= 30 && brand.winRate < 50)
        .length,
      color: "bg-warning",
    },
    {
      label: "Losing (<30%)",
      count: brands.filter((brand) => brand.winRate < 30).length,
      color: "bg-error",
    },
  ];

  const totalSimulations = brands.reduce(
    (sum, brand) => sum + brand.simulations,
    0,
  );

  return (
    <div className="grid grid-cols-1 gap-px bg-accent-foreground xl:grid-cols-3">
      <div className="bg-background-dimmed xl:col-span-2">
        <div className="flex items-start justify-between p-4">
          <div>
            <p className="font-light text-foreground-dimmed uppercase tracking-widest">
              Landscape
            </p>
            <p className="mt-1 font-medium text-2xl text-foreground">
              Win Rate by Competitor
            </p>
          </div>
          <p className="font-light text-foreground-dimmed text-sm">
            {totalSimulations} total simulations
          </p>
        </div>

        <div className="flex flex-col gap-px border-accent-foreground border-t bg-accent-foreground">
          {sorted.map((brand) => {
            const barColor = (() => {
              switch (true) {
                case brand.winRate >= 75:
                  return "bg-success";
                case brand.winRate >= 50:
                  return "bg-primary";
                case brand.winRate >= 30:
                  return "bg-warning";
                default:
                  return "bg-error";
              }
            })();

            return (
              <div
                key={brand._id}
                className="flex items-center gap-4 bg-background-dimmed px-4 py-3"
              >
                <div className="flex w-36 shrink-0 items-center gap-2">
                  <div className="flex size-7 shrink-0 items-center justify-center bg-primary/10 font-semibold text-primary text-xs">
                    {brand.brand.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="truncate font-medium text-foreground text-sm">
                    {brand.brand}
                  </span>
                </div>
                <div className="flex flex-1 items-center gap-3">
                  <div className="h-1.5 flex-1 bg-accent-foreground">
                    <div
                      className={cn("h-full", barColor)}
                      style={{ width: `${brand.winRate}%` }}
                    />
                  </div>
                  <span className="w-12 shrink-0 text-right font-medium text-foreground text-sm tabular-nums">
                    {brand.winRate}%
                  </span>
                </div>
                <span className="w-16 shrink-0 text-right font-light text-foreground-dimmed text-sm tabular-nums">
                  {brand.simulations} sim
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-px bg-accent-foreground">
        <div className="flex-1 bg-background-dimmed p-4">
          <p className="font-light text-foreground-dimmed uppercase tracking-widest">
            Distribution
          </p>
          <p className="mt-1 font-medium text-2xl text-foreground">
            Win Rate Tiers
          </p>

          <WinRateTiersChart tiers={tiers} total={brands.length} />
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
            render={<Link href="/onboarding/competitors" />}
          >
            Add Competitors <PlusIcon className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

const Competitors = async ({
  searchParams,
}: {
  searchParams: SearchParamsProps<keyof Pager>["searchParams"];
}) => {
  await connection();
  const { page, size } = await extractPaginationParams(searchParams);
  const data = await unwrapResult(
    Competitor.gatherPaginatedIntelligence({ page, size }),
  );

  return (
    <CompetitorsTable
      paginated
      pageSize={size}
      pageCount={data.pagination.total}
      pageIndex={page}
      rows={data.brands}
      action={
        <p className="font-light text-foreground-dimmed">
          {data.pagination.total} competitor
          {data.pagination.total !== 1 ? "s" : ""}
        </p>
      }
    />
  );
};

const Insights = async () => {
  await connection();
  const [data, scans] = await Promise.all([
    unwrapResult(Competitor.gatherIntelligence()),
    unwrapResult(Scan.getLatest()),
  ]);

  const completed = scans.filter((scan) => scan.status === "completed");

  if (completed.length === 0 && !data?.scan?.topFinding) return null;

  const recentScans = completed.slice(0, 3);

  return (
    <div className="bg-background-dimmed">
      <div className="flex items-start justify-between p-4">
        <div>
          <p className="font-light text-foreground-dimmed uppercase tracking-widest">
            Intelligence
          </p>
          <p className="mt-1 font-medium text-2xl text-foreground">
            Recent Scan Activity
          </p>
        </div>
        {data.scan?.topFinding && (
          <div className="max-w-sm text-right">
            <p className="font-light text-foreground-dimmed text-sm">
              Top Finding
            </p>
            <p className="mt-1 font-light text-foreground text-sm">
              {data.scan.topFinding}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-px border-accent-foreground border-t bg-accent-foreground">
        {recentScans.map((scan) => {
          const total = scan.wins + scan.losses;
          const winRate = total > 0 ? Math.round((scan.wins / total) * 100) : 0;

          return (
            <div
              key={scan.id}
              className="flex items-center justify-between bg-background-dimmed px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    scan.status === "completed" ? "bg-success" : "bg-warning",
                  )}
                />
                <div>
                  <p className="font-medium text-foreground text-sm">
                    {scan.status === "completed"
                      ? `Scan completed — ${scan.wins}W / ${scan.losses}L`
                      : `Scan in progress — ${scan.completedSimulations}/${scan.totalSimulations}`}
                  </p>
                  {scan.topFinding && (
                    <p className="mt-0.5 font-light text-foreground-dimmed text-sm">
                      {scan.topFinding}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                {total > 0 && (
                  <span
                    className={cn(
                      "font-medium text-sm tabular-nums",
                      winRate >= 50 ? "text-success" : "text-error",
                    )}
                  >
                    {winRate}% win rate
                  </span>
                )}
                <span className="font-light text-foreground-dimmed text-sm">
                  {formatRelativeTime(scan.createdAt)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between border-accent-foreground border-t p-4">
        <p className="font-light text-foreground-dimmed text-sm">
          {completed.length} completed scan{completed.length !== 1 ? "s" : ""}
        </p>
        <Button
          variant="outline"
          color="primary"
          render={<Link href="/dashboard" />}
        >
          View all activity <ArrowRightIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
};

const StatsSkeleton = () => (
  <div className="grid h-39 min-h-39 grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-2 xl:grid-cols-4">
    {["brands", "winning", "dangerous", "simulations"].map((key) => (
      <div key={key} className="bg-background-dimmed p-4">
        <div className="h-4 w-28 animate-pulse bg-foreground/10" />
        <div className="mt-4 h-10 w-20 animate-pulse bg-foreground/10" />
        <div className="mt-3 h-3 w-32 animate-pulse bg-foreground/10" />
      </div>
    ))}
  </div>
);

const LandscapeSkeleton = () => (
  <div className="grid grid-cols-1 gap-px bg-accent-foreground xl:grid-cols-3">
    <div className="bg-background-dimmed xl:col-span-2">
      <div className="p-4">
        <div className="h-3 w-20 animate-pulse bg-foreground/10" />
        <div className="mt-2 h-7 w-48 animate-pulse bg-foreground/10" />
      </div>
      <div className="flex flex-col gap-px border-accent-foreground border-t bg-accent-foreground">
        {["a", "b", "c", "d", "e"].map((key) => (
          <div
            key={key}
            className="flex items-center gap-4 bg-background-dimmed px-4 py-3"
          >
            <div className="flex w-36 items-center gap-2">
              <div className="size-7 shrink-0 animate-pulse bg-foreground/10" />
              <div className="h-4 w-20 animate-pulse bg-foreground/10" />
            </div>
            <div className="flex flex-1 items-center gap-3">
              <div className="h-1.5 flex-1 animate-pulse bg-foreground/10" />
              <div className="h-4 w-10 animate-pulse bg-foreground/10" />
            </div>
            <div className="h-4 w-14 animate-pulse bg-foreground/10" />
          </div>
        ))}
      </div>
    </div>
    <div className="flex flex-col gap-px bg-accent-foreground">
      <div className="flex-1 bg-background-dimmed p-4">
        <div className="h-3 w-24 animate-pulse bg-foreground/10" />
        <div className="mt-2 h-7 w-32 animate-pulse bg-foreground/10" />
        <div className="mt-6 h-2 w-full animate-pulse bg-foreground/10" />
        <div className="mt-4 grid grid-cols-2 gap-4">
          {["x", "y", "z", "w"].map((key) => (
            <div key={key} className="space-y-2">
              <div className="h-3 w-20 animate-pulse bg-foreground/10" />
              <div className="h-5 w-8 animate-pulse bg-foreground/10" />
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
    <div className="flex items-center justify-between border-accent-foreground border-b p-4">
      <div className="h-6 w-36 animate-pulse bg-foreground/10" />
      <div className="h-4 w-24 animate-pulse bg-foreground/10" />
    </div>
    <div className="overflow-x-auto bg-background-rich">
      <table className="w-full">
        <thead>
          <tr className="border-accent-foreground border-b">
            {["Brand", "Win Rate", "Simulations", "Last Updated", ""].map(
              (header) => (
                <th key={header} className="px-4 py-3 text-left">
                  {header && (
                    <div className="h-3 w-16 animate-pulse bg-foreground/10" />
                  )}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {(["row-a", "row-b", "row-c", "row-d", "row-e"] as const).map(
            (key) => (
              <tr
                key={key}
                className="border-accent-foreground border-b last:border-b-0"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="size-9 shrink-0 animate-pulse bg-foreground/10" />
                    <div className="space-y-1.5">
                      <div className="h-4 w-24 animate-pulse bg-foreground/10" />
                      <div className="h-3 w-16 animate-pulse bg-foreground/10" />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1 w-24 animate-pulse bg-foreground/10" />
                    <div className="h-4 w-9 animate-pulse bg-foreground/10" />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="h-4 w-10 animate-pulse bg-foreground/10" />
                </td>
                <td className="px-4 py-3">
                  <div className="h-4 w-20 animate-pulse bg-foreground/10" />
                </td>
                <td className="px-4 py-3">
                  <div className="size-9 animate-pulse bg-foreground/10" />
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
    <div className="flex items-center justify-between border-accent-foreground border-t p-4">
      <div className="h-4 w-24 animate-pulse bg-foreground/10" />
      <div className="flex gap-2">
        <div className="h-9 w-9 animate-pulse bg-foreground/10" />
        <div className="h-9 w-9 animate-pulse bg-foreground/10" />
      </div>
    </div>
  </div>
);

const InsightsSkeleton = () => (
  <div className="bg-background-dimmed">
    <div className="flex items-start justify-between p-4">
      <div>
        <div className="h-3 w-24 animate-pulse bg-foreground/10" />
        <div className="mt-2 h-7 w-40 animate-pulse bg-foreground/10" />
      </div>
      <div className="space-y-1.5 text-right">
        <div className="h-3 w-20 animate-pulse bg-foreground/10" />
        <div className="h-4 w-48 animate-pulse bg-foreground/10" />
      </div>
    </div>
    <div className="flex flex-col gap-px border-accent-foreground border-t bg-accent-foreground">
      {["a", "b", "c"].map((key) => (
        <div
          key={key}
          className="flex items-center justify-between bg-background-dimmed px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <div className="size-2 shrink-0 animate-pulse rounded-full bg-foreground/10" />
            <div className="space-y-1.5">
              <div className="h-4 w-48 animate-pulse bg-foreground/10" />
              <div className="h-3 w-64 animate-pulse bg-foreground/10" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-4 w-20 animate-pulse bg-foreground/10" />
            <div className="h-3 w-14 animate-pulse bg-foreground/10" />
          </div>
        </div>
      ))}
    </div>
    <div className="flex items-center justify-between border-accent-foreground border-t p-4">
      <div className="h-4 w-28 animate-pulse bg-foreground/10" />
      <div className="h-9 w-36 animate-pulse bg-foreground/10" />
    </div>
  </div>
);
