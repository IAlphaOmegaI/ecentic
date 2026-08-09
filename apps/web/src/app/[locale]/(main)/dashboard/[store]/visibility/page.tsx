import { unwrapResult } from "@zenncore/utils";
import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Suspense } from "react";
import * as AgentReadiness from "@/server/app/intelligence/agent-readiness";
import * as CatalogRank from "@/server/app/intelligence/catalog-rank";
import { Environment } from "@/server/utils/environment";
import { StatusPill } from "../../_components/grid";
import { AuditSkeleton, VisibilityShell } from "./_components/shell";
import { FeedUrlCard, RankChecker } from "./_components/visibility-client";

type StoreParams = PageProps<"/dashboard/[store]/visibility">["params"];

const CHECK_TONES = {
  pass: "success",
  warn: "warning",
  fail: "error",
  manual: "neutral",
} as const;

const AuditContent = async ({ params }: { params: StoreParams }) => {
  await connection();
  const translate = await getTranslations("dashboard.visibility.audit");
  const { store } = await params;
  const report = unwrapResult(
    await AgentReadiness.auditStore(Environment.SERVER, { store }),
  );

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-baseline gap-3 border-accent-foreground border-b bg-background-dimmed px-4 py-3">
        <p className="font-bold text-2xl text-foreground-rich tabular-nums">
          {report.score}%
        </p>
        <p className="text-foreground-dimmed text-sm">
          {translate("scoreDetail")}
        </p>
      </div>

      <div className="divide-y divide-accent-foreground">
        {report.checks.map((check) => (
          <div key={check.key} className="flex flex-col gap-1.5 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill tone={CHECK_TONES[check.status]}>
                {translate(`checkStatus.${check.status}`)}
              </StatusPill>
              <p className="font-medium text-foreground text-sm">
                {check.label}
              </p>
            </div>
            <p className="max-w-3xl text-foreground-dimmed text-sm">
              {check.detail}
            </p>
            {check.recommendation && (
              <p className="max-w-3xl text-foreground text-sm">
                → {check.recommendation}
              </p>
            )}
            {check.action && (
              <a
                href={check.action.url}
                target="_blank"
                rel="noreferrer"
                className="w-fit font-medium text-primary text-sm underline-offset-2 hover:underline"
              >
                {check.action.label} ↗
              </a>
            )}
          </div>
        ))}
      </div>

      {report.feed && (
        <div className="border-accent-foreground border-t">
          <div className="border-accent-foreground border-b bg-background-dimmed px-4 py-3">
            <p className="font-medium text-base text-foreground">
              {translate("feed.title", {
                count: report.feed.itemCount,
                skipped:
                  report.feed.skippedCount > 0
                    ? translate("feed.skipped", {
                        count: report.feed.skippedCount,
                      })
                    : "",
              })}
            </p>
            <p className="mt-0.5 text-foreground-dimmed text-xs">
              {translate("feed.description")}
            </p>
          </div>
          <FeedUrlCard url={report.feed.url} />
        </div>
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

export default ({ params }: PageProps<"/dashboard/[store]/visibility">) => (
  <VisibilityShell
    audit={
      <Suspense fallback={<AuditSkeleton />}>
        <AuditContent params={params} />
      </Suspense>
    }
    rank={
      <Suspense fallback={<AuditSkeleton />}>
        <RankSection params={params} />
      </Suspense>
    }
  />
);
