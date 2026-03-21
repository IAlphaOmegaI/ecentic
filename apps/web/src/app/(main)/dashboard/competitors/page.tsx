import { unwrapResult } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import type { SearchParamsProps } from "@zenncore/web/types";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import * as Competitor from "@/server/app/competitor";
import type { Pager } from "@/server/utils/pagination";
import { extractPaginationParams } from "@/server/utils/pagination";
import { CompetitorsTable } from "./_components/competitors-table";

export default (props: SearchParamsProps<keyof Pager>) => {
  return (
    <div className="flex flex-col">
      <div className="mx-8 border-accent-foreground border-x">
        <div className="-mx-8 border-accent-foreground border-b">
          <div className="mx-8 flex items-center justify-between px-6 py-8">
            <div>
              <h1 className="font-medium text-3xl text-foreground">
                Competitor Intelligence
              </h1>
              <p className="font-light text-foreground-dimmed text-sm">
                Track and analyze your competitive landscape
              </p>
            </div>
            <Button
              variant="outline"
              color="primary"
              render={<Link href="/onboarding/competitors" />}
            >
              Add Competitor
            </Button>
          </div>
        </div>

        <div className="-mx-8 border-accent-foreground border-b">
          <div className="mx-8">
            <Suspense fallback={<StatsSkeleton />}>
              <Statistics />
            </Suspense>
          </div>
        </div>

        <div className="-mx-8 border-accent-foreground border-b">
          <div className="mx-8">
            <Suspense fallback={<TableSkeleton />}>
              <Competitors query={props} />
            </Suspense>
          </div>
        </div>

        <div className="h-8" />
        <div className="-mx-8 border-accent-foreground border-t border-b">
          <div className="mx-8 px-6 py-6">
            <Suspense fallback={<InsightsSkeleton />}>
              <Insights />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
};

const Statistics = async () => {
  await connection();
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
    <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-3">
      <div className="bg-background p-4">
        <p className="font-light text-foreground-dimmed text-xs uppercase tracking-wide">
          Brands Tracked
        </p>
        <p className="mt-1 font-semibold text-3xl text-foreground">
          {brands.length}
        </p>
      </div>
      <div className="bg-background p-4">
        <p className="font-light text-foreground-dimmed text-xs uppercase tracking-wide">
          Winning Against
        </p>
        <p className="mt-1 font-semibold text-3xl text-success">
          {winning} of {brands.length}
        </p>
      </div>
      <div className="bg-background p-4">
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

const Competitors = async ({
  query,
}: {
  query: SearchParamsProps<keyof Pager>;
}) => {
  await connection();
  const { page, size } = await extractPaginationParams(query.searchParams);
  const data = await unwrapResult(
    Competitor.gatherPaginatedIntelligence({ page, size }),
  );

  if (data.brands.length === 0 && data.pagination.total === 0)
    return (
      <div className="bg-background p-8 text-center">
        <p className="font-medium text-base text-foreground">
          No competitors tracked yet
        </p>
        <p className="mt-1 font-light text-foreground-dimmed text-xs">
          Add competitors to start analyzing your competitive landscape.
        </p>
      </div>
    );

  return <CompetitorsTable rows={data.brands} pagination={data.pagination} />;
};

const Insights = async () => {
  await connection();
  const data = await unwrapResult(Competitor.gatherIntelligence());
  if (!data?.scan?.topFinding) return null;

  return (
    <div>
      <p className="mb-2 font-medium text-base text-foreground">
        Latest Scan Insights
      </p>
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
  );
};

const StatsSkeleton = () => {
  const keys = ["brands", "winning", "dangerous"];

  return (
    <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-3">
      {keys.map((key) => (
        <div key={key} className="bg-background p-4">
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
    <div>
      <div className="flex items-center justify-between border-accent-foreground border-b p-4">
        <div className="h-7 w-40 animate-pulse bg-foreground/10" />
      </div>
      <div className="overflow-x-auto bg-background-rich">
        <table className="w-full">
          <thead>
            <tr className="border-accent-foreground border-b">
              {[
                "Brand",
                "Products",
                "Win Rate",
                "Simulations",
                "Updated",
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
                    <div className="h-4 w-24 animate-pulse bg-foreground/10" />
                  </div>
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
                  <div className="h-4 w-8 animate-pulse bg-foreground/10" />
                </td>
                <td className="px-4 py-3">
                  <div className="h-4 w-16 animate-pulse bg-foreground/10" />
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

const InsightsSkeleton = () => (
  <div>
    <div className="h-4 w-40 animate-pulse bg-foreground/10" />
    <div className="mt-2 h-4 w-full animate-pulse bg-foreground/10" />
    <div className="mt-2 h-3 w-32 animate-pulse bg-foreground/10" />
  </div>
);
