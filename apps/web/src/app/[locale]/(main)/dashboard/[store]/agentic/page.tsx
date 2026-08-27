import { ArrowRightIcon, ShareIcon } from "@zenncore/icons";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import * as AgenticScan from "@/server/app/agentic-scan";
import * as Agentic from "@/server/app/intelligence/agentic";
import {
  CHECK_TONES,
  type Layer,
  orderedChecks,
  orderedLayers,
  PAYMENT_CHECK_REMEDIES,
  type Report,
  scoreTone,
  tally,
} from "@/server/app/intelligence/agentic-contract";
import * as Store from "@/server/app/store";
import { unwrapEntitled } from "@/server/utils/entitlement";
import { Environment } from "@/server/utils/environment";
import { SectionKicker, StatusPill } from "../../_components/grid";
import {
  CompetitorScans,
  ScanRunner,
  ScoreTrend,
} from "./_components/agentic-client";
import {
  AgenticShell,
  ChecksSkeleton,
  CompetitorsSkeleton,
  MethodologySkeleton,
  ScanSkeleton,
  ScoreSkeleton,
} from "./_components/shell";

type StoreParams = PageProps<"/[locale]/dashboard/[store]/agentic">["params"];

const SCORE_FILLS = {
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-error",
} as const;

const ScanSection = async ({ params }: { params: StoreParams }) => {
  await connection();
  const { store } = await params;

  const record = await Store.get(Environment.SERVER, store);
  const overview = unwrapEntitled(
    await AgenticScan.overviewForStore(Environment.SERVER, { store }),
  );
  if (!record.success || !record.data) return null;

  return (
    <ScanRunner
      store={store}
      target={record.data.domain}
      lastScannedAt={overview?.complete?.createdAt.toISOString() ?? null}
    />
  );
};

