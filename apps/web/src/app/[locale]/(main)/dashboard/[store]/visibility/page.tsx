import { ArrowRightIcon, ShareIcon } from "@zenncore/icons";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import * as AgentReadiness from "@/server/app/intelligence/agent-readiness";
import * as CatalogRank from "@/server/app/intelligence/catalog-rank";
import { unwrapEntitled } from "@/server/utils/entitlement";
import { Environment } from "@/server/utils/environment";
import { SectionHeader, StatusPill } from "../../_components/grid";
import {
  AuditSkeleton,
  RankSkeleton,
  VisibilityShell,
} from "./_components/shell";
import { FeedUrlCard, RankChecker } from "./_components/visibility-client";

type StoreParams =
  PageProps<"/[locale]/dashboard/[store]/visibility">["params"];

const CHECK_TONES = {
  pass: "success",
  warn: "warning",
  fail: "error",
  manual: "neutral",
} as const;

/** design.md §4.4 — the shared win-rate/score thresholds, not a local scale. */
const scoreTone = (score: number) => {
  switch (true) {
    case score >= 60:
      return "success" as const;
    case score >= 30:
      return "warning" as const;
    default:
      return "error" as const;
  }
};

const SCORE_FILLS = {
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-error",
} as const;

const AuditContent = async ({ params }: { params: StoreParams }) => {
  await connection();
  const translate = await getTranslations("dashboard.visibility");
  const { store } = await params;
  // Renders beneath the paywall overlay for accounts without a plan — see
  // `unwrapEntitled`.
  const report = unwrapEntitled(
    await AgentReadiness.auditStore(Environment.SERVER, { store }),
  );
  if (!report) return null;

  const tone = scoreTone(report.score);

  return (
    <div className="flex flex-col">
      {/* The page's lead metric — design.md §10.2 leads with the answer. */}
      <div className="flex flex-col gap-3 border-accent-foreground border-b p-4">
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
            {translate("audit.scoreLabel")}
          </p>
          <StatusPill tone={tone}>
            {translate(`audit.scoreStatus.${tone}`)}
          </StatusPill>
        </div>
        <p className="font-bold text-4xl text-foreground-rich tabular-nums tracking-[-0.02em]">
          {report.score}
          <span className="ml-1 font-medium text-foreground-dimmed text-xl">
            %
          </span>
        </p>
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-background-dimmed"
          role="img"
          aria-label={translate("audit.scoreLabel")}
        >
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${SCORE_FILLS[tone]}`}
            style={{ width: `${report.score}%` }}
          />
        </div>
      </div>

      <div className="divide-y divide-accent-foreground">
        {report.checks.map((check) => (
          <div
            key={check.key}
            className="flex flex-col gap-2 p-4 sm:grid sm:grid-cols-[9rem_1fr] sm:gap-4"
          >
            <div>
              <StatusPill tone={CHECK_TONES[check.status]}>
                {translate(`audit.checkStatus.${check.status}`)}
              </StatusPill>
            </div>
            <div className="min-w-0">
              <p className="font-medium text-foreground text-sm">
                {check.label}
              </p>
              <p className="mt-1 max-w-3xl text-foreground-dimmed text-sm">
                {check.detail}
              </p>
              {check.recommendation && (
                <p className="mt-2 flex max-w-3xl gap-2 text-foreground text-sm">
                  <ArrowRightIcon
                    aria-hidden
                    className="mt-1 size-3.5 shrink-0 text-primary"
                  />
                  {check.recommendation}
                </p>
              )}
              {check.action && (
                <a
                  href={check.action.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex w-fit items-center gap-1.5 font-medium text-primary-text text-sm underline-offset-2 hover:underline"
                >
                  {check.action.label}
                  <ShareIcon aria-hidden className="size-3.5" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {report.feed && (
        <>
          <SectionHeader
            title={translate("audit.feed.title", {
              count: String(report.feed.itemCount),
              skipped:
                report.feed.skippedCount > 0
                  ? translate("audit.feed.skipped", {
                      count: String(report.feed.skippedCount),
                    })
                  : "",
            })}
            description={translate("audit.feed.description")}
          />
          <FeedUrlCard url={report.feed.url} />
        </>
      )}
    </div>
  );
};

const RankSection = async ({ params }: { params: StoreParams }) => {
  await connection();
  const { store } = await params;
  const configured = await CatalogRank.isCatalogConfigured();
  return <RankChecker store={store} configured={configured} />;
};

export default ({
  params,
}: PageProps<"/[locale]/dashboard/[store]/visibility">) => (
  <VisibilityShell
    audit={
      <Suspense fallback={<AuditSkeleton />}>
        <AuditContent params={params} />
      </Suspense>
    }
    rank={
      <Suspense fallback={<RankSkeleton />}>
        <RankSection params={params} />
      </Suspense>
    }
  />
);
