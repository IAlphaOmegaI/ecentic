import {
  ArrowRightIcon,
  BullseyeIcon,
  RadarIcon,
  SearchIcon,
} from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { connection } from "next/server";
import { getFormatter, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AnalysisText } from "@/components/analysis-text";
import { CommerceFigure } from "@/components/marketing/commerce-figure";
import { Link } from "@/i18n/navigation";
import * as BrandSnapshot from "@/server/app/brand-snapshot";
import * as Scan from "@/server/app/scan";
import { isSubscriptionRequired } from "@/server/utils/entitlement";
import { Environment } from "@/server/utils/environment";
import { Crosshair } from "../../_components/grid";
import {
  ResearchBrandSkeleton,
  ResearchComparisonSkeleton,
  ResearchDirectionsSkeleton,
  ResearchShell,
  ResearchUnavailable,
} from "./_components/shell";

type ResearchParams = Promise<{ locale: string; store: string }>;

export default ({ params }: { params: ResearchParams }) => (
  <ResearchShell>
    <Suspense fallback={<ResearchComparisonSkeleton />}>
      <LatestResearch params={params} />
    </Suspense>
    <Suspense fallback={<ResearchBrandSkeleton />}>
      <SavedBrand params={params} />
    </Suspense>
    <Suspense fallback={<ResearchDirectionsSkeleton />}>
      <ResearchDirections params={params} />
    </Suspense>
  </ResearchShell>
);

