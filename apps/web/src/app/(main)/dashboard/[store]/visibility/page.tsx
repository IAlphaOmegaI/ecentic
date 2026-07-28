import { unwrapResult } from "@zenncore/utils";
import { connection } from "next/server";
import { Suspense } from "react";
import * as AgentReadiness from "@/server/app/intelligence/agent-readiness";
import * as CatalogRank from "@/server/app/intelligence/catalog-rank";
import { Environment } from "@/server/utils/environment";
import { Crosshair, SectionGutter, StatusPill } from "../../_components/grid";
import { FeedUrlCard, RankChecker } from "./_components/visibility-client";

const CHECK_TONES = {
  pass: "success",
  warn: "warning",
  fail: "error",
  manual: "neutral",
} as const;

const CHECK_LABELS = {
  pass: "Pass",
  warn: "Warn",
  fail: "Fail",
  manual: "Manual",
} as const;

const AuditSkeleton = () => (
  <div className="flex flex-col divide-y divide-accent-foreground">
    {(["a", "b", "c", "d", "e"] as const).map((key) => (
      <div key={key} className="flex flex-col gap-2 p-4">
        <div className="h-4 w-56 animate-pulse bg-foreground/10" />
        <div className="h-3 w-full animate-pulse bg-foreground/10" />
        <div className="h-3 w-2/3 animate-pulse bg-foreground/10" />
      </div>
    ))}
  </div>
);

const AuditContent = async ({ store }: { store: string }) => {
  await connection();
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
          agent-readiness across automated checks — measured against what AI
          surfaces actually read, not Ecentic's own data
        </p>
      </div>

      <div className="divide-y divide-accent-foreground">
        {report.checks.map((check) => (
          <div key={check.key} className="flex flex-col gap-1.5 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill tone={CHECK_TONES[check.status]}>
                {CHECK_LABELS[check.status]}
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
              Product feed ({report.feed.itemCount} items
              {report.feed.skippedCount > 0 &&
                `, ${report.feed.skippedCount} skipped`}
              )
            </p>
            <p className="mt-0.5 text-foreground-dimmed text-xs">
              One URL for both Google Merchant Center and the Perplexity
              Merchant Program.
            </p>
          </div>
          <FeedUrlCard url={report.feed.url} />
        </div>
      )}
    </div>
  );
};

const RankSection = async ({ store }: { store: string }) => {
  await connection();
  const configured = await CatalogRank.isCatalogConfigured();
  return <RankChecker store={store} configured={configured} />;
};

export default async ({ params }: { params: Promise<{ store: string }> }) => {
  const { store } = await params;

  return (
    <div className="flex flex-col">
      <div className="mx-8 border-accent-foreground border-x">
        <div className="-mx-8 border-accent-foreground border-b">
          <div className="relative mx-8 px-6 py-8">
            <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
            <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
            <p className="font-semibold text-primary text-xs uppercase tracking-[0.14em]">
              Agent Visibility
            </p>
            <h1 className="mt-2 font-bold text-2xl text-foreground-rich">
              Where AI shopping agents actually see this store
            </h1>
            <p className="mt-1 max-w-2xl text-foreground-dimmed text-sm">
              Readiness checks run against the real ingestion surfaces —
              robots.txt, rendered storefront HTML, offer identity, and feeds —
              and live rank measurement in the Shopify Global Catalog that
              ChatGPT, Perplexity, and Copilot query.
            </p>
          </div>
        </div>

        <div className="-mx-8 border-accent-foreground border-b">
          <div className="relative mx-8 bg-background-rich">
            <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
            <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
            <Suspense fallback={<AuditSkeleton />}>
              <AuditContent store={store} />
            </Suspense>
          </div>
        </div>

        <SectionGutter />

        <div className="-mx-8 border-accent-foreground border-t border-b">
          <div className="relative mx-8 bg-background-rich">
            <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
            <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
            <div className="border-accent-foreground border-b p-4">
              <p className="font-semibold text-foreground-dimmed text-xs uppercase tracking-[0.14em]">
                Live shelf position
              </p>
              <p className="mt-1 font-medium text-base text-foreground">
                Rank this store in the Global Catalog for a buyer query
              </p>
            </div>
            <Suspense fallback={<AuditSkeleton />}>
              <RankSection store={store} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
};
