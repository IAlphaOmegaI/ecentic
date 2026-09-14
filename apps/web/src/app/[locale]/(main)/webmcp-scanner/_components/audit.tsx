"use client";

import { CheckIcon, CopyIcon } from "@zenncore/icons";
import { cn, resultify } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import { Button } from "@zenncore/web/components/button";
import { useTranslations } from "next-intl";
import { type PropsWithChildren, useState } from "react";
import type { AuditCheck, AuditFinding, Report } from "@/lib/webmcp";

export const Source = ({ url }: { url: string }) => (
  <a
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    className="break-all font-mono text-primary text-xs underline underline-offset-4"
  >
    {url}
  </a>
);

export const Label = ({
  children,
  tone = "neutral",
}: PropsWithChildren<{
  tone?: "neutral" | "success" | "warning" | "error" | "primary";
}>) => (
  <span
    className={cn(
      "inline-flex shrink-0 items-center rounded-full px-2 py-1 text-xs",
      {
        neutral: "bg-background-dimmed text-foreground-dimmed",
        success: "bg-success/10 text-success",
        warning: "bg-warning/10 text-warning",
        error: "bg-error/10 text-error",
        primary: "bg-primary/10 text-primary",
      }[tone],
    )}
  >
    {children}
  </span>
);

const Snippet = ({ source }: { source: string }) => {
  const translate = useTranslations("webmcpScanner.report.audit");
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const [copy, pending] = useAsyncAction(async () => {
    const result = await resultify(() => navigator.clipboard.writeText(source));
    setCopied(result.success);
    setFailed(!result.success);
  });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="font-medium text-foreground text-sm">
          {translate("snippet")}
        </p>
        <Button
          type="button"
          color="neutral"
          variant="outline"
          onClick={copy}
          disabled={pending}
        >
          {copied ? (
            <CheckIcon className="size-4" />
          ) : (
            <CopyIcon className="size-4" />
          )}
          {translate(copied ? "copied" : "action.secondary")}
        </Button>
      </div>
      <pre className="max-h-80 overflow-auto rounded border border-accent-foreground bg-background-dimmed p-4 font-mono text-foreground text-xs leading-relaxed">
        <code>{source}</code>
      </pre>
      <p aria-live="polite" className="text-foreground-dimmed text-xs">
        {failed ? translate("copyFailed") : translate("snippetNote")}
      </p>
    </div>
  );
};

