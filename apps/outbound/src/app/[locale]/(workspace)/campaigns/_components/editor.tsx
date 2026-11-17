"use client";

import { resultify } from "@zenncore/utils";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import { Button } from "@zenncore/web/components/button";
import { field, InferredForm } from "@zenncore/web/components/inferred-form";
import { useMessages, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { useRouter } from "@/i18n/navigation";
import { splitList } from "@/lib/outbound";
import {
  type Campaign,
  type CampaignCriteria,
  campaignCriteriaSchema,
  generateCampaignQuestionnaire,
  parseCampaignAnswers,
} from "@/lib/outbound-campaigns";
import * as Campaigns from "@/server/app/outbound/campaign-actions";
import { fields, Multiline, Notice } from "../../_components/common";
import { ClaudeDraftForm, type CriteriaPreview } from "./claude-draft";
import { campaignCriteriaFormValues } from "./criteria-values";

type CampaignNotice = { error: boolean; text: string };

export const useCampaignMutation = ({
  successMessage,
  feedbackVersion = 0,
}: {
  successMessage?: string | null;
  feedbackVersion?: number;
} = {}) => {
  const t = useTranslations("outbound.campaigns");
  const messages = useMessages();
  const router = useRouter();
  const running = useRef(false);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{
    value: CampaignNotice;
    version: number;
  } | null>(null);
  const setNotice = (value: CampaignNotice | null) =>
    setFeedback(value ? { value, version: feedbackVersion } : null);
  const run = async <Value,>(
    operation: () => Promise<{
      success: boolean;
      data?: Value;
      error?: unknown;
    }>,
    success?: (value: Value | undefined) => void,
  ) => {
    if (running.current) return;
    running.current = true;
    setPending(true);
    setNotice(null);
    const outcome = await resultify(operation);
    const error = outcome.success ? outcome.data.error : outcome.error;
    const message = z.object({ message: z.string() }).safeParse(error);
    if (!outcome.success || !outcome.data.success) {
      const errors = messages.outbound.campaigns.errors;
      const key = message.success ? message.data.message : "";
      setNotice({
        error: true,
        text: Object.hasOwn(errors, key)
          ? errors[key as keyof typeof errors]
          : t("actionError"),
      });
    } else {
      success?.(outcome.data.data);
      setNotice(
        successMessage === null
          ? null
          : { error: false, text: successMessage ?? t("saved") },
      );
      router.refresh();
    }
    running.current = false;
    setPending(false);
  };
  return {
    pending,
    notice: feedback?.version === feedbackVersion ? feedback.value : null,
    run,
    setNotice,
  };
};

export const CampaignCreate = () => {
  const t = useTranslations("outbound.campaigns");
  const common = useTranslations("outbound.common");
  const router = useRouter();
  const mutation = useCampaignMutation();
  return (
    <div className="max-w-2xl px-4 py-6 sm:px-6">
      <InferredForm
        config={{
          name: field({
            shape: "text",
            validator: z
              .string()
              .trim()
              .min(1, common("required"))
              .max(120, t("invalidCriteria")),
            label: t("name"),
          }),
        }}
        defaultValues={{ name: "" }}
        onSubmit={(values) =>
          mutation.run(
            () => Campaigns.createCampaign(values),
            (created) => {
              if (created) router.replace(`/campaigns/${created.id}`);
            },
          )
        }
        className="space-y-6"
      >
        <Button type="submit" disabled={mutation.pending}>
          {t(mutation.pending ? "saving" : "create.action.primary")}
        </Button>
        <Notice value={mutation.notice} />
      </InferredForm>
    </div>
  );
};

const numeric = [
  "teamSizeMin",
  "teamSizeMax",
  "annualRevenueMin",
  "annualRevenueMax",
] as const;
const lists = [
  "countries",
  "keywords",
  "excludedKeywords",
  "targetRoles",
  "excludedRoles",
  "excludedDomains",
] as const;
const keys = [
  "objective",
  "countries",
  "platforms",
  "keywords",
  "excludedKeywords",
  "teamSizeMin",
  "teamSizeMax",
  "annualRevenueMin",
  "annualRevenueMax",
  "targetRoles",
  "excludedRoles",
  "excludedDomains",
  "qualificationNotes",
] as const;
const CriteriaForm = ({
  campaign,
  criteria,
  answers,
  preview,
  onSaved,
  feedbackVersion,
  previewRevision,
  claudeGenerationId,
}: {
  campaign: Campaign;
  criteria: CampaignCriteria;
  answers: string;
  preview?: boolean;
  onSaved?: () => void;
  feedbackVersion: number;
  previewRevision?: number;
  claudeGenerationId?: string;
}) => {
  const t = useTranslations("outbound.campaigns");
  const messages = useMessages();
  const mutation = useCampaignMutation({ feedbackVersion });
  const config = fields(keys, messages.outbound.campaigns.fields, {
    multiline: [
      "objective",
      "qualificationNotes",
      "targetRoles",
      "excludedRoles",
      "excludedDomains",
    ],
    choices: {
      platforms: {
        "shopify,woocommerce": t("allPlatforms"),
        shopify: "Shopify",
        woocommerce: "WooCommerce",
      },
    },
    validators: Object.fromEntries(
      keys.map((key) => [
        key,
        numeric.includes(key as (typeof numeric)[number])
          ? z.string().regex(/^\d*$/).max(16)
          : z.string().max(key === "qualificationNotes" ? 10000 : 50000),
      ]),
    ),
    descriptions: {
      ...Object.fromEntries(lists.map((key) => [key, t("listHelp")])),
      ...Object.fromEntries(numeric.map((key) => [key, t("numberHelp")])),
      countries: t("countryHelp"),
      objective: t("objectiveHelp"),
      qualificationNotes: t("qualificationHelp"),
    },
    invalid: t("invalidCriteria"),
  });
  return (
    <InferredForm
      config={config}
      defaultValues={campaignCriteriaFormValues(criteria)}
      className="grid gap-6 sm:grid-cols-2"
      onSubmit={(values) => {
        if (
          previewRevision !== undefined &&
          previewRevision !== campaign.revision
        ) {
          mutation.setNotice({
            error: true,
            text: t("errors.campaign-criteria-changed"),
          });
          return;
        }
        const checked = campaignCriteriaSchema.safeParse({
          ...values,
          ...Object.fromEntries(
            lists.map((key) => [key, splitList(String(values[key]))]),
          ),
          ...Object.fromEntries(
            numeric.map((key) => [
              key,
              values[key] === "" ? null : Number(values[key]),
            ]),
          ),
          platforms: String(values.platforms).split(","),
        });
        if (!checked.success) {
          mutation.setNotice({ error: true, text: t("invalidCriteria") });
          return;
        }
        return mutation.run(
          () =>
            Campaigns.saveCampaignCriteria({
              id: campaign.id,
              expectedRevision: campaign.revision,
              criteria: checked.data,
              answers,
              ...(claudeGenerationId ? { claudeGenerationId } : {}),
            }),
          onSaved,
        );
      }}
    >
      <div className="space-y-4 sm:col-span-2">
        <Button
          type="submit"
          disabled={
            mutation.pending ||
            (previewRevision !== undefined &&
              previewRevision !== campaign.revision)
          }
        >
          {t(
            mutation.pending
              ? "saving"
              : preview
                ? "claude.action.tertiary"
                : "criteria.action.primary",
          )}
        </Button>
        <Notice value={mutation.notice} />
      </div>
    </InferredForm>
  );
};

export const CampaignSettings = ({
  campaign,
  feedbackVersion,
  onPreviewChange,
  claudeConfigured,
}: {
  campaign: Campaign;
  feedbackVersion: number;
  onPreviewChange: (hasPreview: boolean) => void;
  claudeConfigured: boolean | null;
}) => {
  const t = useTranslations("outbound.campaigns");
  const common = useTranslations("outbound.common");
  const [openSections, setOpenSections] = useState<string[]>([]);
  const mutation = useCampaignMutation({ feedbackVersion });
  const [preview, setPreview] = useState<CriteriaPreview | null>(null);
  const [generationPending, setGenerationPending] = useState(false);
  useEffect(
    () => onPreviewChange(preview !== null),
    [preview, onPreviewChange],
  );
  const [copyNotice, setCopyNotice] = useState<{
    error: boolean;
    text: string;
  } | null>(null);
  const [answerNotice, setAnswerNotice] = useState<{
    error: boolean;
    text: string;
  } | null>(null);
  const questionnaire = generateCampaignQuestionnaire(campaign);
  const showPreview = (nextPreview: CriteriaPreview) => {
    setPreview(nextPreview);
    setOpenSections((sections) =>
      sections.filter((section) => section !== "criteria"),
    );
  };
  return (
    <Accordion
      multiple
      value={openSections}
      onValueChange={(sections) =>
        setOpenSections(
          sections.filter(
            (section): section is string => typeof section === "string",
          ),
        )
      }
      className="border-accent-foreground border-b"
    >
      <AccordionItem value="settings" className="border-accent-foreground">
        <AccordionTrigger className="px-4 py-4 font-medium text-base sm:px-6">
          {t("metadataTitle")}
        </AccordionTrigger>
        <AccordionPanel
          keepMounted
          className="duration-200 motion-reduce:transition-none"
        >
          <div className="space-y-6 px-4 pb-6 sm:px-6">
            <p className="max-w-2xl text-foreground-dimmed text-sm leading-6">
              {t("metadataHelp")}
            </p>
            <InferredForm
              key={`${campaign.id}-${campaign.updatedAt}`}
              config={{
                name: field({
                  shape: "text",
                  validator: z
                    .string()
                    .trim()
                    .min(1, common("required"))
                    .max(120, t("invalidCriteria")),
                  label: t("name"),
                }),
                status: field({
                  shape: "select",
                  validator: z.enum(["draft", "active", "paused", "archived"]),
                  label: t("status"),
                  items: ["draft", "active", "paused", "archived"].map(
                    (status) => ({
                      value: status,
                      label: t(`statuses.${status as Campaign["status"]}`),
                    }),
                  ),
                }),
              }}
              defaultValues={{ name: campaign.name, status: campaign.status }}
              onSubmit={(values) =>
                mutation.run(() =>
                  Campaigns.updateCampaign({
                    id: campaign.id,
                    expectedRevision: campaign.revision,
                    name: values.name,
                    status: values.status,
                  }),
                )
              }
              className="grid max-w-3xl gap-6 sm:grid-cols-2"
            >
              <div className="space-y-4 sm:col-span-2">
                <Button type="submit" disabled={mutation.pending}>
                  {t(mutation.pending ? "saving" : "metadata.action.primary")}
                </Button>
                <Notice value={mutation.notice} />
              </div>
            </InferredForm>
          </div>
        </AccordionPanel>
      </AccordionItem>
      <AccordionItem value="claude" className="border-accent-foreground">
        <AccordionTrigger className="px-4 py-4 font-medium text-base sm:px-6">
          {t("claudeTitle")}
        </AccordionTrigger>
        <AccordionPanel
          keepMounted
          className="duration-200 motion-reduce:transition-none"
        >
          <div className="space-y-6 px-4 pb-6 sm:px-6">
            <ClaudeDraftForm
              campaign={campaign}
              configured={claudeConfigured}
              hasPreview={preview !== null}
              onGenerated={showPreview}
              onPendingChange={setGenerationPending}
            />
            <Accordion className="border-accent-foreground border-y">
              <AccordionItem value="manual" className="border-b-0">
                <AccordionTrigger className="py-4 text-sm">
                  {t("manualClaude")}
                </AccordionTrigger>
                <AccordionPanel keepMounted>
                  <div className="space-y-5 pb-6">
                    <p className="max-w-3xl text-foreground-dimmed text-sm leading-6">
                      {t("claudeHelp")}
                    </p>
                    <Button
                      variant="soft"
                      color="neutral"
                      onClick={async () => {
                        const copied = await resultify(() =>
                          navigator.clipboard.writeText(questionnaire),
                        );
                        setCopyNotice({
                          error: !copied.success,
                          text: t(
                            copied.success ? "questionsCopied" : "copyError",
                          ),
                        });
                      }}
                    >
                      {t("claude.action.primary")}
                    </Button>
                    <Notice value={copyNotice} />
                    <Accordion>
                      <AccordionItem value="questions" className="border-b-0">
                        <AccordionTrigger className="py-4 text-sm">
                          {t("viewQuestions")}
                        </AccordionTrigger>
                        <AccordionPanel keepMounted>
                          <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words pb-6 text-sm leading-6">
                            {questionnaire}
                          </pre>
                        </AccordionPanel>
                      </AccordionItem>
                    </Accordion>
                    <InferredForm
                      config={{
                        answers: field({
                          shape: "custom",
                          Component: Multiline,
                          validator: z
                            .string()
                            .trim()
                            .min(1, common("required"))
                            .max(50000, t("answerError")),
                          label: t("answerLabel"),
                          description: t("answerHelp"),
                        }),
                      }}
                      defaultValues={{ answers: campaign.answers }}
                      onSubmit={({ answers }) => {
                        if (generationPending) return;
                        const parsed = resultify(() =>
                          parseCampaignAnswers(answers),
                        );
                        if (!parsed.success) {
                          setAnswerNotice({
                            error: true,
                            text: t("answerError"),
                          });
                          return;
                        }
                        showPreview({
                          criteria: parsed.data,
                          answers,
                          revision: campaign.revision,
                        });
                        setAnswerNotice(null);
                      }}
                      className="space-y-4"
                    >
                      <Button
                        type="submit"
                        variant="soft"
                        color="neutral"
                        disabled={generationPending}
                      >
                        {t("claude.action.secondary")}
                      </Button>
                      <Notice value={answerNotice} />
                    </InferredForm>
                  </div>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
            {preview && (
              <div className="space-y-6 border-accent-foreground border-t pt-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="font-medium text-foreground-rich text-lg">
                      {t("previewTitle")}
                    </h3>
                    <p className="mt-1 text-foreground-dimmed text-sm">
                      {t(
                        preview.revision === campaign.revision
                          ? "previewHelp"
                          : "errors.campaign-criteria-changed",
                      )}
                    </p>
                  </div>
                  <Button
                    variant="soft"
                    color="neutral"
                    onClick={() => setPreview(null)}
                  >
                    {t("claude.action.quaternary")}
                  </Button>
                </div>
                <CriteriaForm
                  key={`${campaign.revision}-${JSON.stringify(preview.criteria)}`}
                  campaign={campaign}
                  criteria={preview.criteria}
                  answers={preview.answers}
                  preview
                  feedbackVersion={feedbackVersion}
                  previewRevision={preview.revision}
                  claudeGenerationId={preview.claudeGenerationId}
                  onSaved={() => setPreview(null)}
                />
              </div>
            )}
          </div>
        </AccordionPanel>
      </AccordionItem>
      <AccordionItem value="criteria" className="border-b-0">
        <AccordionTrigger className="px-4 py-4 font-medium text-base sm:px-6">
          {t("criteriaTitle")}
        </AccordionTrigger>
        <AccordionPanel
          keepMounted
          className="duration-200 motion-reduce:transition-none"
        >
          <div className="space-y-6 px-4 pb-6 sm:px-6">
            <p className="max-w-3xl text-foreground-dimmed text-sm leading-6">
              {t("criteriaHelp")}
            </p>
            <CriteriaForm
              key={`${campaign.id}-${campaign.revision}`}
              campaign={campaign}
              criteria={campaign.criteria}
              answers={campaign.answers}
              feedbackVersion={feedbackVersion}
            />
          </div>
        </AccordionPanel>
      </AccordionItem>
    </Accordion>
  );
};
