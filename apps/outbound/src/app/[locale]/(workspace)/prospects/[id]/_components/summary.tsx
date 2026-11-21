import { ArrowRightIcon } from "@zenncore/icons";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import { Button } from "@zenncore/web/components/button";
import { getFormatter, getMessages, getTranslations } from "next-intl/server";
import type { ComponentProps } from "react";
import { Link } from "@/i18n/navigation";
import type { Prospect } from "@/lib/outbound";
import {
  type ProspectProgress,
  prospectLifecycles,
} from "@/lib/outbound-prospect-progress";
import type { ProspectTools } from "../../../_components/integrations";
import { ProspectEmailProgress } from "../../../_components/prospect-progress";
import { Status } from "../../../_components/status";
import { ProspectEditorPanel } from "./editor";

export const ProspectSummary = async ({
  prospect,
  progress,
  clay,
}: {
  prospect: Prospect;
  progress: ProspectProgress | null;
  clay: ComponentProps<typeof ProspectTools>["clay"];
}) => {
  const [t, messages, format] = await Promise.all([
    getTranslations("outbound"),
    getMessages(),
    getFormatter(),
  ]);
  const date = (value: string) => {
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp)
      ? `${format.dateTime(new Date(timestamp), {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "UTC",
        })} UTC`
      : t("common.emptyValue");
  };
  const scheduled = prospectLifecycles(
    prospect,
    progress ?? undefined,
  ).includes("scheduled");
  const issues = prospect.issues.map((issue) => ({
    key: `${issue.code}-${issue.field}`,
    label:
      Object.entries(messages.outbound.issues).find(
        ([key]) => key === issue.code,
      )?.[1] ?? t("automation.unknownReason"),
  }));
  const hold = prospect.holdReason
    ? (Object.entries(messages.outbound.automation.reasons).find(
        ([key]) => key === prospect.holdReason,
      )?.[1] ?? prospect.holdReason)
    : null;
  const publicUrl = (value?: string) =>
    value && /^https?:\/\//i.test(value) ? value : null;
  const productSource = publicUrl(
    prospect.productInsight?.sourceUrl || prospect.productUrl,
  );
  return (
    <div className="min-w-0">
      <section className="flex flex-wrap items-start justify-between gap-4 border-accent-foreground border-b px-4 py-6 sm:px-6">
        <div className="min-w-0">
          <h2 className="break-words font-heading font-semibold text-2xl text-foreground-rich">
            {prospect.company}
          </h2>
          <p className="mt-1 break-words text-foreground-dimmed text-sm">
            {prospect.name}
            {prospect.title ? ` · ${prospect.title}` : ""}
          </p>
          <p className="mt-1 break-all text-foreground-dimmed text-sm">
            {prospect.email || prospect.domain}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {prospect.campaignId && (
            <Button
              variant="soft"
              color="neutral"
              render={<Link href={`/campaigns/${prospect.campaignId}`} />}
            >
              {t("prospect.summary.action.secondary")}
            </Button>
          )}
          <Button
            variant="soft"
            render={
              <Link href={`/replies?view=sent&prospect=${prospect.id}`} />
            }
          >
            {t("nav.replies")}
            <ArrowRightIcon aria-hidden className="size-4" />
          </Button>
        </div>
      </section>

      <section className="grid border-accent-foreground border-b sm:grid-cols-3">
        <div className="space-y-3 px-4 py-5 sm:px-6">
          <h3 className="font-medium text-foreground-rich text-sm">
            {t("prospect.progress.emailProgress")}
          </h3>
          <ProspectEmailProgress
            prospect={prospect}
            progress={progress ?? undefined}
          />
          <p className="text-foreground-dimmed text-xs leading-5">
            {t("prospect.summary.emailAccepted", { count: prospect.sentStep })}
          </p>
          <p className="text-foreground-dimmed text-xs leading-5">
            {scheduled && progress?.nextSendAt
              ? t("prospect.summary.nextEmail", {
                  time: date(progress.nextSendAt),
                })
              : t("prospect.summary.noSchedule")}
          </p>
        </div>
        <div className="space-y-3 border-accent-foreground border-t px-4 py-5 sm:border-t-0 sm:border-l sm:px-6">
          <h3 className="font-medium text-foreground-rich text-sm">
            {t("nav.linkedin")}
          </h3>
          <p className="text-sm">
            {prospect.linkedinUrl
              ? t(`linkedin.status.${prospect.linkedinStatus}`)
              : t("prospect.summary.noProfile")}
          </p>
          {publicUrl(prospect.linkedinUrl) && (
            <a
              href={prospect.linkedinUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-primary-text text-xs hover:underline"
            >
              {t("prospect.summary.profile")}
              <ArrowRightIcon aria-hidden className="size-3.5" />
            </a>
          )}
        </div>
        <div className="space-y-3 border-accent-foreground border-t px-4 py-5 sm:border-t-0 sm:border-l sm:px-6">
          <h3 className="font-medium text-foreground-rich text-sm">
            {t("prospect.summary.preparation")}
          </h3>
          <p className="text-sm">
            {progress
              ? progress.research
                ? t(`automation.statuses.${progress.research}`)
                : t("prospect.summary.noPreparation")
              : t("automation.unknownStage")}
          </p>
          {!progress && (
            <p role="status" className="text-foreground-dimmed text-xs">
              {t("automation.statusError")}
            </p>
          )}
          {hold && (
            <p className="break-words text-foreground-dimmed text-xs leading-5">
              {hold}
            </p>
          )}
        </div>
      </section>

      <div className="grid min-w-0 border-accent-foreground border-b xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="min-w-0 px-4 py-6 sm:px-6">
          <h3 className="font-semibold text-base text-foreground-rich">
            {t("prospect.summary.insightTitle")}
          </h3>
          {prospect.product && (
            <p className="mt-3 break-words font-medium text-foreground-rich text-sm">
              {prospect.product}
            </p>
          )}
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">
            {prospect.productInsight?.feature ||
              prospect.finding ||
              t("prospect.summary.insightMissing")}
          </p>
          {prospect.productInsight?.sourceQuote && (
            <figure className="mt-4 border-accent-foreground border-l-2 pl-4">
              <figcaption className="mb-2 text-foreground-dimmed text-xs">
                {t("prospect.summary.sourceQuote")}
              </figcaption>
              <blockquote className="whitespace-pre-wrap break-words text-foreground-dimmed text-sm leading-6">
                {prospect.productInsight.sourceQuote}
              </blockquote>
            </figure>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            {productSource && (
              <a
                href={productSource}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-primary-text text-xs hover:underline"
              >
                {t("prospect.action.tertiary")}
                <ArrowRightIcon aria-hidden className="size-3.5" />
              </a>
            )}
            {prospect.evidenceCheckedAt && (
              <p className="text-foreground-dimmed text-xs">
                {t("prospect.summary.checkedAt", {
                  time: date(prospect.evidenceCheckedAt),
                })}
              </p>
            )}
          </div>
          {(prospect.evidence || prospect.legitEvidence) && (
            <Accordion className="mt-4">
              <AccordionItem className="border-b-0">
                <AccordionTrigger className="text-sm">
                  {t("prospect.summary.detailsTitle")}
                </AccordionTrigger>
                <AccordionPanel>
                  <div className="space-y-4 pt-2 text-sm leading-6">
                    {prospect.productInsight?.relevance && (
                      <div>
                        <h4 className="font-medium text-foreground-rich">
                          {t("prospect.summary.proposedCheck")}
                        </h4>
                        <p className="mt-1 whitespace-pre-wrap break-words">
                          {prospect.productInsight.relevance}
                        </p>
                      </div>
                    )}
                    {[
                      { label: "evidence", value: prospect.evidence },
                      { label: "legitEvidence", value: prospect.legitEvidence },
                    ].map(
                      ({ label, value }) =>
                        value && (
                          <div key={label}>
                            <h4 className="font-medium text-foreground-rich">
                              {label === "evidence"
                                ? t("prospect.fields.evidence")
                                : t("prospect.fields.legitEvidence")}
                            </h4>
                            <p className="mt-1 whitespace-pre-wrap break-words">
                              {value}
                            </p>
                          </div>
                        ),
                    )}
                  </div>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          )}
        </section>
        <section className="min-w-0 border-accent-foreground border-t px-4 py-6 sm:px-6 xl:border-t-0 xl:border-l">
          <h3 className="mb-3 font-semibold text-base text-foreground-rich">
            {t("prospect.verificationTitle")}
          </h3>
          <Status value={prospect.emailStatus} />
          {prospect.emailVerifiedAt && (
            <p className="mt-3 text-foreground-dimmed text-xs leading-5">
              {t("prospect.summary.checkedAt", {
                time: date(prospect.emailVerifiedAt),
              })}
            </p>
          )}
          {prospect.emailSource && (
            <p className="mt-2 break-words text-foreground-dimmed text-xs leading-5">
              {prospect.emailSource}
            </p>
          )}
          {prospect.issues.some(
            (issue) => issue.code === "emailUnverified",
          ) && (
            <p className="mt-3 text-foreground-dimmed text-xs leading-5">
              {t("prospect.summary.needsVerification")}
            </p>
          )}
          {issues.length > 0 && (
            <Accordion className="mt-4">
              <AccordionItem className="border-b-0">
                <AccordionTrigger className="text-sm">
                  {t("prospect.summary.issuesTitle", { count: issues.length })}
                </AccordionTrigger>
                <AccordionPanel>
                  <ul className="list-disc space-y-2 pt-2 pl-4 text-xs leading-5">
                    {issues.map((issue) => (
                      <li key={issue.key}>{issue.label}</li>
                    ))}
                  </ul>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          )}
        </section>
      </div>

      <section className="min-w-0 border-accent-foreground border-b px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-base text-foreground-rich">
              {t("prospect.summary.sequenceTitle")}
            </h3>
            <p className="mt-1 text-foreground-dimmed text-xs leading-5">
              {t("prospect.summary.sequenceHelp")}
            </p>
          </div>
          {prospect.messages.length > 0 && (
            <Button
              variant="soft"
              color="neutral"
              render={<Link href={`/review/${prospect.id}`} />}
            >
              {t("prospect.summary.action.tertiary")}
            </Button>
          )}
        </div>
        {prospect.messages.length || prospect.linkedinDraft ? (
          <Accordion className="mt-4">
            {prospect.messages.map((message) => (
              <AccordionItem key={message.step} className="last:border-b-0">
                <AccordionTrigger className="py-3 text-sm">
                  <span className="min-w-0">
                    <span className="block font-medium text-foreground-rich">
                      {t("sent.step", { step: String(message.step) })}
                      {message.step > 1
                        ? ` · ${t("review.afterDays", { count: message.afterDays })}`
                        : ""}
                    </span>
                    <span className="mt-1 block truncate font-normal text-foreground-dimmed text-xs">
                      {message.subject}
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionPanel>
                  <p className="max-w-3xl whitespace-pre-wrap break-words pt-1 pb-4 text-sm leading-6">
                    {message.body}
                  </p>
                </AccordionPanel>
              </AccordionItem>
            ))}
            {prospect.linkedinDraft && (
              <AccordionItem className="border-b-0">
                <AccordionTrigger className="py-3 text-sm">
                  {t("prospect.summary.linkedinDraft")}
                </AccordionTrigger>
                <AccordionPanel>
                  <p className="max-w-3xl whitespace-pre-wrap break-words pt-1 pb-4 text-sm leading-6">
                    {prospect.linkedinDraft}
                  </p>
                </AccordionPanel>
              </AccordionItem>
            )}
          </Accordion>
        ) : (
          <p className="mt-4 text-foreground-dimmed text-sm">
            {t("prospect.summary.sequenceMissing")}
          </p>
        )}
      </section>

      <ProspectEditorPanel prospect={prospect} clay={clay} />
    </div>
  );
};
