"use client";

import { cn } from "@zenncore/utils";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import { useFormatter, useTranslations } from "next-intl";
import type * as Rules from "@/server/app/intelligence/claim-check-rules";
import { SectionKicker, StatusPill } from "../../../../../_components/grid";
import {
  ASSISTANT_LABEL,
  STANCE_TONE,
  VERDICT_ICON,
  VERDICT_KEY,
  VERDICT_ORDER,
  VERDICT_TONE,
} from "./verdicts";

/**
 * The listing's claims, most urgent verdict first. Each opens onto the
 * evidence behind its verdict — quotes from pages ecentic opened, kept apart
 * from Perplexity's own summaries — then what the assistants said, what would
 * change the verdict, and what to do.
 */
export const ClaimsList = ({ claims }: { claims: Rules.Claim[] }) => {
  const ordered = [...claims].sort(
    (a, b) =>
      VERDICT_ORDER.indexOf(a.verdict) - VERDICT_ORDER.indexOf(b.verdict),
  );

  return (
    <Accordion multiple className="text-foreground">
      {ordered.map((claim) => (
        <ClaimItem key={claim.key} claim={claim} />
      ))}
    </Accordion>
  );
};

const ClaimItem = ({ claim }: { claim: Rules.Claim }) => {
  const translate = useTranslations("dashboard.claims.claims");
  const verdicts = useTranslations("dashboard.claims.verdicts");
  const diverges = claim.assistants.some((view) => view.stance === "diverges");

  return (
    <AccordionItem
      value={claim.key}
      className="border-accent-foreground border-b bg-background-rich last:border-b-0"
    >
      <AccordionTrigger
        className="items-center px-5 py-4 hover:bg-background-dimmed/40"
        classList={{
          trigger: {
            icon: "size-4 shrink-0 text-foreground-dimmed group-data-panel-open:rotate-180",
          },
        }}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-2 text-left sm:flex-row sm:items-center sm:gap-4">
          <StatusPill
            tone={VERDICT_TONE[claim.verdict]}
            className="w-fit shrink-0"
          >
            {VERDICT_ICON[claim.verdict]}
            {verdicts(`${VERDICT_KEY[claim.verdict]}.label`)}
          </StatusPill>
          <p className="min-w-0 flex-1 text-foreground text-sm">
            “{claim.span}”
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-foreground-dimmed text-xs">
              {translate(`kinds.${claim.kind}`)}
            </span>
            {diverges && (
              <StatusPill tone="error">
                {translate("assistantsDiffer")}
              </StatusPill>
            )}
          </div>
        </div>
      </AccordionTrigger>
      <AccordionPanel>
        <div className="grid gap-px border-accent-foreground border-t bg-accent-foreground lg:grid-cols-[1.4fr_1fr]">
          <EvidenceColumn claim={claim} />
          <div className="flex flex-col gap-5 bg-background-rich p-5">
            <AssistantAnswers claim={claim} />
            <Guidance claim={claim} />
          </div>
        </div>
      </AccordionPanel>
    </AccordionItem>
  );
};

