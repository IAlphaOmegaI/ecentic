"use client";

import {
  BookIcon,
  BullseyeIcon,
  CheckBadgeIcon,
  FileSearchIcon,
  GaugeIcon,
  LinkedinIcon,
  UserIcon,
} from "@zenncore/icons";
import { resultify } from "@zenncore/utils";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import { Button } from "@zenncore/web/components/button";
import {
  field,
  InferredForm,
  InferredFormField,
} from "@zenncore/web/components/inferred-form";
import { Textarea, TextareaInput } from "@zenncore/web/components/textarea";
import { useMessages, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { z } from "zod";
import {
  type Playbook,
  playbookSchema,
  TEMPLATE_VARIABLES,
} from "@/lib/outbound";
import {
  PROPOSED_REBUILD_PLAYBOOK,
  rebuildWritingProposal,
} from "@/lib/outbound-rebuild-policy";
import type { LinkedInAccount } from "@/lib/outbound-unipile";
import * as Outbound from "@/server/app/outbound";
import { fields, Notice, Submit, useMutation } from "./common";

const groups = [
  {
    title: "automationTitle",
    icon: GaugeIcon,
    keys: ["automationEnabled", "automaticApolloEnabled", "dailyCompanyTarget"],
  },
  {
    title: "linkedinAutomationTitle",
    icon: LinkedinIcon,
    keys: [
      "linkedinAutomationEnabled",
      "linkedinAccountId",
      "linkedinDailyInvites",
      "linkedinWeeklyInvites",
      "linkedinDailyMessages",
    ],
  },
  {
    title: "voiceTitle",
    icon: UserIcon,
    keys: [
      "name",
      "fromName",
      "fromEmail",
      "senderEmails",
      "inactiveSenderEmails",
      "signature",
      "postalAddress",
      "optout",
      "senderConfirmed",
    ],
  },
  {
    title: "researchTitle",
    icon: FileSearchIcon,
    keys: [
      "researchInstructions",
      "queryStyle",
      "searchesPerLead",
      "discoveryFreshnessDays",
      "requireShoppingEvidence",
      "allowProductObservations",
    ],
  },
  {
    title: "writingTitle",
    icon: BookIcon,
    keys: [
      "subjectTemplate",
      "bodyTemplate",
      "relevanceLines",
      "founderLine",
      "productCheckIntro",
      "callToAction",
      "followupOneTemplate",
      "followupTwoTemplate",
      "voiceNotes",
      "sentEmailExamples",
      "maxBodyWords",
      "bannedPhrases",
      "firstEmailBlockedClaims",
      "replyClaimNotes",
      "meetingBookingUrl",
      "humanizeDrafts",
      "humanizerNotes",
    ],
  },
  {
    title: "publishedProductTitle",
    help: "publishedProductHelp",
    icon: BookIcon,
    keys: [
      "publishedProductObservation",
      "publishedProductConsequence",
      "publishedProductAskAbout",
    ],
  },
  {
    title: "barcodeTitle",
    help: "barcodeHelp",
    icon: BookIcon,
    keys: ["barcodeObservation", "barcodeConsequence", "barcodeAskAbout"],
  },
  {
    title: "reviewsTitle",
    help: "reviewsHelp",
    icon: BookIcon,
    keys: ["reviewsObservation", "reviewsConsequence", "reviewsAskAbout"],
  },
  {
    title: "noBarcodeTitle",
    help: "noBarcodeHelp",
    icon: BookIcon,
    keys: ["noBarcodeObservation", "noBarcodeConsequence", "noBarcodeAskAbout"],
  },
  {
    title: "noProductTitle",
    help: "noProductHelp",
    icon: BookIcon,
    keys: ["noProductObservation", "noProductConsequence", "noProductAskAbout"],
  },
  {
    title: "sequenceTitle",
    icon: BookIcon,
    keys: ["linkedinTemplate", "followupOneDays", "followupTwoDays"],
  },
  {
    title: "targetingTitle",
    icon: BullseyeIcon,
    keys: [
      "allowedCountries",
      "heldCountries",
      "allowMicrosoftRecipients",
      "targetRoles",
      "excludedRoles",
      "excludedDomains",
      "excludedCompanies",
      "targetingNotes",
      "verificationDays",
      "allowStaleEvidence",
      "trustSavedContactVerification",
      "emailVerificationDays",
    ],
  },
  {
    title: "limitsTitle",
    icon: GaugeIcon,
    keys: [
      "weeklyTarget",
      "dailyCap",
      "sendingRampEnabled",
      "allowUsMarketWindow",
      "minGapMinutes",
      "maxGapMinutes",
      "historyConfirmed",
      "allowIncompleteHistory",
      "competingSendersPaused",
      "senderTested",
      "sendingEnabled",
    ],
  },
] as const;

/** The shared custom-field adapter accepts a scalar; the saved policy remains string[]. */
const decodeRelevanceLines = (value: unknown): string[] | null => {
  if (typeof value !== "string") return null;
  const decoded = resultify((): unknown => JSON.parse(value));
  const parsed = z
    .array(z.string())
    .safeParse(decoded.success ? decoded.data : null);
  return parsed.success ? parsed.data : null;
};

const RelevanceLines = ({
  value,
  onValueChange,
  onBlur,
  disabled,
}: {
  value?: string | null;
  onValueChange?: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
}) => {
  const t = useTranslations("outbound.playbook");
  const lines = decodeRelevanceLines(value) ?? [];
  const update = (next: string[]) => onValueChange?.(JSON.stringify(next));
  return (
    <div className="space-y-3">
      {lines.map((line, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: controlled text rows must retain focus while their text changes.
        <div key={index} className="flex items-start gap-2">
          <Textarea
            value={line}
            disabled={disabled}
            onBlur={onBlur}
            onValueChange={(next) =>
              update(lines.map((value, row) => (row === index ? next : value)))
            }
            className="min-w-0 flex-1"
          >
            <TextareaInput
              rows={3}
              aria-label={t("relevanceLine", { number: String(index + 1) })}
            />
          </Textarea>
          <Button
            type="button"
            variant="ghost"
            disabled={disabled}
            onClick={() => update(lines.filter((_, row) => row !== index))}
            aria-label={t("removeRelevanceLine", { number: String(index + 1) })}
          >
            {t("removeLine")}
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        disabled={disabled || lines.length >= 30}
        onClick={() => update([...lines, ""])}
      >
        {t("addRelevanceLine")}
      </Button>
    </div>
  );
};

export const PlaybookEditor = ({
  value,
  revision,
  linkedinAccounts = [],
}: {
  value: Playbook;
  revision: number;
  linkedinAccounts?: LinkedInAccount[];
}) => {
  const t = useTranslations("outbound");
  const messages = useMessages();
  const labels = messages.outbound.playbook.fields;
  const mutation = useMutation();
  const [proposal, setProposal] = useState<{
    values: Playbook;
    version: number;
    revision: number;
  } | null>(null);
  const currentValues = useRef({ revision, values: value });
  const activeProposal = proposal?.revision === revision ? proposal : null;
  const baseConfig = fields(
    groups.flatMap((group) => [...group.keys]),
    labels,
    {
      multiline: [
        "senderEmails",
        "inactiveSenderEmails",
        "bodyTemplate",
        "followupOneTemplate",
        "followupTwoTemplate",
        "linkedinTemplate",
        "voiceNotes",
        "researchInstructions",
        "queryStyle",
        "founderLine",
        "productCheckIntro",
        "publishedProductObservation",
        "publishedProductConsequence",
        "humanizerNotes",
        "sentEmailExamples",
        "bannedPhrases",
        "firstEmailBlockedClaims",
        "replyClaimNotes",
        "barcodeObservation",
        "barcodeConsequence",
        "reviewsObservation",
        "reviewsConsequence",
        "noBarcodeObservation",
        "noBarcodeConsequence",
        "noProductObservation",
        "noProductConsequence",
        "allowedCountries",
        "heldCountries",
        "targetRoles",
        "excludedRoles",
        "excludedDomains",
        "excludedCompanies",
        "targetingNotes",
      ],
      numbers: [
        "dailyCompanyTarget",
        "maxBodyWords",
        "followupOneDays",
        "followupTwoDays",
        "verificationDays",
        "searchesPerLead",
        "discoveryFreshnessDays",
        "emailVerificationDays",
        "weeklyTarget",
        "dailyCap",
        "minGapMinutes",
        "maxGapMinutes",
        "linkedinDailyInvites",
        "linkedinWeeklyInvites",
        "linkedinDailyMessages",
      ],
      validators: playbookSchema.shape,
      invalid: t("common.invalidField"),
      descriptions: {
        automationEnabled: t("playbook.automationHelp"),
        automaticApolloEnabled: t("playbook.automaticApolloHelp"),
        dailyCompanyTarget: t("playbook.dailyCompanyTargetHelp"),
        linkedinAutomationEnabled: t("playbook.linkedinAutomationHelp"),
        linkedinAccountId: t("playbook.linkedinAccountHelp"),
        productCheckIntro: t("playbook.productCheckIntroHelp"),
        founderLine: t("playbook.founderLineHelp"),
        queryStyle: t("playbook.queryStyleHelp"),
        searchesPerLead: t("playbook.searchesPerLeadHelp"),
        discoveryFreshnessDays: t("playbook.discoveryFreshnessDaysHelp"),
        maxBodyWords: t("playbook.wordTargetHelp"),
        researchInstructions: t("playbook.researchInstructionsHelp"),
        requireShoppingEvidence: t("playbook.requireShoppingEvidenceHelp"),
        allowProductObservations: t("playbook.allowProductObservationsHelp"),
        senderEmails: t("playbook.senderPoolHelp"),
        inactiveSenderEmails: t("playbook.inactiveSenderHelp"),
        verificationDays: t("playbook.productVerificationHelp"),
        allowStaleEvidence: t("playbook.allowStaleEvidenceHelp"),
        trustSavedContactVerification: t(
          "playbook.trustSavedContactVerificationHelp",
        ),
        sendingRampEnabled: t("playbook.sendingRampHelp"),
        allowUsMarketWindow: t("playbook.allowUsMarketWindowHelp"),
        allowMicrosoftRecipients: t("playbook.allowMicrosoftRecipientsHelp"),
        emailVerificationDays: t("playbook.emailVerificationHelp"),
        excludedCompanies: t("playbook.excludedCompaniesHelp"),
        targetingNotes: t("playbook.targetingNotesHelp"),
        replyClaimNotes: t("playbook.replyClaimNotesHelp"),
        meetingBookingUrl: t("playbook.meetingBookingUrlHelp"),
        firstEmailBlockedClaims: t("playbook.firstEmailBlockedClaimsHelp"),
        sentEmailExamples: t("playbook.examplesHelp"),
        humanizeDrafts: t("playbook.humanizerHelp"),
        humanizerNotes: t("playbook.humanizerNotesHelp"),
        allowIncompleteHistory: t("playbook.allowIncompleteHistoryHelp"),
      },
      booleans: [
        "automationEnabled",
        "automaticApolloEnabled",
        "requireShoppingEvidence",
        "allowProductObservations",
        "allowStaleEvidence",
        "trustSavedContactVerification",
        "sendingRampEnabled",
        "allowUsMarketWindow",
        "allowMicrosoftRecipients",
        "linkedinAutomationEnabled",
        "senderConfirmed",
        "humanizeDrafts",
        "historyConfirmed",
        "allowIncompleteHistory",
        "competingSendersPaused",
        "senderTested",
        "sendingEnabled",
      ],
      choices: {
        linkedinAccountId: {
          "": t("playbook.linkedinAccountPlaceholder"),
          ...Object.fromEntries(
            linkedinAccounts.map((account) => [
              account.id,
              `${account.name} · ${t(`integrations.linkedin.status.${account.status}`)}`,
            ]),
          ),
          ...(value.linkedinAccountId &&
          !linkedinAccounts.some(
            (account) => account.id === value.linkedinAccountId,
          )
            ? {
                [value.linkedinAccountId]: t(
                  "playbook.linkedinAccountUnavailable",
                ),
              }
            : {}),
        },
      },
    },
  );
  const relevanceValidator: z.ZodString = z
    .string()
    .refine(
      (value) =>
        playbookSchema.shape.relevanceLines.safeParse(
          decodeRelevanceLines(value),
        ).success,
      { message: t("common.invalidField") },
    );
  const config = {
    ...baseConfig,
    relevanceLines: field({
      shape: "custom",
      Component: RelevanceLines,
      validator: relevanceValidator,
      label: labels.relevanceLines,
      description: t("playbook.relevanceLinesHelp"),
      classList: { field: "sm:col-span-2" },
    }),
  };
  return (
    <InferredForm
      key={`${revision}:${activeProposal?.version ?? 0}`}
      config={config}
      defaultValues={{
        ...(activeProposal?.values ?? value),
        relevanceLines: JSON.stringify(
          (activeProposal?.values ?? value).relevanceLines,
        ),
      }}
      renderFields={false}
      onChange={(values) => {
        currentValues.current = {
          revision,
          values: {
            ...value,
            ...values,
            relevanceLines:
              decodeRelevanceLines(values.relevanceLines) ??
              value.relevanceLines,
          },
        };
      }}
      onSubmit={(values) =>
        mutation.run(() =>
          Outbound.savePlaybook({
            settings: playbookSchema.parse({
              ...value,
              ...values,
              relevanceLines: decodeRelevanceLines(values.relevanceLines),
            }),
            expectedRevision: revision,
            expectedSenderPool: {
              senderEmails: value.senderEmails,
              inactiveSenderEmails: value.inactiveSenderEmails,
            },
          }),
        )
      }
    >
      <div className="flex flex-wrap items-center gap-3 border-accent-foreground border-b bg-background/60 px-4 py-3 sm:px-6">
        <span className="rounded-sm border border-accent-foreground bg-background-rich px-2 py-1 font-medium text-foreground text-xs tabular-nums">
          {t("common.revision", { version: revision })}
        </span>
        <p className="max-w-3xl text-foreground-dimmed text-sm leading-6">
          {t(
            value.automationEnabled
              ? "playbook.automaticChangeNote"
              : "playbook.changeNote",
          )}
        </p>
      </div>
      <section className="space-y-4 border-accent-foreground border-b px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-3xl space-y-1">
            <h2 className="font-semibold text-foreground-rich text-sm">
              {t("playbook.proposalTitle")}
            </h2>
            <p className="text-foreground-dimmed text-sm leading-relaxed">
              {t("playbook.proposalHelp")}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={mutation.pending}
            onClick={() => {
              const next = rebuildWritingProposal(
                currentValues.current.revision === revision
                  ? currentValues.current.values
                  : value,
              );
              currentValues.current = { revision, values: next };
              setProposal({
                values: next,
                version: (activeProposal?.version ?? 0) + 1,
                revision,
              });
            }}
          >
            {t("playbook.loadProposal")}
          </Button>
        </div>
        {activeProposal && (
          <p role="status" className="text-primary-text text-sm">
            {t("playbook.proposalLoaded")}
          </p>
        )}
        <Accordion>
          <AccordionItem value="iseld-reference" className="border-b-0">
            <AccordionTrigger className="text-sm">
              {t("playbook.iseldProposalTitle")}
            </AccordionTrigger>
            <AccordionPanel className="duration-200 motion-reduce:transition-none">
              <div className="max-w-3xl space-y-3 pb-4 text-sm leading-relaxed">
                <p className="text-foreground-dimmed">
                  {t("playbook.iseldProposalHelp")}
                </p>
                <p>
                  <span className="font-medium">{labels.founderLine}: </span>
                  {PROPOSED_REBUILD_PLAYBOOK.founderLine}
                </p>
                <p>
                  <span className="font-medium">
                    {labels.productCheckIntro}:{" "}
                  </span>
                  {PROPOSED_REBUILD_PLAYBOOK.productCheckIntro}
                </p>
              </div>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      </section>
      {groups
        .filter((group) => !("help" in group))
        .map((group) => {
          const Icon = group.icon;
          return (
            <section
              key={group.title}
              id={
                group.title === "researchTitle"
                  ? "research"
                  : group.title === "writingTitle"
                    ? "writing"
                    : group.title === "automationTitle"
                      ? "automation"
                      : group.title === "linkedinAutomationTitle"
                        ? "linkedin-automation"
                        : undefined
              }
              className="grid gap-6 border-accent-foreground border-b px-4 py-7 last-of-type:border-b-0 sm:px-6 xl:grid-cols-[15rem_minmax(0,1fr)]"
            >
              <div className="min-w-0">
                <h2 className="flex items-center gap-2.5 font-semibold text-base text-foreground-rich">
                  <Icon aria-hidden className="size-4 text-foreground-dimmed" />
                  {t(`playbook.${group.title}`)}
                </h2>
                {group.title === "writingTitle" && (
                  <div className="mt-4 space-y-3 text-sm leading-relaxed">
                    <p className="text-foreground-dimmed">
                      {t("playbook.writingHelp")}
                    </p>
                    <p className="font-medium text-foreground-rich">
                      {t("playbook.wordTargetHelp")}
                    </p>
                  </div>
                )}
                {group.title === "researchTitle" && (
                  <p className="mt-4 text-foreground-dimmed text-sm leading-relaxed">
                    {t("playbook.researchHelp")}
                  </p>
                )}
                {group.title === "linkedinAutomationTitle" && (
                  <p className="mt-4 text-foreground-dimmed text-sm leading-relaxed">
                    {t("playbook.linkedinCapsHelp")}
                  </p>
                )}
                {(group.title === "writingTitle" ||
                  group.title === "sequenceTitle") && (
                  <div className="mt-4 space-y-4">
                    <p className="text-foreground-dimmed text-sm leading-relaxed">
                      {t("playbook.templateHelp")}
                    </p>
                    <p className="text-foreground-dimmed text-xs">
                      {t("playbook.variablesTitle")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {TEMPLATE_VARIABLES.filter(
                        (variable) =>
                          ![
                            "productFeature",
                            "finding",
                            "consequence",
                            "askAbout",
                            "personalLine",
                          ].includes(variable),
                      ).map((variable) => (
                        <code
                          key={variable}
                          className="rounded-sm border border-accent-foreground bg-background px-1.5 py-0.5 text-foreground text-xs"
                        >{`{${variable}}`}</code>
                      ))}
                    </div>
                  </div>
                )}
                {group.title === "targetingTitle" && (
                  <p className="mt-4 text-foreground-dimmed text-sm leading-relaxed">
                    {t("playbook.legalHelp")}
                  </p>
                )}
                {group.title === "voiceTitle" && (
                  <p className="mt-4 text-foreground-dimmed text-sm leading-relaxed">
                    {t("playbook.senderHelp")}
                  </p>
                )}
                {group.title === "limitsTitle" && (
                  <p className="mt-4 text-foreground-dimmed text-sm leading-relaxed">
                    {t("playbook.capHelp")}{" "}
                    {t(
                      value.automationEnabled
                        ? "playbook.automaticSendingHelp"
                        : "playbook.sendingHelp",
                    )}
                  </p>
                )}
              </div>
              <div className="grid min-w-0 max-w-4xl gap-5 sm:grid-cols-2">
                {group.keys.map((key) => (
                  <InferredFormField key={key} name={key} {...config[key]} />
                ))}
              </div>
            </section>
          );
        })}
      <Accordion className="border-accent-foreground border-t">
        <AccordionItem value="legacy-findings" className="border-b-0">
          <AccordionTrigger className="items-center px-4 py-5 text-sm sm:px-6">
            {t("playbook.legacyFindingsTitle")}
          </AccordionTrigger>
          <AccordionPanel
            keepMounted
            className="duration-200 motion-reduce:transition-none"
          >
            <p className="max-w-4xl px-4 pb-5 text-foreground-dimmed text-sm leading-relaxed sm:px-6">
              {t("playbook.legacyFindingsHelp")}
            </p>
            {groups
              .filter((group) => "help" in group)
              .map((group) => (
                <section
                  key={group.title}
                  className="grid gap-6 border-accent-foreground border-t px-4 py-6 sm:px-6 xl:grid-cols-[15rem_minmax(0,1fr)]"
                >
                  <div className="min-w-0 space-y-4">
                    <h3 className="font-medium text-foreground-rich text-sm">
                      {t(`playbook.${group.title}`)}
                    </h3>
                    <p className="text-foreground-dimmed text-sm leading-relaxed">
                      {t(`playbook.${group.help}`)}
                    </p>
                    <p className="text-foreground-dimmed text-sm leading-relaxed">
                      {t("playbook.findingRulesHelp")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {["category", "reviewCount", "productFeature"].map(
                        (variable) => (
                          <code
                            key={variable}
                            className="rounded-sm border border-accent-foreground bg-background px-2 py-1 text-foreground text-xs"
                          >
                            {`{${variable}}`}
                          </code>
                        ),
                      )}
                    </div>
                  </div>
                  <div className="grid min-w-0 max-w-4xl gap-5 sm:grid-cols-2">
                    {group.keys.map((key) => (
                      <InferredFormField
                        key={key}
                        name={key}
                        {...config[key]}
                      />
                    ))}
                  </div>
                </section>
              ))}
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
      <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-4 border-accent-foreground border-t bg-background-rich/95 px-4 py-4 backdrop-blur-sm sm:px-6">
        <Submit pending={mutation.pending}>
          <CheckBadgeIcon aria-hidden className="size-4" />
          {t("playbook.action.primary")}
        </Submit>
        <Notice value={mutation.notice} />
      </div>
    </InferredForm>
  );
};
