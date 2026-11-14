import { ArrowRightIcon, FileIcon, ShareIcon } from "@zenncore/icons";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import * as AgentReadiness from "@/server/app/intelligence/agent-readiness";
import { isSubscriptionRequired } from "@/server/utils/entitlement";
import { Environment } from "@/server/utils/environment";
import { StatusPill } from "../../_components/grid";
import { ChannelLoadError } from "../channels/_components/summary";
import { AuditSkeleton, VisibilityShell } from "./_components/shell";
import { FeedUrlCard } from "./_components/visibility-client";

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
  const result = await AgentReadiness.auditStore(Environment.SERVER, { store });
  if (!result.success) {
    if (isSubscriptionRequired(result.error)) return null;
    return <ChannelLoadError />;
  }
  const report = result.data;

  const tone = scoreTone(report.score);

  return (
    <div className="flex flex-col">
      {/* The page's lead metric — design.md §10.2 leads with the answer. */}
      <div className="grid border-accent-foreground border-b md:grid-cols-3">
        <div className="flex flex-col gap-3 px-4 py-5 sm:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-medium text-foreground-dimmed text-sm">
              {translate("audit.scoreLabel")}
            </p>
            <StatusPill tone={tone}>
              {translate(`audit.scoreStatus.${tone}`)}
            </StatusPill>
          </div>
          <p className="font-bold text-4xl text-foreground-rich tabular-nums tracking-tight">
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
              className={`h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none ${SCORE_FILLS[tone]}`}
              style={{ width: `${report.score}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-px border-accent-foreground border-t bg-accent-foreground md:col-span-2 md:border-t-0 md:border-l">
          {(["pass", "warn", "fail", "manual"] as const).map((status) => (
            <div
              key={status}
              className="flex items-center justify-between gap-3 bg-background-rich px-4 py-5 sm:px-6"
            >
              <StatusPill tone={CHECK_TONES[status]}>
                {translate(`audit.checkStatus.${status}`)}
              </StatusPill>
              <span className="font-semibold text-2xl text-foreground-rich tabular-nums">
                {
                  report.checks.filter((check) => check.status === status)
                    .length
                }
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="divide-y divide-accent-foreground">
        {report.checks.map((check) => (
          <div
            key={check.key}
            className="flex flex-col gap-2 px-4 py-5 sm:flex-row sm:gap-4 sm:px-6"
          >
            <div className="sm:w-36 sm:shrink-0">
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
        <section
          aria-labelledby="product-feed-heading"
          className="border-accent-foreground border-t"
        >
          <div className="flex items-start gap-3 px-4 py-5 sm:px-6">
            <FileIcon
              aria-hidden
              className="mt-0.5 size-6 shrink-0 text-primary"
            />
            <div className="min-w-0">
              <h2
                id="product-feed-heading"
                className="font-semibold text-foreground-rich text-lg"
              >
                {translate("audit.feed.title", {
                  count: String(report.feed.itemCount),
                  skipped:
                    report.feed.skippedCount > 0
                      ? translate("audit.feed.skipped", {
                          count: String(report.feed.skippedCount),
                        })
                      : "",
                })}
              </h2>
              <p className="mt-1 max-w-3xl text-foreground-dimmed text-sm leading-6">
                {translate("audit.feed.description")}
              </p>
            </div>
          </div>
          <FeedUrlCard url={report.feed.url} />
        </section>
      )}
    </div>
  );
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
  />
);
