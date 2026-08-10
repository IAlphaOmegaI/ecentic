import { cn } from "@zenncore/utils";
import { getFormatter, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import type * as Brand from "@/server/app/intelligence/brand";
import { SectionGutter, StatusPill } from "../../../_components/grid";
import { RefreshBrand } from "./refresh-brand";
import { type ShapePoint, VisibilityShapeChart } from "./shape-chart";
import { BrandTabs } from "./shell";

const levelText: Record<Brand.DimensionLevel, string> = {
  weak: "text-error",
  developing: "text-warning",
  strong: "text-success",
};

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

const Section = ({
  border = "border-b",
  children,
}: {
  border?: string;
  children: ReactNode;
}) => (
  <div className={cn("-mx-8 border-accent-foreground", border)}>
    <div className="relative mx-8">{children}</div>
  </div>
);

const SectionTitle = ({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) => (
  <div className="flex items-start justify-between gap-4 border-accent-foreground border-b p-4">
    <div>
      <p className="font-medium text-base text-foreground">{title}</p>
      {description && (
        <p className="mt-1 text-foreground-dimmed text-xs">{description}</p>
      )}
    </div>
    {actions}
  </div>
);

export const BrandEmpty = async ({
  params,
}: {
  params: Promise<{ store: string }>;
}) => {
  const translate = await getTranslations("dashboard.brand");

  return (
    <Section>
      <div className="flex flex-col items-center gap-4 bg-background-rich px-6 py-20 text-center">
        <p className="font-semibold text-foreground-rich text-lg">
          {translate("empty.title")}
        </p>
        <p className="max-w-md text-foreground-dimmed text-sm">
          {translate("empty.description")}
        </p>
        <RefreshBrand params={params} variant="run" />
      </div>
    </Section>
  );
};

const SummarySection = async ({
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
    <Section>
      <div className="grid gap-px bg-accent-foreground lg:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col bg-background-rich">
          <SectionTitle
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
          <div className="flex flex-wrap gap-x-8 gap-y-2 border-accent-foreground border-t px-6 py-4">
            <p className="text-foreground-dimmed text-xs">
              {translate("summary.metrics.mentionRate", {
                rate: String(report.metrics.mentionRate),
              })}
            </p>
            <p className="text-foreground-dimmed text-xs">
              {translate("summary.metrics.unpromptedRate", {
                rate: String(report.metrics.unpromptedRate),
              })}
            </p>
            <p className="text-foreground-dimmed text-xs">
              {translate("summary.metrics.namedRate", {
                rate: String(report.metrics.namedRate),
              })}
            </p>
          </div>
        </div>
        <div className="flex flex-col bg-background-rich">
          <SectionTitle title={translate("shape.title")} />
          <div className="flex flex-1 items-center p-4">
            <VisibilityShapeChart data={shape} />
          </div>
        </div>
      </div>
    </Section>
  );
};

const FindingsSection = async ({ report }: { report: Brand.Report }) => {
  const translate = await getTranslations("dashboard.brand");

  return (
    <Section border="border-t border-b">
      <div className="bg-background-rich">
        <SectionTitle
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
      </div>
    </Section>
  );
};

const CrawlabilitySection = async ({ report }: { report: Brand.Report }) => {
  const translate = await getTranslations("dashboard.brand");
  const { crawlability } = report;

  const rows = [
    { key: "robots", check: crawlability.robots },
    { key: "llms", check: crawlability.llms },
    { key: "engines", check: crawlability.engines },
  ] as const;

  return (
    <Section border="border-t border-b">
      <div className="bg-background-rich">
        <SectionTitle
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
      </div>
    </Section>
  );
};

const PerceptionSection = async ({ report }: { report: Brand.Report }) => {
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
    <Section border="border-t border-b">
      <div className="bg-background-rich">
        <SectionTitle title={translate("perception.title")} />
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
      </div>
    </Section>
  );
};

const FunnelSection = async ({ report }: { report: Brand.Report }) => {
  const translate = await getTranslations("dashboard.brand");
  const stages = ["find", "consider", "evaluate", "support"] as const;

  return (
    <Section border="border-t border-b">
      <div className="bg-background-rich">
        <SectionTitle title={translate("funnel.title")} />
        <div className="grid gap-px bg-accent-foreground sm:grid-cols-2 xl:grid-cols-4">
          {stages.map((stage) => {
            const entry = report.funnel[stage];
            return (
              <div key={stage} className="flex flex-col bg-background-rich p-5">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground text-sm">
                    {translate(`shape.dimensions.${stage}`)}
                  </p>
                  <p
                    className={cn(
                      "font-semibold text-[11px] uppercase tracking-[0.05em]",
                      levelText[entry.level],
                    )}
                  >
                    {translate(`shape.levels.${entry.level}`)}
                  </p>
                </div>
                <p className="mt-3 flex-1 text-foreground-dimmed text-sm">
                  {entry.narrative}
                </p>
                {entry.improvements.length > 0 && (
                  <ul className="mt-4 flex flex-col gap-2 border-accent-foreground border-t pt-4">
                    {entry.improvements.map((improvement) => (
                      <li key={improvement} className="flex gap-2">
                        <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" />
                        <p className="text-foreground-dimmed text-xs">
                          {improvement}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Section>
  );
};

const LandscapeSection = async ({ report }: { report: Brand.Report }) => {
  const translate = await getTranslations("dashboard.brand");

  if (report.topCompetitors.length === 0 && report.topSources.length === 0)
    return null;

  return (
    <>
      <SectionGutter />
      <Section border="border-t border-b">
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
      </Section>
    </>
  );
};

const QueryLog = async ({ report }: { report: Brand.Report }) => {
  const translate = await getTranslations("dashboard.brand");

  return (
    <Section>
      <div className="bg-background-rich">
        <SectionTitle
          title={translate("tabs.queries")}
          description={translate("queries.description")}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-accent-foreground border-b text-[11px] text-foreground-dimmed uppercase tracking-[0.08em]">
                <th className="px-6 py-3 font-medium">
                  {translate("queries.headers.query")}
                </th>
                <th className="px-4 py-3 font-medium">
                  {translate("queries.headers.dimension")}
                </th>
                <th className="px-4 py-3 font-medium">
                  {translate("queries.headers.result")}
                </th>
                <th className="px-4 py-3 font-medium">
                  {translate("queries.headers.brands")}
                </th>
                <th className="px-6 py-3 font-medium">
                  {translate("queries.headers.sources")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-accent-foreground">
              {report.queries.map((entry) => (
                <tr key={entry.query} className="align-top">
                  <td className="max-w-xs px-6 py-3 text-foreground">
                    "{entry.query}"
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
      </div>
    </Section>
  );
};

export const BrandReport = ({
  report,
  analyzedAt,
}: {
  report: Brand.Report;
  analyzedAt: Date;
}) => (
  <BrandTabs
    overview={
      <>
        <SummarySection report={report} analyzedAt={analyzedAt} />
        <SectionGutter />
        <FindingsSection report={report} />
        <SectionGutter />
        <CrawlabilitySection report={report} />
        <SectionGutter />
        <PerceptionSection report={report} />
        <SectionGutter />
        <FunnelSection report={report} />
        <LandscapeSection report={report} />
      </>
    }
    queries={<QueryLog report={report} />}
  />
);
