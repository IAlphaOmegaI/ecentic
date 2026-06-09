import {
  ArrowRightIcon,
  CheckBadgeIcon,
  PlusIcon,
  RadarIcon,
  ShieldCheckIcon,
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
import * as Competitor from "@/server/app/competitor";
import * as Scan from "@/server/app/scan";
import { Environment } from "@/server/utils/environment";
import type { Pager } from "@/server/utils/pagination";
import { extractPaginationParams } from "@/server/utils/pagination";
import { CompetitorsTable } from "../_components/competitors-table";
import {
  Crosshair,
  SectionGutter,
  SectionKicker,
  StatLabel,
} from "../_components/grid";
import { WinRateTiersChart } from "./_components/win-rate-tiers-chart";

const emptyStatCards = [
  { label: "Brands Tracked", icon: RadarIcon, color: "text-primary" },
  { label: "Winning Against", icon: TrendUpIcon, color: "text-success" },
  { label: "Most Dangerous", icon: ShieldCheckIcon, color: "text-error" },
  { label: "Total Simulations", icon: CheckBadgeIcon, color: "text-warning" },
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
              Competitors
            </h1>
            <p className="mt-1 font-light text-foreground-dimmed text-lg">
              How AI shopping agents rank you against the brands you track.
            </p>
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
          <Suspense fallback={<LandscapeSkeleton />}>
            <CompetitiveLandscape />
          </Suspense>
        </div>
      </div>

      <SectionGutter />

      <div className="-mx-8 border-accent-foreground border-t border-b">
        <div className="mx-8 bg-background-rich">
          <Suspense fallback={<TableSkeleton />}>
            <Competitors searchParams={searchParams} />
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
    </div>
  </div>
);

const LastScanned = async () => {
  await connection();
  const data = await unwrapResult(
    Competitor.gatherIntelligence(Environment.SERVER),
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
    Competitor.gatherIntelligence(Environment.SERVER),
  );
  if (!data) return null;

  const { brands } = data;

  if (brands.length === 0)
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

  const winning = brands.filter((brand) => brand.winRate >= 50).length;
  const totalProducts = brands.reduce((sum, brand) => sum + brand.products, 0);
  const totalSimulations = brands.reduce(
    (sum, brand) => sum + brand.simulations,
    0,
  );
  const dangerous = brands.reduce((worst, brand) =>
    brand.winRate < worst.winRate ? brand : worst,
  );

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

  const overallWinRate = Math.round(
    brands.reduce((sum, brand) => sum + brand.winRate, 0) / brands.length,
  );

  return (
    <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-2 xl:grid-cols-4">
      <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
        <StatLabel
          label="Brands Tracked"
          icon={<RadarIcon className="size-8 shrink-0 text-primary" />}
        />
        <div>
          <p className="font-medium text-5xl text-foreground tabular-nums tracking-tight">
            {brands.length}
          </p>
          <p className="mt-3 font-light text-foreground-dimmed text-sm">
            {totalProducts} {totalProducts === 1 ? "product" : "products"}{" "}
            monitored
          </p>
        </div>
      </div>

      <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
        <StatLabel
          label="Winning Against"
          icon={<TrendUpIcon className="size-8 shrink-0 text-success" />}
        />
        <div>
          <p className="font-medium text-5xl text-foreground tabular-nums tracking-tight">
            {winning}
            <span className="ml-1 font-light text-2xl text-foreground-dimmed">
              / {brands.length}
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
                since last scan
              </span>
            </p>
          ) : (
            <div className="mt-3">
              <div className="h-1 w-full bg-accent-foreground">
                <div
                  className="h-full bg-success"
                  style={{
                    width: `${Math.round((winning / brands.length) * 100)}%`,
                  }}
                />
              </div>
              <p className="mt-2 font-light text-foreground-dimmed text-xs">
                {overallWinRate}% average win rate
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
        <StatLabel
          label="Most Dangerous"
          icon={<ShieldCheckIcon className="size-8 shrink-0 text-error" />}
        />
        <div>
          <p className="line-clamp-1 text-foreground">{dangerous.brand}</p>
          <p className="mt-1 font-medium text-5xl text-error tabular-nums tracking-tight">
            {dangerous.winRate}
            <span className="ml-0.5 font-light text-2xl text-foreground-dimmed">
              %
            </span>
          </p>
          <p className="mt-3 font-light text-foreground-dimmed text-sm">
            your win rate against them
          </p>
        </div>
      </div>

      <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
        <StatLabel
          label="Total Simulations"
          icon={<CheckBadgeIcon className="size-8 shrink-0 text-warning" />}
        />
        <div>
          <p className="font-medium text-5xl text-foreground tabular-nums tracking-tight">
            {totalSimulations}
          </p>
          <p className="mt-3 font-light text-foreground-dimmed text-sm">
            across {brands.length} competitor{brands.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
    </div>
  );
};

const CompetitiveLandscape = async () => {
  await connection();
  const data = await unwrapResult(
    Competitor.gatherIntelligence(Environment.SERVER),
  );

  const { brands } = data;

  if (brands.length === 0) return null;

  const sorted = [...brands].sort((a, b) => a.winRate - b.winRate);

  const tiers = [
    {
      label: "Dominating (≥75%)",
      count: brands.filter((brand) => brand.winRate >= 75).length,
      color: "bg-success",
    },
    {
      label: "Competitive (50–74%)",
      count: brands.filter((brand) => brand.winRate >= 50 && brand.winRate < 75)
        .length,
      color: "bg-primary",
    },
    {
      label: "At Risk (30–49%)",
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
      <div className="bg-background-rich xl:col-span-2">
        <div className="flex items-start justify-between p-4">
          <div>
            <SectionKicker>01 — Landscape</SectionKicker>
            <p className="mt-2 font-medium text-2xl text-foreground">
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
                className="flex items-center gap-4 bg-background-rich px-4 py-3 transition-colors hover:bg-background"
              >
                <div className="flex w-36 shrink-0 items-center gap-2">
                  <div className="flex size-8 shrink-0 items-center justify-center bg-background-dimmed font-medium text-primary text-xs">
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

      <div className="flex flex-1 flex-col gap-px bg-accent-foreground">
        <div className="flex flex-1 flex-col bg-background-rich">
          <div className="p-4">
            <p className="text-foreground-dimmed text-xs uppercase tracking-[0.2em]">
              Distribution
            </p>
            <p className="mt-2 font-medium text-2xl text-foreground">
              Win Rate Tiers
            </p>
          </div>

          <WinRateTiersChart tiers={tiers} total={brands.length} />
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
    Competitor.gatherPaginatedIntelligence(Environment.SERVER, { page, size }),
  );

  return (
    <CompetitorsTable
      paginated
      pageSize={size}
      pageCount={data.pagination.total}
      pageIndex={page}
      rows={data.brands}
      kicker="02 — All Competitors"
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
    unwrapResult(Competitor.gatherIntelligence(Environment.SERVER)),
    unwrapResult(Scan.getLatest(Environment.SERVER)),
  ]);

  const completed = scans.filter((scan) => scan.status === "completed");

  if (completed.length === 0 && !data?.scan?.topFinding) return null;

  const recentScans = completed.slice(0, 3);

  return (
    <div className="bg-background-rich">
      <div className="flex items-start justify-between p-4">
        <div>
          <SectionKicker>03 — Intelligence</SectionKicker>
          <p className="mt-2 font-medium text-2xl text-foreground">
            Recent Scan Activity
          </p>
        </div>
        {data.scan?.topFinding && (
          <div className="max-w-sm text-right">
            <p className="font-light text-foreground-dimmed text-sm">
              Top Finding
            </p>
            <p className="mt-1 font-light text-foreground text-sm">
              {data.scan.topFinding.impactDescription}
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
              className="flex items-center justify-between bg-background-rich px-4 py-3 transition-colors hover:bg-background"
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "size-2 shrink-0",
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
                      {scan.topFinding.impactDescription}
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

const LandscapeSkeleton = () => (
  <div className="grid grid-cols-1 gap-px bg-accent-foreground xl:grid-cols-3">
    <div className="bg-background-rich xl:col-span-2">
      <div className="p-4">
        <div className="h-3 w-32 animate-pulse bg-foreground/10" />
        <div className="mt-2 h-8 w-56 animate-pulse bg-foreground/10" />
      </div>
      <div className="flex flex-col gap-px border-accent-foreground border-t bg-accent-foreground">
        {(["a", "b", "c", "d", "e"] as const).map((key) => (
          <div
            key={key}
            className="flex items-center gap-4 bg-background-rich px-4 py-3"
          >
            <div className="flex w-36 items-center gap-2">
              <div className="size-8 shrink-0 animate-pulse bg-foreground/10" />
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
      <div className="flex flex-1 flex-col bg-background-rich">
        <div className="p-4">
          <div className="h-3 w-24 animate-pulse bg-foreground/10" />
          <div className="mt-2 h-8 w-40 animate-pulse bg-foreground/10" />
        </div>
        <div className="mx-4 min-h-56 flex-1 animate-pulse bg-foreground/10" />
        <div className="grid grid-cols-2 gap-3 p-4">
          {(["x", "y", "z", "w"] as const).map((key) => (
            <div key={key} className="space-y-2">
              <div className="h-3 w-20 animate-pulse bg-foreground/10" />
              <div className="h-5 w-12 animate-pulse bg-foreground/10" />
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
    <div className="flex items-center justify-between border-accent-foreground border-b p-4">
      <div className="space-y-2">
        <div className="h-3 w-40 animate-pulse bg-foreground/10" />
        <div className="h-6 w-36 animate-pulse bg-foreground/10" />
      </div>
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
  <div className="bg-background-rich">
    <div className="flex items-start justify-between p-4">
      <div>
        <div className="h-3 w-32 animate-pulse bg-foreground/10" />
        <div className="mt-2 h-8 w-48 animate-pulse bg-foreground/10" />
      </div>
      <div className="space-y-1.5 text-right">
        <div className="h-3 w-20 animate-pulse bg-foreground/10" />
        <div className="h-4 w-48 animate-pulse bg-foreground/10" />
      </div>
    </div>
    <div className="flex flex-col gap-px border-accent-foreground border-t bg-accent-foreground">
      {(["a", "b", "c"] as const).map((key) => (
        <div
          key={key}
          className="flex items-center justify-between bg-background-rich px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <div className="size-2 shrink-0 animate-pulse bg-foreground/10" />
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
