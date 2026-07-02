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
  StatusPill,
  TopFindingCallout,
  WinRateBadge,
} from "../_components/grid";
import { WinRateTiersChart } from "./_components/win-rate-tiers-chart";

const emptyStatCards = [
  { label: "Brands Tracked", icon: RadarIcon },
  { label: "Winning Against", icon: TrendUpIcon },
  { label: "Most Dangerous", icon: ShieldCheckIcon },
  { label: "Total Simulations", icon: CheckBadgeIcon },
] as const;

export default ({ searchParams }: SearchParamsProps<keyof Pager>) => (
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
              <LastScanned />
            </Suspense>
            <h1 className="mt-3 font-bold text-[28px] text-foreground-rich tracking-[-0.02em]">
              Competitors
            </h1>
            <p className="mt-1 text-foreground-dimmed text-sm">
              How AI shopping agents rank you against the brands you track.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
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
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <Suspense fallback={<StatsSkeleton />}>
            <StatCards />
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
          <Suspense fallback={<LandscapeSkeleton />}>
            <CompetitiveLandscape />
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
            <Competitors searchParams={searchParams} />
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
    <StatusPill tone={data.scan?.updatedAt ? "success" : "neutral"}>
      {data.scan?.updatedAt
        ? `Live — last scanned ${formatRelativeTime(data.scan.updatedAt)}`
        : "No scans run yet"}
    </StatusPill>
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

  const winning = brands.filter((brand) => brand.winRate >= 50).length;
  const totalProducts = brands.reduce((sum, brand) => sum + brand.products, 0);
  const totalSimulations = brands.reduce(
    (sum, brand) => sum + brand.simulations,
    0,
  );
  const scored = brands.filter((brand) => brand.simulations > 0);
  const dangerous = (scored.length > 0 ? scored : brands).reduce(
    (worst, brand) => (brand.winRate < worst.winRate ? brand : worst),
  );

  const scans = await unwrapResult(Scan.getLatest(Environment.SERVER));
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

  const overallWinRate = Math.round(
    brands.reduce((sum, brand) => sum + brand.winRate, 0) / brands.length,
  );

  return (
    <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-2 xl:grid-cols-4">
      <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
        <StatLabel
          label="Brands Tracked"
          icon={<RadarIcon className="size-7.5 text-warning" />}
        />
        <div>
          <p className="font-bold text-4xl text-foreground-rich tabular-nums tracking-[-0.02em]">
            {brands.length}
          </p>
          <p className="mt-3 text-foreground-dimmed text-xs">
            {totalProducts} {totalProducts === 1 ? "product" : "products"}{" "}
            monitored
          </p>
        </div>
      </div>

      <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
        <StatLabel
          label="Winning Against"
          icon={<TrendUpIcon className="size-7.5 text-success" />}
        />
        <div>
          <p className="font-bold text-4xl text-foreground-rich tabular-nums tracking-[-0.02em]">
            {winning}
            <span className="ml-1 font-medium text-foreground-dimmed text-xl">
              / {brands.length}
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
                since last scan
              </span>
            </p>
          ) : (
            <div className="mt-3">
              <div className="h-1 w-full rounded-full bg-accent-foreground">
                <div
                  className="h-full rounded-full bg-success"
                  style={{
                    width: `${Math.round((winning / brands.length) * 100)}%`,
                  }}
                />
              </div>
              <p className="mt-2 text-foreground-dimmed text-xs">
                {overallWinRate}% average win rate
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
        <StatLabel
          label="Most Dangerous"
          icon={<ShieldCheckIcon className="size-7.5 text-error" />}
        />
        <div>
          <p className="line-clamp-1 text-foreground text-sm">
            {dangerous.brand}
          </p>
          <p className="mt-1 font-bold text-4xl text-error tabular-nums tracking-[-0.02em]">
            {dangerous.winRate}
            <span className="ml-0.5 font-medium text-foreground-dimmed text-xl">
              %
            </span>
          </p>
          <p className="mt-3 text-foreground-dimmed text-xs">
            your win rate against them
          </p>
        </div>
      </div>

      <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
        <StatLabel
          label="Total Simulations"
          icon={<CheckBadgeIcon className="size-7.5 text-warning" />}
        />
        <div>
          <p className="font-bold text-4xl text-foreground-rich tabular-nums tracking-[-0.02em]">
            {totalSimulations}
          </p>
          <p className="mt-3 text-foreground-dimmed text-xs">
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
      color: "bg-primary",
    },
    {
      label: "Competitive (50–74%)",
      count: brands.filter((brand) => brand.winRate >= 50 && brand.winRate < 75)
        .length,
      color: "bg-info",
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
            <p className="mt-2 font-semibold text-foreground-rich text-lg">
              Win Rate by Competitor
            </p>
          </div>
          <p className="text-foreground-dimmed text-sm">
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
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-background-dimmed/60 font-medium text-primary text-xs">
                    {brand.brand.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="truncate font-medium text-foreground text-sm">
                    {brand.brand}
                  </span>
                </div>
                <div className="flex flex-1 items-center gap-3">
                  <div className="h-1 flex-1 rounded-full bg-accent-foreground">
                    <div
                      className={cn("h-full rounded-full", barColor)}
                      style={{ width: `${brand.winRate}%` }}
                    />
                  </div>
                  <span className="w-12 shrink-0 text-right font-medium text-foreground-rich text-sm tabular-nums">
                    {brand.winRate}%
                  </span>
                </div>
                <span className="w-16 shrink-0 text-right text-foreground-dimmed text-sm tabular-nums">
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
            <p className="font-medium text-[11px] text-foreground-dimmed uppercase tracking-[0.1em]">
              Distribution
            </p>
            <p className="mt-2 font-semibold text-foreground-rich text-lg">
              Win Rate Tiers
            </p>
          </div>

          <WinRateTiersChart tiers={tiers} total={brands.length} />
        </div>

        <div className="flex items-center justify-between bg-background-rich p-4">
          <Button color="accent" render={<Link href="/dashboard/optimize" />}>
            Optimizations
          </Button>
          <Button
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
        <p className="text-foreground-dimmed text-sm">
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

  const completed = scans.filter((scan) => scan.status === "complete");
  const scored = (data?.brands ?? []).filter((brand) => brand.simulations > 0);

  if (scored.length === 0 && completed.length === 0 && !data?.scan?.topFinding)
    return null;

  const insight = (() => {
    if (scored.length === 0) return null;

    const ranked = [...scored].sort((a, b) => a.winRate - b.winRate);
    const toughest = ranked[0];
    const strongest = ranked[ranked.length - 1];
    if (!toughest || !strongest) return null;

    const winning = scored.filter((brand) => brand.winRate >= 50).length;
    const overall = Math.round(
      scored.reduce((sum, brand) => sum + brand.winRate, 0) / scored.length,
    );
    const plural = scored.length === 1 ? "" : "s";

    switch (true) {
      case winning === scored.length:
        return {
          headline: `You out-rank all ${scored.length} simulated competitor${plural} (avg ${overall}% win rate).`,
          detail: `Your slimmest lead is against ${toughest.brand} at ${toughest.winRate}%. Keep listings optimized to defend it.`,
        };
      case toughest.winRate < 30:
        return {
          headline: `${toughest.brand} wins ${100 - toughest.winRate}% of agent comparisons against you — your biggest opportunity.`,
          detail: `You hold the majority against ${winning} of ${scored.length} competitor${plural} (avg ${overall}%). Optimizing the products you lose to ${toughest.brand} moves the needle most.`,
        };
      default:
        return {
          headline: `You hold the majority against ${winning} of ${scored.length} competitor${plural} (avg ${overall}% win rate).`,
          detail:
            toughest._id === strongest._id
              ? `Focus a listing optimization on the products ${toughest.brand} beats you on.`
              : `${toughest.brand} is your toughest rival at ${toughest.winRate}%; you lead ${strongest.brand} at ${strongest.winRate}%.`,
        };
    }
  })();

  const recentScans = completed.slice(0, 3);

  return (
    <div className="bg-background-rich">
      <div className="p-4">
        <SectionKicker>03 — Intelligence</SectionKicker>
        <p className="mt-2 font-semibold text-foreground-rich text-lg">
          Competitive Summary
        </p>
      </div>

      {insight && (
        <div className="border-accent-foreground border-t bg-primary/5 p-4">
          <p className="font-medium text-[10px] text-primary uppercase tracking-[0.08em]">
            Key Insight
          </p>
          <p className="mt-1 max-w-3xl font-medium text-base text-foreground-rich">
            {insight.headline}
          </p>
          <p className="mt-1 max-w-3xl text-foreground-dimmed text-sm leading-relaxed">
            {insight.detail}
          </p>
          <Button
            color="primary"
            className="mt-3"
            render={<Link href="/dashboard/optimize" />}
          >
            Optimize losing listings <ArrowRightIcon className="size-4" />
          </Button>
        </div>
      )}

      {data.scan?.topFinding && (
        <TopFindingCallout className="border-accent-foreground border-t">
          {data.scan.topFinding.impactDescription}
        </TopFindingCallout>
      )}

      {recentScans.length > 0 && (
        <>
          <div className="border-accent-foreground border-t px-4 pt-4 pb-1">
            <p className="font-medium text-[11px] text-foreground-dimmed uppercase tracking-[0.1em]">
              Recent Scan Activity
            </p>
          </div>
          <div className="flex flex-col gap-px border-accent-foreground border-t bg-accent-foreground">
            {recentScans.map((scan) => {
              const total = scan.wins + scan.losses;
              const winRate =
                total > 0 ? Math.round((scan.wins / total) * 100) : 0;

              return (
                <div
                  key={scan.id}
                  className="flex items-center justify-between bg-background-rich px-4 py-3 transition-colors hover:bg-background"
                >
                  <div className="flex min-w-0 items-center gap-3 pr-4">
                    <div
                      className={cn(
                        "size-2 shrink-0 rounded-[2px]",
                        scan.status === "complete"
                          ? "bg-success"
                          : "bg-warning",
                      )}
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-foreground-rich text-sm">
                        {scan.status === "complete"
                          ? `Scan completed — ${scan.wins}W / ${scan.losses}L`
                          : `Scan in progress — ${scan.completedSimulations}/${scan.totalSimulations}`}
                      </p>
                      {scan.topFinding && (
                        <p className="mt-0.5 truncate text-foreground-dimmed text-sm">
                          {scan.topFinding.impactDescription}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {total > 0 && <WinRateBadge rate={winRate} />}
                    <span className="whitespace-nowrap text-foreground-dimmed text-xs tabular-nums">
                      {formatRelativeTime(scan.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="flex items-center justify-between border-accent-foreground border-t p-4">
        <p className="text-foreground-dimmed text-sm">
          {completed.length} completed scan{completed.length !== 1 ? "s" : ""}
        </p>
        <Button color="accent" render={<Link href="/dashboard" />}>
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
          <div className="absolute top-5 right-5 size-7.5 animate-pulse bg-foreground/10" />
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
              <div className="size-8 shrink-0 animate-pulse rounded-md bg-foreground/10" />
              <div className="h-4 w-20 animate-pulse bg-foreground/10" />
            </div>
            <div className="flex flex-1 items-center gap-3">
              <div className="h-1 flex-1 animate-pulse rounded-full bg-foreground/10" />
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
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="size-9 shrink-0 animate-pulse rounded-md bg-foreground/10" />
                    <div className="space-y-1.5">
                      <div className="h-4 w-24 animate-pulse bg-foreground/10" />
                      <div className="h-3 w-16 animate-pulse bg-foreground/10" />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <div className="h-1 w-24 animate-pulse rounded-full bg-foreground/10" />
                    <div className="h-4 w-9 animate-pulse bg-foreground/10" />
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="h-4 w-10 animate-pulse bg-foreground/10" />
                </td>
                <td className="px-4 py-4">
                  <div className="h-4 w-20 animate-pulse bg-foreground/10" />
                </td>
                <td className="px-4 py-4">
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
            <div className="size-2 shrink-0 animate-pulse rounded-[2px] bg-foreground/10" />
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