const LatestResearch = async ({ params }: { params: ResearchParams }) => {
  await connection();
  const { store } = await params;
  const translate = await getTranslations("dashboard.research");
  const format = await getFormatter();
  const result = await Scan.getLatest(Environment.SERVER, {
    store,
    status: "complete",
    limit: 4,
  });
  if (!result.success) return <ResearchUnavailable />;
  const [latest, ...previous] = result.data;
  if (!latest)
    return (
      <section className="grid min-h-72 items-center border-accent-foreground border-b md:grid-cols-3">
        <div className="px-4 py-8 sm:px-6 md:col-span-2">
          <h2 className="font-semibold text-2xl text-foreground-rich">
            {translate("empty.title")}
          </h2>
          <p className="mt-3 max-w-xl text-foreground-dimmed text-sm leading-6">
            {translate("empty.description")}
          </p>
          <Button
            className="mt-5"
            render={<Link href={`/dashboard/${store}/simulations`} />}
          >
            {translate("comparison.action.primary")}
            <ArrowRightIcon className="size-4" />
          </Button>
        </div>
        <div className="mx-auto w-full max-w-72 px-6 pb-6 md:py-6">
          <CommerceFigure kind="comparisonStand" className="h-48" />
        </div>
      </section>
    );
  const total = latest.wins + latest.losses;
  return (
    <section className="relative grid border-accent-foreground border-b lg:grid-cols-3">
      <div className="min-w-0 px-4 py-6 sm:px-6 lg:col-span-2 lg:border-accent-foreground lg:border-r">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-xl">
              {translate("comparison.title")}
            </h2>
            <p className="mt-1 text-foreground-dimmed text-xs">
              <time dateTime={latest.updatedAt.toISOString()}>
                {format.dateTime(latest.updatedAt, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </time>
            </p>
          </div>
          <Button
            variant="soft"
            render={<Link href={`/dashboard/${store}/simulations#results`} />}
          >
            {translate("comparison.action.secondary")}
            <ArrowRightIcon className="size-4" />
          </Button>
        </div>
        <div className="mt-4 flex min-w-0 items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-foreground-dimmed text-sm">
              {translate("comparison.rate")}
            </p>
            <p className="mt-1 font-semibold text-5xl text-foreground-rich tabular-nums">
              {total > 0
                ? format.number(latest.wins / total, {
                    style: "percent",
                    maximumFractionDigits: 0,
                  })
                : "—"}
            </p>
            <p className="mt-3 text-foreground text-sm leading-6">
              {translate("comparison.sample", {
                wins: format.number(latest.wins),
                total: format.number(total),
              })}
            </p>
          </div>
          <div aria-hidden className="w-32 shrink-0 sm:w-48">
            <CommerceFigure kind="comparisonStand" label="" />
          </div>
        </div>
        <p className="mt-6 max-w-2xl text-foreground-dimmed text-sm leading-6">
          {translate("comparison.scope")}
        </p>
      </div>
      <div className="relative min-w-0 border-accent-foreground border-t lg:border-t-0">
        <Crosshair className="top-0 left-0 -translate-y-1/2 lg:-translate-x-1/2" />
        <h3 className="px-4 pt-6 pb-3 font-medium text-sm sm:px-6">
          {translate("comparison.recent")}
        </h3>
        {previous.length > 0 ? (
          <ol className="divide-y divide-accent-foreground">
            {previous.map((scan) => {
              const answered = scan.wins + scan.losses;
              return (
                <li
                  key={scan.id}
                  className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6"
                >
                  <div>
                    <time
                      className="text-foreground text-sm"
                      dateTime={scan.updatedAt.toISOString()}
                    >
                      {format.dateTime(scan.updatedAt, { dateStyle: "medium" })}
                    </time>
                    <p className="mt-1 text-foreground-dimmed text-xs">
                      {translate("comparison.sample", {
                        wins: format.number(scan.wins),
                        total: format.number(answered),
                      })}
                    </p>
                  </div>
                  <span className="font-semibold text-lg tabular-nums">
                    {answered > 0
                      ? format.number(scan.wins / answered, {
                          style: "percent",
                          maximumFractionDigits: 0,
                        })
                      : "—"}
                  </span>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="px-4 py-4 text-foreground-dimmed text-sm leading-6 sm:px-6">
            {translate("comparison.first")}
          </p>
        )}
        <p className="px-4 py-4 text-foreground-dimmed text-xs leading-5 sm:px-6">
          {translate("comparison.cohorts")}
        </p>
      </div>
      <Crosshair className="bottom-0 left-0 translate-y-1/2" />
      <Crosshair className="right-0 bottom-0 translate-y-1/2" />
    </section>
  );
};

const SavedBrand = async ({ params }: { params: ResearchParams }) => {
  await connection();
  const { store } = await params;
  const translate = await getTranslations("dashboard.research.brand");
  const format = await getFormatter();
  const result = await BrandSnapshot.overviewForStore(Environment.SERVER, {
    store,
  });
  if (!result.success)
    return isSubscriptionRequired(result.error) ? null : (
      <ResearchUnavailable />
    );
  const { complete, running, failed, interrupted } = result.data;
  return (
    <section className="border-accent-foreground border-b px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-xl">{translate("title")}</h2>
          <p className="mt-1 text-foreground-dimmed text-xs">
            {complete?.report
              ? format.dateTime(complete.updatedAt, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })
              : translate(
                  running
                    ? "running"
                    : failed || interrupted
                      ? "failed"
                      : "empty",
                )}
          </p>
        </div>
        <Button
          variant="soft"
          render={<Link href={`/dashboard/${store}/brand`} />}
        >
          {translate("action.primary")}
          <ArrowRightIcon className="size-4" />
        </Button>
      </div>
      {complete?.report && (
        <p className="mt-4 max-w-4xl text-foreground text-sm leading-7">
          <AnalysisText
            text={complete.report.summary}
            terms={[
              ...complete.report.engines,
              ...complete.report.topCompetitors.map((entry) => entry.name),
              ...complete.report.topSources.map((entry) => entry.domain),
            ]}
          />
        </p>
      )}
      <p className="mt-3 max-w-3xl text-foreground-dimmed text-sm leading-6">
        {translate("scope")}
      </p>
      {running && complete?.report && (
        <p className="mt-3 text-primary-text text-sm" role="status">
          {translate("running")}
        </p>
      )}
      {!running && complete?.report && (failed || interrupted) && (
        <p className="mt-3 text-sm text-warning-foreground" role="status">
          {translate("failed")}
        </p>
      )}
    </section>
  );
};

const ResearchDirections = async ({ params }: { params: ResearchParams }) => {
  const { store } = await params;
  const translate = await getTranslations("dashboard.research.directions");
  const directions = [
    { key: "questions", path: "discovery", Icon: SearchIcon },
    { key: "competitors", path: "competitors", Icon: RadarIcon },
    { key: "rank", path: "research/catalog-rank", Icon: BullseyeIcon },
  ] as const;
  return (
    <section className="grid gap-px border-accent-foreground border-b bg-accent-foreground md:grid-cols-3">
      {directions.map(({ key, path, Icon }) => (
        <div
          key={key}
          className="flex min-w-0 flex-col items-start bg-background px-4 py-6 sm:px-6"
        >
          <Icon aria-hidden className="mb-4 size-7 text-primary" />
          <h2 className="font-semibold text-lg">{translate(`${key}.title`)}</h2>
          <p className="mt-2 flex-1 text-foreground-dimmed text-sm leading-6">
            {translate(`${key}.description`)}
          </p>
          <Button
            variant="soft"
            className="mt-5"
            render={<Link href={`/dashboard/${store}/${path}`} />}
          >
            {translate(`${key}.action.primary`)}
            <ArrowRightIcon className="size-4" />
          </Button>
        </div>
      ))}
    </section>
  );
};
