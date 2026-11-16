import {
  ArrowRightIcon,
  BarChartIcon,
  ClockIcon,
  FileSearchIcon,
} from "@zenncore/icons";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import { getFormatter, getTranslations } from "next-intl/server";
import { AnalysisText } from "@/components/analysis-text";
import {
  MarketingBand,
  MarketingFeatureBand,
} from "@/components/marketing/primitives";
import { Link } from "@/i18n/navigation";
import type * as Scan from "@/server/app/scan";
import { ShareOutcomeVisual } from "./outcome-visual";
import { shareOutcome, shareProviderRows } from "./report-data";
import { ShareCallToAction } from "./shell";

export const ShareReport = async ({ scan, modelRates }: Scan.ShareData) => {
  const [translate, format] = await Promise.all([
    getTranslations("share"),
    getFormatter(),
  ]);
  const outcome = shareOutcome(scan.wins, scan.losses);
  const providers = shareProviderRows(modelRates);
  const impactParagraphs =
    scan.topFinding?.impactDescription.split(/\n\s*\n/).filter(Boolean) ?? [];
  const [impactOpening, ...impactDetails] = impactParagraphs;
  const percentage = (value: number) =>
    format.number(value / 100, { style: "percent", maximumFractionDigits: 0 });

  return (
    <>
      <MarketingFeatureBand tone="dark" aria-labelledby="share-score-heading">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-background-rich/15 border-b px-4 py-4 text-background-rich/65 text-sm sm:px-6">
          <p className="flex items-center gap-2">
            <ClockIcon aria-hidden className="size-4 shrink-0" />
            {translate("review.recorded", {
              date: format.dateTime(scan.createdAt, { dateStyle: "medium" }),
            })}
          </p>
          <p className="flex items-center gap-2">
            <BarChartIcon aria-hidden className="size-4 shrink-0" />
            {translate("score.simulations", {
              count: format.number(scan.completedSimulations),
            })}
          </p>
        </div>
        <div className="grid lg:grid-cols-3">
          <section className="flex min-w-0 flex-col px-4 py-6 sm:px-6">
            <h2 id="share-score-heading" className="sr-only">
              {translate("review.score.label")}
            </h2>
            <div className="mx-auto w-full max-w-72">
              <ShareOutcomeVisual
                wins={scan.wins}
                losses={scan.losses}
                formattedRate={
                  outcome.rate === null ? "—" : percentage(outcome.rate)
                }
                label={translate("review.score.label")}
              />
            </div>
            <p className="mt-4 text-background-rich/65 text-sm leading-6">
              {outcome.rate === null
                ? translate("review.score.empty")
                : translate("review.score.context", {
                    wins: scan.wins,
                    total: outcome.total,
                  })}
            </p>
            <dl className="mt-6 grid grid-cols-2 gap-6 border-background-rich/15 border-t pt-5">
              <div>
                <dt className="flex items-center gap-2 text-background-rich/65 text-sm">
                  <span
                    aria-hidden
                    className="size-2 rounded-full bg-primary"
                  />
                  {translate("score.wins")}
                </dt>
                <dd className="mt-2 font-semibold text-3xl text-background-rich tabular-nums">
                  {format.number(scan.wins)}
                </dd>
              </div>
              <div>
                <dt className="flex items-center gap-2 text-background-rich/65 text-sm">
                  <span
                    aria-hidden
                    className="size-2 rounded-full bg-background-rich/30"
                  />
                  {translate("score.losses")}
                </dt>
                <dd className="mt-2 font-semibold text-3xl text-background-rich tabular-nums">
                  {format.number(scan.losses)}
                </dd>
              </div>
            </dl>
          </section>
          <section
            aria-labelledby="share-providers-heading"
            className="flex min-w-0 flex-col border-background-rich/15 border-t lg:col-span-2 lg:border-t-0 lg:border-l"
          >
            <div className="border-background-rich/15 border-b px-4 py-6 sm:px-6">
              <h2
                id="share-providers-heading"
                className="font-heading font-semibold text-xl"
              >
                {translate("review.providers.title")}
              </h2>
              <p className="mt-2 text-background-rich/65 text-sm leading-6">
                {translate("review.providers.description")}
              </p>
            </div>
            {providers.length > 0 ? (
              <ul className="flex flex-1 flex-col divide-y divide-background-rich/15">
                {providers.map((provider) => (
                  <li
                    key={provider.id}
                    className="flex flex-1 items-center gap-4 px-4 py-5 sm:px-6"
                  >
                    {provider.logo ? (
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-background-rich">
                        <Image
                          src={provider.logo}
                          alt=""
                          width={28}
                          height={28}
                          className="size-7 object-contain"
                        />
                      </span>
                    ) : (
                      <BarChartIcon
                        aria-hidden
                        className="size-10 shrink-0 text-background-rich/65"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="break-words font-semibold text-base">
                        {provider.label}
                      </h3>
                      <p className="mt-1 text-background-rich/65 text-sm">
                        {translate("review.providers.outcomes", {
                          wins: provider.wins,
                          losses: provider.losses,
                        })}
                      </p>
                    </div>
                    <p className="shrink-0 font-semibold text-2xl text-background-rich tabular-nums">
                      {percentage(provider.rate)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-8 text-background-rich/65 leading-relaxed sm:px-6">
                {translate("review.providers.empty")}
              </p>
            )}
          </section>
        </div>
      </MarketingFeatureBand>
      {scan.topFinding ? (
        <MarketingBand
          aria-labelledby="share-finding-heading"
          className="border-t-0 bg-background-rich"
        >
          <div className="grid gap-6 px-4 py-8 sm:px-6 sm:py-10 md:grid-cols-3 md:gap-10">
            <div className="min-w-0 md:col-span-2">
              <div className="flex items-center gap-3">
                <FileSearchIcon
                  aria-hidden
                  className="size-6 shrink-0 text-primary-text"
                />
                <h2
                  id="share-finding-heading"
                  className="font-heading font-semibold text-foreground-rich text-xl"
                >
                  {translate("review.finding.title")}
                </h2>
              </div>
              <h3 className="mt-5 text-balance font-heading font-semibold text-2xl text-foreground-rich leading-snug sm:text-3xl">
                <AnalysisText text={scan.topFinding.name} />
              </h3>
              {impactOpening && (
                <p className="mt-4 text-base text-foreground-dimmed leading-relaxed">
                  <AnalysisText
                    text={impactOpening}
                    terms={scan.topFinding.missingAttributes}
                  />
                </p>
              )}
              {scan.topFinding.missingAttributes.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-semibold text-foreground-rich text-sm">
                    {translate("finding.missingAttributes")}
                  </h4>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {scan.topFinding.missingAttributes.map((attribute) => (
                      <li
                        key={attribute}
                        className="rounded-lg bg-background px-3 py-1.5 text-foreground text-sm"
                      >
                        {attribute}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="flex min-w-0 flex-col items-start justify-between gap-8 border-accent-foreground border-t pt-6 md:border-t-0 md:border-l md:pt-0 md:pl-8">
              <div>
                <p className="font-semibold text-5xl text-error tabular-nums sm:text-6xl">
                  {percentage(scan.topFinding.lossPercentage)}
                </p>
                <p className="mt-2 text-foreground-dimmed text-sm">
                  {translate("finding.simsLost")}
                </p>
              </div>
              <div>
                <p className="mb-4 text-foreground-dimmed text-sm leading-6">
                  {translate("review.cta.description")}
                </p>
                <Button color="primary" render={<Link href="/sign-up" />}>
                  {translate("cta.action")}
                  <ArrowRightIcon aria-hidden className="size-4" />
                </Button>
              </div>
            </div>
          </div>
          {impactDetails.length > 0 && (
            <Accordion className="border-accent-foreground border-t">
              <AccordionItem value="impact" className="border-b-0">
                <AccordionTrigger
                  className="px-4 py-4 sm:px-6"
                  classList={{
                    trigger: { icon: "motion-reduce:transition-none" },
                  }}
                >
                  {translate("review.finding.details")}
                </AccordionTrigger>
                <AccordionPanel className="motion-reduce:transition-none">
                  <div className="max-w-4xl space-y-4 px-4 pb-6 text-base text-foreground-dimmed leading-relaxed sm:px-6">
                    {impactDetails.map((paragraph, index) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: saved paragraphs are immutable and can repeat.
                      <p key={index}>
                        <AnalysisText
                          text={paragraph}
                          terms={scan.topFinding?.missingAttributes}
                        />
                      </p>
                    ))}
                  </div>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          )}
        </MarketingBand>
      ) : (
        <ShareCallToAction />
      )}
    </>
  );
};
