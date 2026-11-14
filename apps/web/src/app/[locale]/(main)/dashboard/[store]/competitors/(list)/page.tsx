import { ArrowRightIcon, PlusIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import type { SearchParamsProps } from "@zenncore/web/types";
import { connection } from "next/server";
import { getFormatter, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { CommerceFigure } from "@/components/marketing/commerce-figure";
import {
  QueryTransitionFade,
  QueryTransitionProvider,
} from "@/components/query-transition";
import { Link } from "@/i18n/navigation";
import * as Competitor from "@/server/app/competitor";
import { Environment } from "@/server/utils/environment";
import type { Pager } from "@/server/utils/pagination";
import { extractPaginationParams } from "@/server/utils/pagination";
import { CompetitorsTable } from "../../../_components/competitors-table";
import { EntityMark } from "../../brand/_components/entity-mark";
import { ResearchUnavailable } from "../../research/_components/shell";
import {
  AddActionSkeleton,
  CompetitorSummarySkeleton,
  CompetitorsShell,
  LandscapeSkeleton,
  TableSkeleton,
} from "../_components/shell";

type StoreParams =
  PageProps<"/[locale]/dashboard/[store]/competitors">["params"];
export default ({
  params,
  searchParams,
}: SearchParamsProps<keyof Pager> & { params: StoreParams }) => (
  <CompetitorsShell
    action={
      <Suspense fallback={<AddActionSkeleton />}>
        <AddCompetitorAction params={params} />
      </Suspense>
    }
    stats={
      <Suspense fallback={<CompetitorSummarySkeleton />}>
        <Summary params={params} />
      </Suspense>
    }
    landscape={
      <Suspense fallback={<LandscapeSkeleton />}>
        <Comparisons params={params} />
      </Suspense>
    }
    table={
      <QueryTransitionProvider>
        <QueryTransitionFade>
          <Suspense fallback={<TableSkeleton />}>
            <Competitors params={params} searchParams={searchParams} />
          </Suspense>
        </QueryTransitionFade>
      </QueryTransitionProvider>
    }
  />
);

const Summary = async ({ params }: { params: StoreParams }) => {
  await connection();
  const { store } = await params;
  const translate = await getTranslations("dashboard.research.competitors");
  const format = await getFormatter();
  const result = await Competitor.gatherIntelligence(Environment.SERVER, {
    store,
  });
  if (!result.success) return <ResearchUnavailable />;
  const { brands } = result.data;
  if (brands.length === 0)
    return (
      <section className="grid min-h-80 items-center border-accent-foreground border-b md:grid-cols-3">
        <div className="px-4 py-8 sm:px-6 md:col-span-2">
          <h2 className="font-semibold text-2xl">{translate("empty.title")}</h2>
          <p className="mt-3 max-w-xl text-foreground-dimmed text-sm leading-6">
            {translate("empty.description")}
          </p>
          <Button
            className="mt-5"
            render={<Link href={`/dashboard/${store}/competitors/add`} />}
          >
            {translate("action.primary")}
            <PlusIcon className="size-4" />
          </Button>
        </div>
        <div className="mx-auto w-full max-w-72 px-6">
          <CommerceFigure kind="headphones" className="h-52" />
        </div>
      </section>
    );
  const tested = brands.filter((brand) => brand.simulations > 0);
  const total = brands.reduce((sum, brand) => sum + brand.simulations, 0);
  return (
    <dl className="grid grid-cols-3 gap-px border-accent-foreground border-b bg-accent-foreground">
      {(
        [
          { key: "tracked", count: brands.length },
          { key: "tested", count: tested.length },
          { key: "comparisons", count: total },
        ] as const
      ).map(({ key, count }) => (
        <div key={key} className="bg-background px-4 py-5 sm:px-6">
          <dt className="text-foreground-dimmed text-sm">
            {translate(`stats.${key}`)}
          </dt>
          <dd className="mt-3 font-semibold text-3xl tabular-nums">
            {format.number(count)}
          </dd>
        </div>
      ))}
    </dl>
  );
};

const Comparisons = async ({ params }: { params: StoreParams }) => {
  await connection();
  const { store } = await params;
  const translate = await getTranslations("dashboard.research.competitors");
  const format = await getFormatter();
  const result = await Competitor.gatherIntelligence(Environment.SERVER, {
    store,
  });
  if (!result.success) return null;
  const brands = result.data.brands
    .filter((brand) => brand.simulations > 0)
    .sort((left, right) => left.winRate - right.winRate);
  if (brands.length === 0) return null;
  return (
    <section className="border-accent-foreground border-b">
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <div>
          <h2 className="font-semibold text-xl">
            {translate("evidence.title")}
          </h2>
          <p className="mt-2 max-w-3xl text-foreground-dimmed text-sm leading-6">
            {translate("evidence.description")}
          </p>
        </div>
        <Button
          variant="soft"
          render={<Link href={`/dashboard/${store}/simulations`} />}
        >
          {translate("action.secondary")}
          <ArrowRightIcon className="size-4" />
        </Button>
      </div>
      <ol className="divide-y divide-accent-foreground border-accent-foreground border-t">
        {brands.slice(0, 6).map((brand) => (
          <li
            key={brand._id}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6"
          >
            <EntityMark name={brand.brand} className="size-9" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-sm">{brand.brand}</p>
              <p className="mt-1 text-foreground-dimmed text-xs">
                {translate("evidence.sample", {
                  count: format.number(brand.simulations),
                })}
              </p>
            </div>
            <div className="flex w-1/3 min-w-32 items-center gap-3">
              <div
                aria-hidden
                className="h-1.5 flex-1 overflow-hidden rounded-full bg-accent-foreground"
              >
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${brand.winRate}%` }}
                />
              </div>
              <span className="w-12 text-right font-semibold text-sm tabular-nums">
                {format.number(brand.winRate / 100, {
                  style: "percent",
                  maximumFractionDigits: 0,
                })}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
};

const Competitors = async ({
  params,
  searchParams,
}: {
  params: StoreParams;
  searchParams: SearchParamsProps<keyof Pager>["searchParams"];
}) => {
  await connection();
  const { store } = await params;
  const _translate = await getTranslations("dashboard.competitors.table");
  const shared = await getTranslations("dashboard.shared");
  const { page, size } = await extractPaginationParams(searchParams);
  const result = await Competitor.gatherPaginatedIntelligence(
    Environment.SERVER,
    { page, size, store },
  );
  if (!result.success) return <ResearchUnavailable />;
  const data = result.data;
  if (data.pagination.total === 0) return null;
  return (
    <CompetitorsTable
      paginated
      pageSize={data.pagination.size}
      pageCount={Math.max(
        1,
        Math.ceil(data.pagination.total / data.pagination.size),
      )}
      pageIndex={data.pagination.page}
      rows={data.brands}
      action={
        <p className="text-foreground-dimmed text-sm">
          {shared("count.competitors", { count: data.pagination.total })}
        </p>
      }
    />
  );
};

const AddCompetitorAction = async ({ params }: { params: StoreParams }) => {
  const { store } = await params;
  const translate = await getTranslations("dashboard.research.competitors");
  return (
    <Button render={<Link href={`/dashboard/${store}/competitors/add`} />}>
      <PlusIcon className="size-4" />
      {translate("action.primary")}
    </Button>
  );
};
