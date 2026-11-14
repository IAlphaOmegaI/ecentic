import {
  AlertCircleIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  FaceSearchIcon,
  FileIcon,
  GlobeIcon,
  MegaphoneIcon,
  SearchIcon,
  ShieldCheckIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import { Button } from "@zenncore/web/components/button";
import { getFormatter, getTranslations } from "next-intl/server";
import { AnalysisText } from "@/components/analysis-text";
import { CommerceFigure } from "@/components/marketing/commerce-figure";
import { Link } from "@/i18n/navigation";
import type * as Brand from "@/server/app/intelligence/brand";
import { EntityMark } from "./entity-mark";
import { MentionMeter } from "./mention-meter";
import { QueryExplorer } from "./query-explorer";
import { RefreshBrand } from "./refresh-brand";
import { BrandMethod, BrandSummary, BrandTabs } from "./shell";

export const FailedNote = async ({ hasReport }: { hasReport: boolean }) => {
  const translate = await getTranslations("dashboard.brand.design.failed");
  return (
    <div
      role="alert"
      className="flex gap-3 border-accent-foreground border-b bg-warning/5 px-6 py-4"
    >
      <AlertCircleIcon
        aria-hidden
        className="mt-0.5 size-5 shrink-0 text-warning"
      />
      <div>
        <p className="font-semibold text-foreground-rich text-sm">
          {translate("title")}
        </p>
        <p className="mt-1 text-foreground-dimmed text-sm">
          {translate(hasReport ? "description" : "emptyDescription")}
        </p>
      </div>
    </div>
  );
};

export const BrandEmpty = async ({ store }: { store: string }) => {
  const translate = await getTranslations("dashboard.brand.design");
  const steps = [
    { key: "questions", icon: SearchIcon },
    { key: "answers", icon: FaceSearchIcon },
    { key: "actions", icon: CheckCircleIcon },
  ] as const;
  return (
    <div className="grid min-w-0 lg:grid-cols-2">
      <div className="flex min-w-0 flex-col items-start justify-center px-6 py-10 sm:px-8 sm:py-12">
        <h2 className="max-w-md font-heading font-semibold text-3xl text-foreground-rich tracking-tight">
          {translate("empty.title")}
        </h2>
        <p className="mt-4 max-w-lg text-base text-foreground-dimmed leading-7">
          {translate("empty.description")}
        </p>
        <div className="mt-7">
          <RefreshBrand store={store} variant="run" />
        </div>
        <p className="mt-5 max-w-md text-foreground-dimmed text-sm leading-6">
          {translate("empty.note")}
        </p>
      </div>
      <div className="relative min-w-0 border-accent-foreground border-t bg-primary/5 text-foreground-rich lg:border-t-0 lg:border-l">
        <div className="flex items-center gap-4 px-6 py-6">
          <div className="size-28 shrink-0 text-primary">
            <CommerceFigure kind="shoppingBot" className="size-full" />
          </div>
          <h2 className="max-w-56 font-semibold text-lg leading-7">
            {translate("empty.visualTitle")}
          </h2>
        </div>
        <ol className="border-accent-foreground border-t">
          {steps.map(({ key, icon: Icon }) => (
            <li
              key={key}
              className="flex gap-4 border-accent-foreground border-b px-6 py-5 last:border-b-0"
            >
              <Icon
                aria-hidden
                className="mt-0.5 size-6 shrink-0 text-primary"
              />
              <div>
                <h3 className="font-semibold text-lg">
                  {translate(`empty.steps.${key}.title`)}
                </h3>
                <p className="mt-1 text-foreground-dimmed text-sm leading-6">
                  {translate(`empty.steps.${key}.description`)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};

const reportTerms = (report: Brand.Report) => [
  ...report.engines,
  ...report.topCompetitors.map((entry) => entry.name),
  ...report.topSources.map((entry) => entry.domain),
];

const Summary = async ({ report }: { report: Brand.Report }) => {
  const translate = await getTranslations("dashboard.brand.design");
  const format = await getFormatter();
  const samples = [
    {
      key: "unprompted",
      queries: report.queries.filter((query) => !query.branded),
    },
    { key: "named", queries: report.queries.filter((query) => query.branded) },
  ] as const;
  const mentioned = report.queries.filter((query) => query.mentioned).length;
  return (
    <div className="grid min-w-0 lg:grid-cols-2">
      <section className="min-w-0 px-6 py-7">
        <h2 className="font-heading font-semibold text-2xl text-foreground-rich">
          {translate("summaryTitle")}
        </h2>
        <BrandSummary summary={report.summary} terms={reportTerms(report)} />
        <p className="mt-5 text-foreground-dimmed text-sm leading-6">
          {report.queries.length > 0
            ? translate("overall", {
                count: format.number(mentioned),
                total: format.number(report.queries.length),
              })
            : translate("noAnswers")}
        </p>
      </section>
      <section className="min-w-0 border-accent-foreground border-t bg-background-rich lg:border-t-0 lg:border-l">
        <h2 className="px-6 pt-7 font-heading font-semibold text-2xl text-foreground-rich">
          {translate("discoveryTitle")}
        </h2>
        <dl className="divide-y divide-accent-foreground">
          {samples.map(({ key, queries }) => {
            const count = queries.filter((query) => query.mentioned).length;
            const fraction = queries.length > 0 ? count / queries.length : null;
            return (
              <div key={key} className="px-6 py-6">
                <div className="flex items-start justify-between gap-4">
                  <dt className="max-w-56 font-medium text-foreground text-sm leading-6">
                    {translate(key)}
                  </dt>
                  <dd className="shrink-0 font-semibold text-4xl text-foreground-rich tabular-nums tracking-tight">
                    {fraction === null
                      ? "—"
                      : format.number(fraction, {
                          style: "percent",
                          maximumFractionDigits: 0,
                        })}
                  </dd>
                </div>
                <MentionMeter count={count} total={queries.length} />
                <dd className="mt-3 text-foreground-dimmed text-xs leading-5">
                  {fraction === null
                    ? translate("noSample")
                    : translate("ratio", {
                        count: format.number(count),
                        total: format.number(queries.length),
                      })}
                </dd>
              </div>
            );
          })}
        </dl>
      </section>
    </div>
  );
};

const stages = [
  { key: "find", icon: SearchIcon },
  { key: "consider", icon: MegaphoneIcon },
  { key: "evaluate", icon: CheckCircleIcon },
  { key: "support", icon: FaceSearchIcon },
] as const;

const Plan = async ({
  report,
  store,
}: {
  report: Brand.Report;
  store: string;
}) => {
  const translate = await getTranslations("dashboard.brand.design");
  return (
    <div className="grid min-w-0 md:grid-cols-2">
      <section className="min-w-0">
        <div className="border-accent-foreground border-b bg-primary/5 px-6 py-5 text-foreground-rich">
          <h2 className="font-heading font-semibold text-2xl">
            {translate("findingsTitle")}
          </h2>
        </div>
        <ul className="divide-y divide-accent-foreground">
          {[...new Set(report.keyFindings)].map((finding) => (
            <li key={finding} className="px-6 py-5">
              <p className="wrap-anywhere text-foreground text-sm leading-7">
                <AnalysisText text={finding} terms={reportTerms(report)} />
              </p>
            </li>
          ))}
        </ul>
        {report.keyFindings.length === 0 && (
          <p className="px-6 py-5 text-foreground-dimmed text-sm leading-6">
            {translate("noFindings")}
          </p>
        )}
        <div className="border-accent-foreground border-t px-6 py-5">
          <Button
            variant="soft"
            color="neutral"
            render={<Link href={`/dashboard/${store}/products`} />}
            className="text-sm"
          >
            {translate("action.tertiary")}
            <ArrowRightIcon aria-hidden className="size-4" />
          </Button>
        </div>
      </section>
      <section className="min-w-0 border-accent-foreground border-t md:border-t-0 md:border-l">
        <div className="border-accent-foreground border-b px-6 py-5">
          <h2 className="font-heading font-semibold text-2xl text-foreground-rich">
            {translate("journeyTitle")}
          </h2>
          <p className="mt-1 text-foreground-dimmed text-sm leading-6">
            {translate("journeyDescription")}
          </p>
        </div>
        <Accordion defaultValue={["find"]} multiple>
          {stages.map(({ key, icon: Icon }) => {
            const entry = report.funnel[key];
            const improvements = [...new Set(entry.improvements)];
            return (
              <AccordionItem
                key={key}
                value={key}
                className="border-accent-foreground last:border-b-0"
              >
                <AccordionTrigger className="items-center px-6 py-5 hover:bg-background">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-sm border border-accent-foreground bg-background-rich text-primary">
                      <Icon aria-hidden className="size-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold text-base text-foreground-rich">
                        {translate(`stage.${key}`)}
                      </span>
                      <span className="mt-0.5 block font-normal text-foreground-dimmed text-xs">
                        {translate("suggestions", {
                          count: improvements.length,
                        })}
                      </span>
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionPanel className="motion-reduce:transition-none">
                  <div className="px-6 pb-6">
                    <p className="wrap-anywhere text-foreground-dimmed text-sm leading-6">
                      <AnalysisText
                        text={entry.narrative}
                        terms={reportTerms(report)}
                      />
                    </p>
                    <ul className="mt-4 space-y-3">
                      {improvements.map((improvement) => (
                        <li key={improvement} className="flex gap-3">
                          <span
                            aria-hidden
                            className="mt-2 size-1.5 shrink-0 bg-primary"
                          />
                          <p className="wrap-anywhere text-foreground text-sm leading-6">
                            <AnalysisText
                              text={improvement}
                              terms={reportTerms(report)}
                            />
                          </p>
                        </li>
                      ))}
                    </ul>
                    {improvements.length === 0 && (
                      <p className="mt-3 text-foreground-dimmed text-sm">
                        {translate("noSuggestions")}
                      </p>
                    )}
                  </div>
                </AccordionPanel>
              </AccordionItem>
            );
          })}
        </Accordion>
      </section>
    </div>
  );
};

const Perception = async ({ report }: { report: Brand.Report }) => {
  const translate = await getTranslations("dashboard.brand.design");
  const perceptionGroups = (["strengths", "concerns"] as const).filter(
    (key) => report.perception[key].length > 0,
  );
  if (
    perceptionGroups.length === 0 &&
    report.topCompetitors.length === 0 &&
    report.topSources.length === 0
  )
    return null;
  return (
    <section className="border-accent-foreground border-t">
      <div className="px-6 py-5">
        <h2 className="font-heading font-semibold text-2xl text-foreground-rich">
          {translate("perceptionTitle")}
        </h2>
      </div>
      {perceptionGroups.length > 0 && (
        <div className="grid border-accent-foreground border-t md:grid-cols-2">
          {perceptionGroups.map((key) => (
            <div
              key={key}
              className="min-w-0 border-accent-foreground not-last:border-b px-6 py-5 md:not-last:border-r md:not-last:border-b-0 md:only:col-span-2"
            >
              <h3 className="flex items-center gap-3 font-heading font-semibold text-foreground-rich text-xl">
                {key === "strengths" ? (
                  <CheckCircleIcon
                    aria-hidden
                    className="size-5 text-success"
                  />
                ) : (
                  <AlertCircleIcon
                    aria-hidden
                    className="size-5 text-warning"
                  />
                )}
                {translate(key)}
              </h3>
              <ul className="mt-4 space-y-3">
                {[...new Set(report.perception[key])].map((entry) => (
                  <li
                    key={entry}
                    className="wrap-anywhere text-foreground-dimmed text-sm leading-6"
                  >
                    <AnalysisText text={entry} terms={reportTerms(report)} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      {(report.topCompetitors.length > 0 || report.topSources.length > 0) && (
        <div className="grid border-accent-foreground border-t md:grid-cols-2">
          {report.topCompetitors.length > 0 && (
            <div className="min-w-0 border-accent-foreground not-last:border-b px-6 py-5 md:not-last:border-r md:not-last:border-b-0 md:only:col-span-2">
              <h3 className="font-heading font-semibold text-foreground-rich text-xl">
                {translate("alternativesTitle")}
              </h3>
              <ul className="mt-3 divide-y divide-accent-foreground">
                {report.topCompetitors.map((entry) => (
                  <li
                    key={entry.name}
                    className="flex items-center gap-3 py-3 text-sm"
                  >
                    <EntityMark name={entry.name} />
                    <span className="min-w-0 flex-1 break-words font-medium text-foreground">
                      {entry.name}
                    </span>
                    <span className="shrink-0 text-foreground-dimmed text-xs tabular-nums">
                      {translate("occurrences", { count: entry.mentions })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {report.topSources.length > 0 && (
            <div className="min-w-0 px-6 py-5 md:only:col-span-2">
              <h3 className="font-heading font-semibold text-foreground-rich text-xl">
                {translate("sourcesTitle")}
              </h3>
              <p className="mt-2 text-foreground-dimmed text-xs leading-5">
                {translate("sourcesNote")}
              </p>
              <ul className="mt-2 divide-y divide-accent-foreground">
                {report.topSources.map((entry) => (
                  <li
                    key={entry.domain}
                    className="flex items-center gap-3 py-3 text-sm"
                  >
                    <EntityMark name={entry.domain} kind="source" />
                    <span className="min-w-0 flex-1 break-all font-medium text-foreground">
                      {entry.domain}
                    </span>
                    <span className="shrink-0 text-foreground-dimmed text-xs tabular-nums">
                      {translate("occurrences", { count: entry.citations })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

const SiteChecks = async ({ report }: { report: Brand.Report }) => {
  const translate = await getTranslations("dashboard.brand.design");
  const checks = [
    {
      key: "robots",
      icon: FileIcon,
      status: report.crawlability.robots.status,
    },
    { key: "llms", icon: GlobeIcon, status: report.crawlability.llms.status },
    {
      key: "engines",
      icon: ShieldCheckIcon,
      status: report.crawlability.engines.status,
    },
  ] as const;
  return (
    <section>
      <div className="border-accent-foreground border-b px-6 py-6">
        <h2 className="font-heading font-semibold text-2xl text-foreground-rich">
          {translate("accessTitle")}
        </h2>
        <p className="mt-2 max-w-3xl text-foreground-dimmed text-sm leading-6">
          {translate("accessDescription")}
        </p>
      </div>
      <ul className="divide-y divide-accent-foreground">
        {checks.map(({ key, icon: Icon, status }) => (
          <li key={key} className="grid gap-4 px-6 py-6 sm:grid-cols-3">
            <div className="flex items-start gap-3">
              <Icon aria-hidden className="size-6 shrink-0 text-primary" />
              <div>
                <h3 className="font-medium text-foreground-rich text-sm">
                  {translate(`checks.${key}`)}
                </h3>
                <p
                  className={cn(
                    "mt-1 text-xs",
                    status === "pass" ? "text-success" : "text-warning",
                  )}
                >
                  {translate(`status.${status}`)}
                </p>
              </div>
            </div>
            <div className="min-w-0 sm:col-span-2">
              <p className="font-medium text-foreground text-sm">
                {translate(
                  key === "llms"
                    ? `llms.${status === "pass" ? "pass" : "warn"}`
                    : `${key}.${status}`,
                )}
              </p>
              <p className="mt-2 max-w-3xl text-foreground-dimmed text-sm leading-6">
                {translate(`${key}.note`)}
              </p>
              {key === "engines" &&
                report.crawlability.engines.blocked.length > 0 && (
                  <p className="wrap-anywhere mt-3 font-mono text-foreground text-xs leading-6">
                    {report.crawlability.engines.blocked.join(", ")}
                  </p>
                )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};

export const BrandReport = async ({
  report,
  analyzedAt,
  store,
  running = false,
}: {
  report: Brand.Report;
  analyzedAt: Date;
  store: string;
  running?: boolean;
}) => {
  const translate = await getTranslations("dashboard.brand.design");
  const format = await getFormatter();
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-accent-foreground border-b px-6 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex shrink-0 items-center">
            {[...new Set(report.engines)].map((engine) => (
              <EntityMark key={engine} name={engine} kind="engine" />
            ))}
          </div>
          <div>
            <p className="font-medium text-foreground text-sm">
              {translate("sample", {
                count: report.queries.length,
                engines: report.engines.join(", "),
              })}
            </p>
            <p className="mt-1 text-foreground-dimmed text-xs">
              {translate("updated", { time: format.relativeTime(analyzedAt) })}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BrandMethod />
          <RefreshBrand store={store} disabled={running} />
        </div>
      </div>
      <Summary report={report} />
      <BrandTabs
        plan={<Plan report={report} store={store} />}
        answers={
          <>
            <QueryExplorer queries={report.queries} />
            <Perception report={report} />
          </>
        }
        access={<SiteChecks report={report} />}
      />
    </>
  );
};