const EvidenceColumn = ({ claim }: { claim: Rules.Claim }) => {
  const translate = useTranslations("dashboard.claims.claims");
  const format = useFormatter();

  return (
    <div className="flex flex-col gap-4 bg-background-rich p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionKicker>{translate("evidence.title")}</SectionKicker>
        <div className="flex flex-wrap items-center gap-2">
          {claim.confidence && (
            <StatusPill>
              {translate(`confidence.${claim.confidence}`)}
            </StatusPill>
          )}
        </div>
      </div>
      {claim.citedStance && (
        <p className="text-foreground-dimmed text-sm">
          {translate(`cited.${claim.citedStance}`)}
        </p>
      )}
      {claim.evidence.length === 0 ? (
        <p className="text-foreground-dimmed text-sm">
          {translate("evidence.none")}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {claim.evidence.map((entry) => (
            <li
              key={`${entry.kind}-${entry.relation}-${entry.url}`}
              className="rounded-md border border-accent-foreground bg-background p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={entry.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="truncate font-mono text-primary-text text-xs hover:underline"
                >
                  {entry.host}
                </a>
                <StatusPill
                  tone={entry.party === "independent" ? "neutral" : "warning"}
                >
                  {translate(`evidence.party.${entry.party}`)}
                </StatusPill>
                {entry.kind === "page" && (
                  <StatusPill
                    tone={
                      entry.relation === "contradicts" ? "error" : "success"
                    }
                  >
                    {translate(`evidence.relation.${entry.relation}`)}
                  </StatusPill>
                )}
              </div>
              {entry.quote && (
                <blockquote className="mt-2 border-primary/40 border-l-2 pl-3 text-foreground text-sm">
                  “{entry.quote}”
                </blockquote>
              )}
              {entry.summary && (
                <p className="mt-2 text-foreground-dimmed text-sm">
                  <span className="font-medium text-foreground">
                    {translate("evidence.perplexity")}
                  </span>{" "}
                  {entry.summary}
                </p>
              )}
              <p className="mt-2 text-foreground-dimmed text-xs">
                {entry.kind === "page"
                  ? translate("evidence.opened")
                  : translate("evidence.citedOnly")}
                {entry.citedUrl && (
                  <>
                    {" · "}
                    {translate("evidence.redirected", {
                      url: entry.citedUrl,
                    })}
                  </>
                )}
                {" · "}
                {translate("evidence.retrieved", {
                  time: format.relativeTime(new Date(entry.retrievedAt)),
                })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const STANCE_TEXT: Record<Rules.AssistantStance, string> = {
  agrees: "text-foreground",
  diverges: "text-error",
  unknown: "text-foreground-dimmed",
};

const AssistantAnswers = ({ claim }: { claim: Rules.Claim }) => {
  const translate = useTranslations("dashboard.claims.claims");

  if (!claim.checkable) return null;

  return (
    <div>
      <SectionKicker>{translate("assistants.title")}</SectionKicker>
      {claim.assistants.length === 0 ? (
        <p className="mt-2 text-foreground-dimmed text-sm">
          {translate("assistants.none")}
        </p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {claim.assistants.map((view) => (
            <li key={view.assistant} className="flex items-start gap-3 text-sm">
              <span className="w-16 shrink-0 text-foreground-dimmed">
                {ASSISTANT_LABEL[view.assistant]}
              </span>
              <span className={cn("min-w-0 flex-1", STANCE_TEXT[view.stance])}>
                {view.value ?? translate("assistants.unknown")}
              </span>
              {view.value && view.stance !== "unknown" && (
                <StatusPill
                  tone={STANCE_TONE[view.stance]}
                  className="shrink-0"
                >
                  {translate(`assistants.stance.${view.stance}`)}
                </StatusPill>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const Guidance = ({ claim }: { claim: Rules.Claim }) => {
  const translate = useTranslations("dashboard.claims.claims");
  const span = claim.span;
  const attribute = claim.attribute;
  const host =
    claim.evidence.find((entry) => entry.relation === "contradicts")?.host ??
    claim.evidence[0]?.host ??
    "";

  // One literal key per branch so every message's placeholders stay typed.
  const changeIf = (() => {
    switch (claim.verdict) {
      case "verified":
        return translate("changeIf.verified");
      case "cited":
        return translate("changeIf.cited");
      case "contradicted":
        return translate("changeIf.contradicted", { host });
      case "not-checkable":
        return translate("changeIf.notCheckable");
      case "unresearched":
        return translate("changeIf.unresearched");
      default:
        return translate("changeIf.merchantOnly", { attribute });
    }
  })();

  const fix = (() => {
    switch (claim.guidance) {
      case "verified":
        return translate("fix.verified");
      case "cited":
        return translate("fix.cited");
      case "contradicted":
        return translate("fix.contradicted", { span, host });
      case "notCheckable":
        return translate("fix.notCheckable", { span });
      case "unresearched":
        return null;
      case "merchantOnlySpec":
        return translate("fix.merchantOnlySpec", { span });
      case "merchantOnlyCertification":
        return translate("fix.merchantOnlyCertification", { span });
      case "merchantOnlyComparative":
        return translate("fix.merchantOnlyComparative", { span });
      case "merchantOnlyOrigin":
        return translate("fix.merchantOnlyOrigin", { span });
      case "merchantOnlyPolicy":
        return translate("fix.merchantOnlyPolicy", { span });
      default:
        return translate("fix.merchantOnlyOther", { span });
    }
  })();

  const diverging = claim.assistants
    .filter((view) => view.stance === "diverges")
    .map((view) => ASSISTANT_LABEL[view.assistant]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <SectionKicker>{translate("changeIf.title")}</SectionKicker>
        <p className="mt-2 text-foreground text-sm">{changeIf}</p>
      </div>
      {fix && (
        <div>
          <SectionKicker>{translate("fix.title")}</SectionKicker>
          <p className="mt-2 text-primary-text text-sm">→ {fix}</p>
        </div>
      )}
      {diverging.length > 0 && (
        <p className="text-foreground-dimmed text-sm">
          {translate("divergenceFix", {
            assistants: diverging.join(", "),
            attribute,
          })}
        </p>
      )}
    </div>
  );
};