const LayerBar = ({ layer, label }: { layer: Layer; label: string }) => {
  const percentage = layer.maxScore
    ? Math.round((layer.score / layer.maxScore) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-2 bg-background-rich p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-medium text-foreground text-sm">{layer.name}</p>
        <p className="shrink-0 text-foreground-dimmed text-sm tabular-nums">
          {layer.score} / {layer.maxScore}
        </p>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-background-dimmed">
        <div
          className={`h-full rounded-full ${SCORE_FILLS[scoreTone(percentage)]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-foreground-dimmed text-xs tabular-nums">{label}</p>
    </div>
  );
};

/**
 * The stored report's headline. Falls back to the public report on
 * is-agentic.com when this store has never been scanned here, so the page says
 * something useful before the merchant presses anything.
 */
const ScoreSection = async ({ params }: { params: StoreParams }) => {
  await connection();
  const translate = await getTranslations("dashboard.agentic");
  const { store } = await params;

  const overview = unwrapEntitled(
    await AgenticScan.overviewForStore(Environment.SERVER, { store }),
  );
  const report = overview?.complete?.report ?? null;

  if (!report) {
    const published = unwrapEntitled(
      await Agentic.publicReport(Environment.SERVER, { store }),
    );

    return (
      <div className="flex flex-col gap-3 p-4">
        <p className="text-foreground text-sm">
          {(() => {
            if (!published) return translate("score.empty");
            // Their API models an unscored report as a null score; rendering it
            // as 0 would tell the merchant they failed everything.
            if (published.score === null)
              return translate("score.publicOnlyUnscored", {
                label: published.score_label,
              });
            return translate("score.publicOnly", {
              score: String(published.score),
              label: published.score_label,
            });
          })()}
        </p>
        {published && (
          <a
            href={published.report_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit items-center gap-1.5 font-medium text-primary-text text-sm underline-offset-2 hover:underline"
          >
            {translate("score.publicLink")}
            <ShareIcon aria-hidden className="size-3.5" />
          </a>
        )}
      </div>
    );
  }

  const tone = scoreTone(report.score);
  const fixes = (report.topFixes ?? []).slice(0, 5);

  return (
    <div className="flex flex-col">
      {/* design.md §10.2 — the band leads with the answer. */}
      <div className="flex flex-col gap-3 border-accent-foreground border-b p-4">
        <div className="flex flex-wrap items-center gap-3">
          <SectionKicker>{translate("score.scoreLabel")}</SectionKicker>
          <StatusPill tone={tone}>
            {report.grade ?? translate(`score.status.${tone}`)}
          </StatusPill>
        </div>
        <p className="font-bold text-4xl text-foreground-rich tabular-nums tracking-[-0.02em]">
          {report.score}
          <span className="ml-1 font-medium text-foreground-dimmed text-xl">
            / {report.scoreMax ?? 100}
          </span>
        </p>
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-background-dimmed"
          role="img"
          aria-label={translate("score.scoreLabel")}
        >
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${SCORE_FILLS[tone]}`}
            style={{ width: `${report.score}%` }}
          />
        </div>
        {report.summary && (
          <p className="max-w-3xl text-foreground-dimmed text-sm">
            {report.summary}
          </p>
        )}
        <a
          href={report.reportUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-fit items-center gap-1.5 text-foreground-dimmed text-sm underline-offset-2 hover:underline"
        >
          {translate("score.attribution")}
          <ShareIcon aria-hidden className="size-3.5" />
        </a>
      </div>

      <div className="grid gap-px bg-accent-foreground sm:grid-cols-2">
        {orderedLayers(report).map((layer) => {
          const counts = tally(layer.checks);
          return (
            <LayerBar
              key={layer.id}
              layer={layer}
              label={translate("score.layerCounts", {
                passed: String(counts.passed),
                warning: String(counts.warning),
                failed: String(counts.failed),
                notApplicable: String(counts.notApplicable),
              })}
            />
          );
        })}
        {orderedLayers(report).length % 2 === 1 && (
          <div className="hidden bg-background-rich sm:block" />
        )}
      </div>

      {fixes.length > 0 && (
        <div className="flex flex-col">
          <p className="px-4 pt-4 font-medium text-foreground text-sm">
            {translate("score.fixesTitle")}
          </p>
          <p className="mt-1 max-w-3xl border-accent-foreground border-b px-4 pb-4 text-foreground-dimmed text-sm">
            {translate("score.fixesNote")}
          </p>
          <div className="divide-y divide-accent-foreground">
            {fixes.map((fix) => (
              <div key={fix.id} className="flex flex-col gap-1 p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-medium text-foreground text-sm">
                    {fix.name}
                  </p>
                  <p className="shrink-0 text-primary text-sm tabular-nums">
                    {translate("score.gain", {
                      points: fix.estScoreGain.toFixed(1),
                    })}
                  </p>
                </div>
                <p className="max-w-3xl text-foreground-dimmed text-sm">
                  {fix.recommendation}
                </p>
                {PAYMENT_CHECK_REMEDIES[fix.id] && (
                  <Link
                    href={`/dashboard/${store}${PAYMENT_CHECK_REMEDIES[fix.id]}`}
                    className="mt-1 inline-flex w-fit items-center gap-1.5 font-medium text-primary-text text-sm underline-offset-2 hover:underline"
                  >
                    {translate("checks.remedy")}
                    <ArrowRightIcon aria-hidden className="size-3.5" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <ScoreTrend
        history={(overview?.history ?? []).map((point) => ({
          score: point.score,
          scannedAt: point.scannedAt.toISOString(),
        }))}
      />
    </div>
  );
};

const CheckRow = ({
  check,
  reason,
  remedy,
  labels,
}: {
  check: Report["layers"][number]["checks"][number];
  reason: string | undefined;
  remedy: string | null;
  labels: { status: string; notApplicable: string; remedy: string };
}) => (
  <div className="flex flex-col gap-2 p-4 sm:grid sm:grid-cols-[9rem_1fr] sm:gap-4">
    <div>
      <StatusPill tone={CHECK_TONES[check.status]}>{labels.status}</StatusPill>
    </div>
    <div className="min-w-0">
      <p className="font-medium text-foreground text-sm">{check.name}</p>
      {check.status === "na" ? (
        <p className="mt-1 max-w-3xl text-foreground-dimmed text-sm">
          {reason ?? labels.notApplicable}
        </p>
      ) : (
        <>
          {check.details && (
            <p className="mt-1 max-w-3xl text-foreground-dimmed text-sm">
              {check.details}
            </p>
          )}
          {check.recommendation && check.status !== "pass" && (
            <p className="mt-2 flex max-w-3xl gap-2 text-foreground text-sm">
              <ArrowRightIcon
                aria-hidden
                className="mt-1 size-3.5 shrink-0 text-primary"
              />
              {check.recommendation}
            </p>
          )}
        </>
      )}
      {remedy && check.status !== "pass" && (
        <Link
          href={remedy}
          className="mt-2 inline-flex w-fit items-center gap-1.5 font-medium text-primary-text text-sm underline-offset-2 hover:underline"
        >
          {labels.remedy}
          <ArrowRightIcon aria-hidden className="size-3.5" />
        </Link>
      )}
    </div>
  </div>
);

/**
 * Every check, grouped by layer and collapsed. This is the technical detail
 * behind the score, not the page's primary job — a merchant reads the fixes
 * above and opens a layer only when they want the evidence.
 */
const ChecksSection = async ({ params }: { params: StoreParams }) => {
  await connection();
  const translate = await getTranslations("dashboard.agentic");
  const { store } = await params;

  const overview = unwrapEntitled(
    await AgenticScan.overviewForStore(Environment.SERVER, { store }),
  );
  const report = overview?.complete?.report ?? null;

  if (!report)
    return (
      <p className="p-4 text-foreground-dimmed text-sm">
        {translate("checks.empty")}
      </p>
    );

  return (
    <Accordion multiple className="justify-start">
      {orderedLayers(report).map((layer) => {
        const counts = tally(layer.checks);
        return (
          <AccordionItem
            key={layer.id}
            value={layer.id}
            className="border-accent-foreground border-b last:border-b-0"
          >
            <AccordionTrigger className="items-center gap-3 px-4 py-3">
              <span className="font-medium text-foreground text-sm">
                {layer.name}
              </span>
              <span className="ml-auto shrink-0 text-foreground-dimmed text-sm tabular-nums">
                {translate("checks.summary", {
                  applicable: String(counts.applicable),
                  failed: String(counts.failed + counts.warning),
                })}
              </span>
            </AccordionTrigger>
            <AccordionPanel>
              <div className="divide-y divide-accent-foreground border-accent-foreground border-t">
                {orderedChecks(layer).map((check) => (
                  <CheckRow
                    key={check.id}
                    check={check}
                    reason={report.notApplicableReasons[check.id]}
                    remedy={
                      PAYMENT_CHECK_REMEDIES[check.id]
                        ? `/dashboard/${store}${PAYMENT_CHECK_REMEDIES[check.id]}`
                        : null
                    }
                    labels={{
                      status: translate(`checkStatus.${check.status}`),
                      notApplicable: translate("checks.notApplicable"),
                      remedy: translate("checks.remedy"),
                    }}
                  />
                ))}
              </div>
            </AccordionPanel>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
};

/**
 * The same score for each competitor storefront, so "are agents choosing me?"
 * has a comparison rather than a bare number. Competitor rows are products, so
 * the roster is the distinct domains behind them.
 */
const CompetitorsSection = async ({ params }: { params: StoreParams }) => {
  await connection();
  const translate = await getTranslations("dashboard.agentic");
  const { store } = await params;

  const targets = unwrapEntitled(
    await Agentic.competitorTargets(Environment.SERVER, { store }),
  );
  if (!targets || targets.length === 0)
    return (
      <p className="p-4 text-foreground-dimmed text-sm">
        {translate("competitors.empty")}
      </p>
    );

  const [scans, overview] = await Promise.all([
    AgenticScan.latestForTargets(Environment.SERVER, { store, targets }),
    AgenticScan.overviewForStore(Environment.SERVER, { store }),
  ]);

  const latest = unwrapEntitled(scans) ?? {};
  const own = unwrapEntitled(overview)?.complete ?? null;

  return (
    <CompetitorScans
      store={store}
      ownScore={own?.score ?? null}
      rows={targets.map((target) => ({
        target,
        score: latest[target]?.score ?? null,
        grade: latest[target]?.grade ?? null,
        scannedAt: latest[target]?.createdAt.toISOString() ?? null,
      }))}
    />
  );
};

/**
 * Is Agentic's own description of how the number is produced, pulled from their
 * MCP server. It earns its place because the score's least obvious property —
 * that checks which do not apply are excluded rather than counted as failures —
 * is exactly the thing a merchant would otherwise misread.
 */
const MethodologySection = async () => {
  await connection();
  const blocks = unwrapEntitled(await Agentic.methodology(Environment.SERVER));
  if (!blocks || blocks.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 p-4">
      {blocks.map((block) =>
        block.kind === "heading" ? (
          <p
            key={block.text}
            className="mt-2 font-medium text-foreground text-sm first:mt-0"
          >
            {block.text}
          </p>
        ) : (
          <p
            key={block.text}
            className="max-w-3xl text-foreground-dimmed text-sm"
          >
            {block.text}
          </p>
        ),
      )}
    </div>
  );
};

export default ({
  params,
}: PageProps<"/[locale]/dashboard/[store]/agentic">) => (
  <AgenticShell
    scan={
      <Suspense fallback={<ScanSkeleton />}>
        <ScanSection params={params} />
      </Suspense>
    }
    score={
      <Suspense fallback={<ScoreSkeleton />}>
        <ScoreSection params={params} />
      </Suspense>
    }
    checks={
      <Suspense fallback={<ChecksSkeleton />}>
        <ChecksSection params={params} />
      </Suspense>
    }
    competitors={
      <Suspense fallback={<CompetitorsSkeleton />}>
        <CompetitorsSection params={params} />
      </Suspense>
    }
    methodology={
      <Suspense fallback={<MethodologySkeleton />}>
        <MethodologySection />
      </Suspense>
    }
  />
);
