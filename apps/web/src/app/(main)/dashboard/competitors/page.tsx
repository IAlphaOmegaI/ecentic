import { PlusIcon } from "@zenncore/icons";
import { unwrapResult } from "@zenncore/utils";
import Link from "next/link";
import { Suspense } from "react";
import * as Competitor from "@/server/app/competitor";
import { CompetitorsTable } from "./_components/competitors-table";

export default () => (
  <div className="p-6">
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="font-medium text-foreground text-xl">
          Competitor Intelligence
        </h1>
        <p className="font-light text-foreground-dimmed text-sm">
          Track and analyze your competitive landscape
        </p>
      </div>
      <Link
        href="/onboarding/competitors"
        className="flex items-center gap-1.5 bg-primary px-3 py-1.5 text-sm text-white transition-colors hover:bg-primary/90"
      >
        <PlusIcon className="size-3.5" />
        Add Competitor
      </Link>
    </div>

    <Suspense fallback={<StatsSkeleton />}>
      <Statistics />
    </Suspense>

    <Suspense fallback={<TableSkeleton />}>
      <Competitors />
    </Suspense>

    <Suspense fallback={<InsightsSkeleton />}>
      <Insights />
    </Suspense>
  </div>
);

const Statistics = async () => {
  const data = await unwrapResult(Competitor.gatherIntelligence());
  if (!data) return null;

  const { brands } = data;

  const winning = brands.filter((brand) => brand.winRate >= 50).length;
  const dangerous =
    brands.length > 0
      ? brands.reduce((worst, brand) =>
          brand.winRate < worst.winRate ? brand : worst,
        )
      : null;

  return (
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="border border-accent-foreground bg-background-rich p-4">
        <p className="font-light text-foreground-dimmed text-xs uppercase tracking-wide">
          Brands Tracked
        </p>
        <p className="mt-1 font-semibold text-3xl text-foreground">
          {brands.length}
        </p>
      </div>
      <div className="border border-accent-foreground bg-background-rich p-4">
        <p className="font-light text-foreground-dimmed text-xs uppercase tracking-wide">
          Winning Against
        </p>
        <p className="mt-1 font-semibold text-3xl text-success">
          {winning} of {brands.length}
        </p>
      </div>
      <div className="border border-accent-foreground bg-background-rich p-4">
        <p className="font-light text-foreground-dimmed text-xs uppercase tracking-wide">
          Most Dangerous
        </p>
        {dangerous ? (
          <>
            <p className="mt-1 font-medium text-base text-foreground">
              {dangerous.brand}
            </p>
            <p className="font-light text-error text-xs">
              {dangerous.winRate}% win rate against them
            </p>
          </>
        ) : (
          <p className="mt-1 font-light text-foreground-dimmed text-sm">
            No data yet
          </p>
        )}
      </div>
    </div>
  );
};

const Competitors = async () => {
  const data = await unwrapResult(Competitor.gatherIntelligence());

  if (data.brands.length === 0)
    return (
      <div className="mb-6 border border-accent-foreground bg-background-rich p-8 text-center">
        <p className="font-medium text-foreground text-sm">
          No competitors tracked yet
        </p>
        <p className="mt-1 font-light text-foreground-dimmed text-xs">
          Add competitors to start analyzing your competitive landscape.
        </p>
      </div>
    );

  return (
    <div className="mb-6">
      <CompetitorsTable rows={data.brands} />
    </div>
  );
};

const Insights = async () => {
  const data = await unwrapResult(Competitor.gatherIntelligence());
  if (!data?.scan?.topFinding) return null;

  return (
    <div className="border border-accent-foreground bg-background-rich">
      <div className="border-accent-foreground border-b px-4 py-3">
        <p className="font-medium text-foreground text-sm">
          Latest Scan Insights
        </p>
      </div>
      <div className="px-4 py-3">
        <p className="font-light text-foreground text-sm">
          {data.scan.topFinding}
        </p>
        <div className="mt-2 flex items-center gap-4">
          <span className="font-light text-foreground-dimmed text-xs">
            {data.scan.wins}W / {data.scan.losses}L
          </span>
          <span className="font-light text-foreground-dimmed text-xs">
            {data.scan.completedSimulations} simulations
          </span>
        </div>
      </div>
    </div>
  );
};

const StatsSkeleton = () => {
  const keys = ["brands", "winning", "dangerous"];

  return (
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
      {keys.map((key) => (
        <div
          key={key}
          className="border border-accent-foreground bg-background-rich p-4"
        >
          <div className="h-3 w-24 animate-pulse bg-foreground/10" />
          <div className="mt-3 h-8 w-16 animate-pulse bg-foreground/10" />
        </div>
      ))}
    </div>
  );
};

const TableSkeleton = () => {
  const keys = ["row-a", "row-b", "row-c", "row-d"];

  return (
    <div className="mb-6 border border-accent-foreground bg-background-rich">
      <div className="border-accent-foreground border-b bg-background-dimmed px-4 py-2">
        <div className="h-4 w-32 animate-pulse bg-foreground/10" />
      </div>
      {keys.map((key) => (
        <div
          key={key}
          className="flex items-center gap-4 border-accent-foreground border-b px-4 py-3 last:border-b-0"
        >
          <div className="size-7 animate-pulse bg-foreground/10" />
          <div className="h-4 w-24 animate-pulse bg-foreground/10" />
          <div className="ml-auto h-4 w-16 animate-pulse bg-foreground/10" />
        </div>
      ))}
    </div>
  );
};

const InsightsSkeleton = () => (
  <div className="border border-accent-foreground bg-background-rich">
    <div className="border-accent-foreground border-b px-4 py-3">
      <div className="h-4 w-40 animate-pulse bg-foreground/10" />
    </div>
    <div className="px-4 py-3">
      <div className="h-4 w-full animate-pulse bg-foreground/10" />
      <div className="mt-2 h-3 w-32 animate-pulse bg-foreground/10" />
    </div>
  </div>
);
