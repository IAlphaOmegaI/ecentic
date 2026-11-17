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
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import {
  InferredForm,
  InferredFormField,
} from "@zenncore/web/components/inferred-form";
import { useMessages, useTranslations } from "next-intl";
import {
  type Playbook,
  playbookSchema,
  TEMPLATE_VARIABLES,
} from "@/lib/outbound";
import type { LinkedInAccount } from "@/lib/outbound-unipile";
import * as Outbound from "@/server/app/outbound";
import { fields, Notice, Submit, useMutation } from "./common";

const groups = [
  {
    title: "automationTitle",
    icon: GaugeIcon,
    keys: ["automationEnabled"],
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
      "founderLine",
      "postalAddress",
      "optout",
      "senderConfirmed",
    ],
  },
  {
    title: "researchTitle",
    icon: FileSearchIcon,
    keys: ["researchInstructions", "requireShoppingEvidence"],
  },
  {
    title: "writingTitle",
    icon: BookIcon,
    keys: [
      "subjectTemplate",
      "bodyTemplate",
      "callToAction",
      "voiceNotes",
      "productCheckIntro",
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
    keys: [
      "followupOneTemplate",
      "followupTwoTemplate",
      "linkedinTemplate",
      "followupOneDays",
      "followupTwoDays",
    ],
  },
  {
    title: "targetingTitle",
    icon: BullseyeIcon,
    keys: [
      "allowedCountries",
      "heldCountries",
      "targetRoles",
      "excludedRoles",
      "excludedDomains",
      "excludedCompanies",
      "targetingNotes",
      "verificationDays",
      "emailVerificationDays",
    ],
  },
  {
    title: "limitsTitle",
    icon: GaugeIcon,
    keys: [
      "weeklyTarget",
      "dailyCap",
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
  const config = fields(
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
        "maxBodyWords",
        "followupOneDays",
        "followupTwoDays",
        "verificationDays",
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
        linkedinAutomationEnabled: t("playbook.linkedinAutomationHelp"),
        linkedinAccountId: t("playbook.linkedinAccountHelp"),
        productCheckIntro: t("playbook.productCheckIntroHelp"),
        researchInstructions: t("playbook.researchInstructionsHelp"),
        requireShoppingEvidence: t("playbook.requireShoppingEvidenceHelp"),
        senderEmails: t("playbook.senderPoolHelp"),
        inactiveSenderEmails: t("playbook.inactiveSenderHelp"),
        verificationDays: t("playbook.productVerificationHelp"),
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
        "requireShoppingEvidence",
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
  return (
    <InferredForm
      key={revision}
      config={config}
      defaultValues={value}
      renderFields={false}
      onSubmit={(values) =>
        mutation.run(() => Outbound.savePlaybook(playbookSchema.parse(values)))
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
                  <p className="mt-4 text-foreground-dimmed text-sm leading-relaxed">
                    {t("playbook.writingHelp")}
                  </p>
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
                      {TEMPLATE_VARIABLES.map((variable) => (
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
