import {
  ArrowRightIcon,
  BullseyeIcon,
  CheckBadgeIcon,
  ChevronRightIcon,
  RadarIcon,
  SearchIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { getFormatter, getTranslations } from "next-intl/server";
import type * as Brand from "@/server/app/intelligence/brand";
import {
  Band,
  SectionGutter,
  SectionHeader,
  StatCell,
  StatusPill,
} from "../../../_components/grid";
import { RefreshBrand } from "./refresh-brand";
import { type ShapePoint, VisibilityShapeChart } from "./shape-chart";
import { BrandTabs } from "./shell";

const checkDot: Record<Brand.CheckStatus, string> = {
  pass: "bg-success",
  warn: "bg-warning",
  fail: "bg-error",
};

const positionTone: Record<
  Brand.QueryPosition,
  "success" | "warning" | "error"
> = {
  top: "success",
  listed: "warning",
  absent: "error",
};

/** design.md §4.4 — the shared thresholds, not a per-page scale. */
const rateTone = (rate: number) => {
  switch (true) {
    case rate >= 60:
      return "success" as const;
    case rate >= 30:
      return "warning" as const;
    default:
      return "error" as const;
  }
};

/** A panel inside a tab. Panels stack, so each draws its own top seam. */
const Panel = ({
  first = false,
  children,
}: {
  first?: boolean;
  children: React.ReactNode;
}) => (
  <div
    className={cn(
      "bg-background-rich",
      !first && "border-accent-foreground border-t",
    )}
  >
    {children}
  </div>
);

export const FailedNote = async ({ error }: { error: string | null }) => {
  const translate = await getTranslations("dashboard.brand.failed");

  return (
    <Band surface={false} className="bg-warning/5 px-6 py-4">
      <div>
        <p className="font-medium text-sm text-warning">{translate("title")}</p>
        <p className="mt-1 text-foreground-dimmed text-xs">
          {error ?? translate("description")}
        </p>
      </div>
    </Band>
  );
};

export const BrandEmpty = async ({
  params,
}: {
  params: Promise<{ store: string }>;
}) => {
  const translate = await getTranslations("dashboard.brand");

  return (
    <Band>
      <div className="flex flex-col items-center gap-4 px-6 py-20 text-center">
        <p className="font-semibold text-foreground-rich text-lg">
          {translate("empty.title")}
        </p>
        <p className="max-w-md text-foreground-dimmed text-sm">
          {translate("empty.description")}
        </p>
        <RefreshBrand params={params} variant="run" />
      </div>
    </Band>
  );
};

/**
 * The page's answer, before any prose.
 *
 * These three rates used to render as dimmed `text-xs` sentences at the bottom
 * of the summary card — the only numbers on a page whose whole question is "how
 * visible is this brand". They lead now, in the same connected stat grid the
 * overview and products pages open with.
 */
const MetricsBand = async ({ report }: { report: Brand.Report }) => {
  const translate = await getTranslations("dashboard.brand.metrics");
  const { mentionRate, unpromptedRate, namedRate } = report.metrics;

  const rates = [
    { key: "mentionRate", rate: mentionRate, icon: <RadarIcon /> },
    { key: "unpromptedRate", rate: unpromptedRate, icon: <BullseyeIcon /> },
    { key: "namedRate", rate: namedRate, icon: <CheckBadgeIcon /> },
  ] as const;

  return (
    <Band>
      <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-2 xl:grid-cols-4">
        {rates.map(({ key, rate, icon }) => (
          <StatCell
            key={key}
            label={translate(`${key}.label`)}
            icon={icon}
            value={rate}
            suffix="%"
            progress={rate}
            tone={rateTone(rate)}
            detail={translate(`${key}.detail`)}
          />
        ))}
        <StatCell
          label={translate("queries.label")}
          icon={<SearchIcon />}
          value={report.queries.length}
          detail={translate("queries.detail")}
        />
      </div>
    </Band>
  );
};

const SummaryBand = async ({
  report,
  analyzedAt,
}: {
  report: Brand.Report;
  analyzedAt: Date;
}) => {
  const translate = await getTranslations("dashboard.brand");
  const format = await getFormatter();

  const shape: ShapePoint[] = report.dimensions.map((entry) => ({
    dimension: entry.dimension,
    label: translate(`shape.dimensions.${entry.dimension}`),
    level: entry.level,
    levelLabel: translate(`shape.levels.${entry.level}`),
    score: entry.score,
  }));

  return (
    <Band marks="top" surface={false}>
      <div className="grid gap-px bg-accent-foreground lg:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col bg-background-rich">
          <SectionHeader
            kicker={translate("sections.diagnosis")}
            title={translate("summary.title")}
            actions={
              <p className="whitespace-nowrap text-foreground-dimmed text-xs">
                {translate("summary.analyzed", {
                  time: format.relativeTime(analyzedAt),
                })}
              </p>
            }
          />
          <p className="flex-1 p-6 text-foreground text-sm leading-relaxed">
            {report.summary}
          </p>
        </div>
        <div className="flex flex-col bg-background-rich">
          <SectionHeader title={translate("shape.title")} />
          <div className="flex flex-1 items-center p-4">
            <VisibilityShapeChart data={shape} />
          </div>
        </div>
      </div>
    </Band>
  );
};

const FindingsPanel = async ({ report }: { report: Brand.Report }) => {
  const translate = await getTranslations("dashboard.brand");

  return (
    <Panel first>
      <SectionHeader
        title={translate("findings.title")}
        description={translate("findings.description")}
      />
      <ul className="divide-y divide-accent-foreground">
        {report.keyFindings.map((finding) => (
          <li key={finding} className="flex gap-3 px-6 py-4">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-foreground" />
            <p className="text-foreground text-sm">{finding}</p>
          </li>
        ))}
      </ul>
    </Panel>
  );
};

const FUNNEL_STAGES = ["find", "consider", "evaluate", "support"] as const;

const levelFill: Record<Brand.DimensionLevel, string> = {
  weak: "bg-error",
  developing: "bg-warning",
  strong: "bg-success",
};

const levelTone: Record<Brand.DimensionLevel, "error" | "warning" | "success"> =
  {
    weak: "error",
    developing: "warning",
    strong: "success",
  };

/**
 * The four stages of a shopper's journey, in order.
 *
 * Full-width rows, not a measure/evidence split. That split earns its keep on
 * the crawlability and visibility checks because the right-hand side is a line
 * or two; here a stage carries a paragraph plus up to four actions, so a fixed
 * label column just parks 13rem of white space beside 350px of text.
 *
 * The actions are what made this section enormous — four stages times four
 * actions is sixteen paragraphs of advice nobody reads in one pass. The
 * diagnosis (score, level, narrative) stays open; the actions collapse behind a
 * count, which is design.md §10.2's answer-then-detail order rather than a way
 * of hiding them.
 */
const FunnelPanel = async ({ report }: { report: Brand.Report }) => {
  const translate = await getTranslations("dashboard.brand");

  const scores = new Map(
    report.dimensions.map((entry) => [entry.dimension, entry.score]),
  );

  return (
    <Panel>
      <SectionHeader
        title={translate("funnel.title")}
        description={translate("funnel.description")}
      />
      <div className="divide-y divide-accent-foreground">
        {FUNNEL_STAGES.map((stage, index) => {
          const entry = report.funnel[stage];
          const score = scores.get(stage);

          return (
            <div key={stage} className="flex flex-col gap-3 p-5">
              {/* Label, track and value on one line: the track spans the gap so
                the stage name and its score read as one measure rather than
                two things pinned to opposite edges. */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="font-mono font-semibold text-primary text-xs">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="w-20 shrink-0 font-medium text-foreground text-sm">
                  {translate(`shape.dimensions.${stage}`)}
                </p>
                {score !== undefined && (
                  <div className="h-1 min-w-32 flex-1 rounded-full bg-accent-foreground">
                    <div
                      className={cn(
                        "h-full rounded-full transition-[width] duration-600",
                        levelFill[entry.level],
                      )}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                )}
                {score !== undefined && (
                  <span className="w-8 shrink-0 text-right font-bold text-foreground-rich text-lg tabular-nums tracking-[-0.02em]">
                    {score}
                  </span>
                )}
                <span className="flex w-28 shrink-0 justify-end">
                  <StatusPill tone={levelTone[entry.level]}>
                    {translate(`shape.levels.${entry.level}`)}
                  </StatusPill>
                </span>
              </div>

              <p className="max-w-3xl text-foreground text-sm leading-relaxed">
                {entry.narrative}
              </p>

              {entry.improvements.length > 0 && (
                <details className="group">
                  <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 font-medium text-primary-text text-sm underline-offset-2 hover:underline">
                    <ChevronRightIcon
                      aria-hidden
                      className="size-3.5 transition-transform group-open:rotate-90"
                    />
                    {translate("funnel.actions", {
                      count: entry.improvements.length,
                    })}
                  </summary>
                  <ul className="mt-3 flex flex-col gap-2 pl-5">
                    {entry.improvements.map((improvement) => (
                      <li key={improvement} className="flex gap-2.5">
                        <ArrowRightIcon
                          aria-hidden
                          className="mt-1 size-3.5 shrink-0 text-primary"
                        />
                        <p className="max-w-3xl text-foreground-dimmed text-sm">
                          {improvement}
                        </p>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
};

const CrawlabilityPanel = async ({ report }: { report: Brand.Report }) => {
  const translate = await getTranslations("dashboard.brand");
  const { crawlability } = report;

  const rows = [
    { key: "robots", check: crawlability.robots },
    { key: "llms", check: crawlability.llms },
    { key: "engines", check: crawlability.engines },
  ] as const;

  return (
    <Panel first>
      <SectionHeader
        title={translate("crawlability.title")}
        actions={
          <StatusPill tone={crawlability.ready ? "success" : "warning"}>
            {crawlability.ready
              ? translate("crawlability.ready")
              : translate("crawlability.issues")}
          </StatusPill>
        }
      />
      <div className="divide-y divide-accent-foreground">
        {rows.map(({ key, check }) => (
          <div
            key={key}
            className="flex flex-col gap-1 px-6 py-4 sm:grid sm:grid-cols-[10rem_1fr] sm:gap-4"
          >
            <div className="flex items-center gap-2">
              <span
                className={cn("size-2 rounded-full", checkDot[check.status])}
              />
              <p className="font-medium text-[11px] text-foreground-dimmed uppercase tracking-[0.08em]">
                {translate(`crawlability.checks.${key}`)}
              </p>
            </div>
            <div>
              <p className="text-foreground text-sm">{check.headline}</p>
              {check.detail && (
                <p className="mt-1 text-foreground-dimmed text-xs">
                  {check.detail}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
};

const PerceptionPanel = async ({ report }: { report: Brand.Report }) => {
  const translate = await getTranslations("dashboard.brand");

  const columns = [
    {
      key: "strengths",
      entries: report.perception.strengths,
      marker: "+",
      markerClass: "bg-success/10 text-success",
    },
    {
      key: "concerns",
      entries: report.perception.concerns,
      marker: "−",
      markerClass: "bg-warning/10 text-warning",
    },
  ] as const;

  return (
    <Panel first>
      <SectionHeader title={translate("perception.title")} />
      <div className="grid gap-px bg-accent-foreground md:grid-cols-2">
        {columns.map((column) => (
          <div key={column.key} className="bg-background-rich p-6">
            <p className="font-medium text-[11px] text-foreground-dimmed uppercase tracking-[0.08em]">
              {translate(`perception.${column.key}`)}
            </p>
            <ul className="mt-4 flex flex-col gap-3">
              {column.entries.map((entry) => (
                <li key={entry} className="flex gap-2.5">
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded-sm font-semibold text-[11px]",
                      column.markerClass,
                    )}
                  >
                    {column.marker}
                  </span>
                  <p className="text-foreground text-sm">{entry}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Panel>
  );
};

const LandscapePanel = async ({ report }: { report: Brand.Report }) => {
  const translate = await getTranslations("dashboard.brand");

  if (report.topCompetitors.length === 0 && report.topSources.length === 0)
    return null;

  return (
    <Panel>
      <SectionHeader title={translate("landscape.title")} />
      <div className="grid gap-px bg-accent-foreground md:grid-cols-2">
        <div className="bg-background-rich p-6">
          <p className="font-medium text-[11px] text-foreground-dimmed uppercase tracking-[0.08em]">
            {translate("landscape.competitors")}
          </p>
          <ul className="mt-4 flex flex-col gap-2">
            {report.topCompetitors.map((competitor) => (
              <li
                key={competitor.name}
                className="flex items-baseline justify-between gap-4"
              >
                <p className="text-foreground text-sm">{competitor.name}</p>
                <p className="whitespace-nowrap text-foreground-dimmed text-xs tabular-nums">
                  {translate("landscape.competitorMentions", {
                    count: String(competitor.mentions),
                  })}
                </p>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-background-rich p-6">
          <p className="font-medium text-[11px] text-foreground-dimmed uppercase tracking-[0.08em]">
            {translate("landscape.sources")}
          </p>
          <ul className="mt-4 flex flex-col gap-2">
            {report.topSources.map((source) => (
              <li
                key={source.domain}
                className="flex items-baseline justify-between gap-4"
              >
                <p className="text-foreground text-sm">{source.domain}</p>
                <p className="whitespace-nowrap text-foreground-dimmed text-xs tabular-nums">
                  {translate("landscape.sourceCitations", {
                    count: String(source.citations),
                  })}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Panel>
  );
};

const QueryLogPanel = async ({ report }: { report: Brand.Report }) => {
  const translate = await getTranslations("dashboard.brand");

  return (
    <Panel first>
      <SectionHeader
        title={translate("tabs.queries")}
        description={translate("queries.description")}
      />
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-accent-foreground border-b text-[11px] text-foreground-dimmed uppercase tracking-[0.06em]">
              <th className="px-6 py-3 font-semibold">
                {translate("queries.headers.query")}
              </th>
              <th className="px-4 py-3 font-semibold">
                {translate("queries.headers.dimension")}
              </th>
              <th className="px-4 py-3 font-semibold">
                {translate("queries.headers.result")}
              </th>
              <th className="px-4 py-3 font-semibold">
                {translate("queries.headers.brands")}
              </th>
              <th className="px-6 py-3 font-semibold">
                {translate("queries.headers.sources")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-accent-foreground">
            {report.queries.map((entry) => (
              <tr
                key={entry.query}
                className="align-top transition-colors duration-100 hover:bg-background-dimmed/60"
              >
                <td className="max-w-xs px-6 py-3 font-light text-foreground">
                  “{entry.query}”
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-foreground-dimmed text-xs">
                  {translate(`shape.dimensions.${entry.dimension}`)}
                  {entry.branded && (
                    <span className="ml-1.5 rounded bg-background-dimmed px-1 py-0.5 text-[10px]">
                      {translate("queries.branded")}
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <StatusPill tone={positionTone[entry.position]}>
                    {translate(`queries.position.${entry.position}`)}
                  </StatusPill>
                </td>
                <td className="max-w-48 px-4 py-3 text-foreground-dimmed text-xs">
                  {entry.brands.slice(0, 4).join(", ") || "—"}
                </td>
                <td className="max-w-48 px-6 py-3 text-foreground-dimmed text-xs">
                  {entry.sources.slice(0, 4).join(", ") || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
};

export const BrandReport = ({
  report,
  analyzedAt,
}: {
  report: Brand.Report;
  analyzedAt: Date;
}) => (
  <>
    <MetricsBand report={report} />
    <SectionGutter />
    <SummaryBand report={report} analyzedAt={analyzedAt} />
    <SectionGutter />
    <BrandTabs
      findings={
        <>
          <FindingsPanel report={report} />
          <FunnelPanel report={report} />
        </>
      }
      perception={
        <>
          <PerceptionPanel report={report} />
          <LandscapePanel report={report} />
        </>
      }
      crawlability={<CrawlabilityPanel report={report} />}
      queries={<QueryLogPanel report={report} />}
    />
  </>
);