const Finding = ({ finding }: { finding: AuditFinding }) => {
  const translate = useTranslations("webmcpScanner.report.audit");
  const translateForms = useTranslations("webmcpScanner.report.forms");
  const subject = finding.formIntent
    ? translateForms(`intent.${finding.formIntent}`)
    : finding.subject;
  const tone = {
    high: "error",
    medium: "warning",
    low: "neutral",
    opportunity: "primary",
    info: "neutral",
  } as const;

  return (
    <AccordionItem
      value={finding.id}
      className="border-accent-foreground border-b last:border-b-0"
    >
      <AccordionTrigger className="px-6 py-4 text-left sm:px-8">
        <span className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="flex flex-wrap items-center gap-2">
            <Label tone={tone[finding.priority]}>
              {translate(`priority.${finding.priority}`)}
            </Label>
            <span className="font-medium text-foreground">
              {translate(`findings.${finding.code}.title`)}
            </span>
          </span>
          {subject && (
            <span className="break-all font-normal text-foreground-dimmed text-sm">
              {subject}
            </span>
          )}
          {finding.occurrences.length > 1 && (
            <span className="font-normal text-foreground-dimmed text-xs">
              {translate("occurrences", { count: finding.occurrences.length })}
            </span>
          )}
        </span>
      </AccordionTrigger>
      <AccordionPanel>
        <div className="space-y-6 px-6 pt-2 pb-6 sm:px-8">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <p className="font-medium text-foreground text-sm">
                {translate("why")}
              </p>
              <p className="text-foreground-dimmed text-sm leading-relaxed">
                {finding.formIntent &&
                (finding.code === "formOpportunity" ||
                  finding.code === "formReview")
                  ? translateForms(`guidance.${finding.formIntent}.why`)
                  : translate(`findings.${finding.code}.why`)}
              </p>
            </div>
            <div className="space-y-2">
              <p className="font-medium text-primary text-sm">
                {translate("fix")}
              </p>
              <p className="text-foreground text-sm leading-relaxed">
                {finding.formIntent &&
                (finding.code === "formOpportunity" ||
                  finding.code === "formReview")
                  ? translateForms(`guidance.${finding.formIntent}.fix`)
                  : translate(`findings.${finding.code}.fix`)}
              </p>
            </div>
          </div>
          {finding.evidence.length > 0 && (
            <div className="space-y-2">
              <p className="font-medium text-foreground text-sm">
                {translate("evidence")}
              </p>
              <ul className="space-y-2">
                {finding.evidence.map((evidence, index) => (
                  <li
                    // biome-ignore lint/suspicious/noArrayIndexKey: immutable source excerpts can repeat within one finding.
                    key={index}
                    className="break-all font-mono text-foreground-dimmed text-xs"
                  >
                    {evidence}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {finding.relatedTools.length > 0 && (
            <div className="space-y-2">
              <p className="font-medium text-foreground text-sm">
                {translate("relatedTools")}
              </p>
              <p className="break-words font-mono text-foreground-dimmed text-xs">
                {finding.relatedTools.join(", ")}
              </p>
              <p className="text-foreground-dimmed text-sm leading-relaxed">
                {translateForms("relatedNote")}
              </p>
            </div>
          )}
          {finding.occurrences.length > 1 && (
            <div className="space-y-4">
              <p className="font-medium text-foreground text-sm">
                {translate("occurrences", {
                  count: finding.occurrences.length,
                })}
              </p>
              <ul className="space-y-4">
                {finding.occurrences.map((occurrence) => (
                  <li key={occurrence.formId} className="space-y-2">
                    <Source url={occurrence.pageUrl} />
                    <p className="break-all font-mono text-foreground-dimmed text-xs">
                      {occurrence.selector}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <dt className="font-medium text-foreground">
                {translate("page")}
              </dt>
              <dd>
                <Source url={finding.pageUrl} />
              </dd>
            </div>
            <div className="min-w-0 space-y-2">
              <dt className="font-medium text-foreground">
                {translate("source")}
              </dt>
              <dd>
                <Source url={finding.sourceUrl} />
              </dd>
            </div>
          </dl>
          {finding.snippet && <Snippet source={finding.snippet} />}
        </div>
      </AccordionPanel>
    </AccordionItem>
  );
};

const Check = ({ check }: { check: AuditCheck }) => {
  const translate = useTranslations("webmcpScanner.report.audit");
  return (
    <li className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
      <div className="space-y-2">
        <p className="font-medium text-foreground text-sm">
          {translate(`checks.${check.id}.title`)}
        </p>
        <p className="text-foreground-dimmed text-xs leading-relaxed">
          {translate(`checks.${check.id}.description`)}
        </p>
      </div>
      <Label
        tone={
          check.status === "pass"
            ? "success"
            : check.status === "attention"
              ? "warning"
              : "neutral"
        }
      >
        {translate(`checkStatus.${check.status}`)}
      </Label>
    </li>
  );
};

export const AuditPanel = ({ report }: { report: Report }) => {
  const translate = useTranslations("webmcpScanner.report.audit");
  const priority = {
    high: 0,
    medium: 1,
    low: 2,
    opportunity: 3,
    info: 4,
  } as const;
  const findings = report.audit.findings
    .filter((finding) => finding.code !== "formReview")
    .sort(
      (first, second) => priority[first.priority] - priority[second.priority],
    );
  return (
    <div className="grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <section className="min-w-0">
        <div className="space-y-2 p-6 sm:p-8">
          <h3 className="font-medium text-foreground text-xl">
            {translate("findingsTitle")}
          </h3>
          <p className="text-foreground-dimmed text-sm">
            {translate("findingsDescription")}
          </p>
        </div>
        {findings.length > 0 ? (
          <Accordion
            multiple
            defaultValue={findings.slice(0, 2).map((finding) => finding.id)}
            className="border-accent-foreground border-t"
          >
            {findings.map((finding) => (
              <Finding key={finding.id} finding={finding} />
            ))}
          </Accordion>
        ) : (
          <p className="px-6 pb-6 text-foreground-dimmed text-sm sm:px-8">
            {translate("empty")}
          </p>
        )}
      </section>
      <aside className="space-y-6 border-accent-foreground border-t bg-background-dimmed p-6 sm:p-8 lg:border-t-0 lg:border-l">
        <div className="space-y-2">
          <h3 className="font-medium text-foreground text-xl">
            {translate("checksTitle")}
          </h3>
          <p className="text-foreground-dimmed text-sm leading-relaxed">
            {translate("checksDescription")}
          </p>
        </div>
        <ul className="divide-y divide-accent-foreground">
          {report.audit.checks.map((check) => (
            <Check key={check.id} check={check} />
          ))}
        </ul>
      </aside>
    </div>
  );
};
