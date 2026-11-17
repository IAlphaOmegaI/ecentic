"use client";

import { resultify } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import { field, InferredForm } from "@zenncore/web/components/inferred-form";
import { useMessages, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Link } from "@/i18n/navigation";
import type { Campaign, CampaignCriteria } from "@/lib/outbound-campaigns";
import * as Claude from "@/server/app/outbound/claude-actions";
import { Multiline, Notice } from "../../_components/common";
import {
  readClaudeRequestId,
  writeClaudeRequestId,
} from "./claude-request-storage";

export type CriteriaPreview = {
  criteria: CampaignCriteria;
  answers: string;
  revision: number;
  claudeGenerationId?: string;
};

export const ClaudeDraftForm = ({
  campaign,
  configured,
  hasPreview,
  onGenerated,
  onPendingChange,
}: {
  campaign: Campaign;
  configured: boolean | null;
  hasPreview: boolean;
  onGenerated: (preview: CriteriaPreview) => void;
  onPendingChange: (pending: boolean) => void;
}) => {
  const t = useTranslations("outbound.claude");
  const messages = useMessages();
  const running = useRef(false);
  const [phase, setPhase] = useState<"generating" | "recovering" | null>(null);
  const pending = phase !== null;
  const [recovery, setRecovery] = useState<{
    campaignId: string;
    requestId: string | null;
  } | null>(null);
  const recoveryReady = recovery?.campaignId === campaign.id;
  const requestId = recoveryReady ? recovery.requestId : null;
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(
    null,
  );
  useEffect(() => {
    const stored = readClaudeRequestId(campaign.id);
    setRecovery({
      campaignId: campaign.id,
      requestId: stored.success ? stored.data : null,
    });
    if (!stored.success)
      setNotice({ error: true, text: t("storageUnavailable") });
  }, [campaign.id, t]);
  const run = async (
    operation: () => ReturnType<typeof Claude.generate>,
    action: "generating" | "recovering",
  ) => {
    if (running.current) return;
    running.current = true;
    onPendingChange(true);
    setPhase(action);
    setNotice(null);
    const result = await resultify(operation);
    if (!result.success || !result.data.success) {
      const error = !result.success
        ? result.error
        : !result.data.success
          ? result.data.error
          : null;
      const parsed = z.object({ message: z.string() }).safeParse(error);
      const errors = messages.outbound.claude.errors;
      setNotice({
        error: true,
        text:
          parsed.success && Object.hasOwn(errors, parsed.data.message)
            ? errors[parsed.data.message as keyof typeof errors]
            : t("generationError"),
      });
    } else {
      const generated = result.data.data;
      if (generated.stale || generated.campaignRevision !== campaign.revision) {
        setNotice({ error: true, text: t("stalePreview") });
      } else {
        onGenerated({
          criteria: generated.criteria,
          answers: generated.answers,
          revision: generated.campaignRevision,
          claudeGenerationId: generated.requestId,
        });
        setNotice({ error: false, text: t("previewReady") });
      }
    }
    running.current = false;
    onPendingChange(false);
    setPhase(null);
  };
  return (
    <div className="min-w-0 space-y-4">
      <p className="max-w-3xl text-foreground-dimmed text-sm leading-6">
        {t("generationHelp")}
      </p>
      {configured !== true && (
        <div className="space-y-3">
          <p className="text-foreground-dimmed text-sm">
            {t(configured === null ? "unknown" : "connectHelp")}
          </p>
          <Button
            variant="soft"
            color="neutral"
            render={<Link href="/integrations#claude" />}
          >
            {t("generation.action.quaternary")}
          </Button>
        </div>
      )}
      <InferredForm
        config={{
          context: field({
            shape: "custom",
            Component: Multiline,
            validator: z.string().trim().max(50000, t("contextInvalid")),
            label: t("contextLabel"),
            description: t("contextHelp"),
          }),
        }}
        defaultValues={{ context: "" }}
        className="max-w-4xl space-y-4"
        onSubmit={({ context }) => {
          if (
            running.current ||
            hasPreview ||
            configured !== true ||
            !recoveryReady
          )
            return;
          const nextRequestId = crypto.randomUUID();
          const remembered = writeClaudeRequestId(campaign.id, nextRequestId);
          if (!remembered.success) {
            setNotice({ error: true, text: t("storageUnavailable") });
            return;
          }
          setRecovery({ campaignId: campaign.id, requestId: nextRequestId });
          return run(
            () =>
              Claude.generate({
                campaignId: campaign.id,
                expectedRevision: campaign.revision,
                context,
                requestId: nextRequestId,
              }),
            "generating",
          );
        }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            disabled={
              pending || hasPreview || configured !== true || !recoveryReady
            }
          >
            {t(
              phase === "generating"
                ? "generating"
                : requestId
                  ? "generation.action.tertiary"
                  : "generation.action.primary",
            )}
          </Button>
          {requestId && (
            <Button
              type="button"
              variant="soft"
              color="neutral"
              disabled={pending || hasPreview}
              onClick={() =>
                run(() => Claude.getGeneration({ requestId }), "recovering")
              }
            >
              {t(
                phase === "recovering"
                  ? "recovering"
                  : "generation.action.secondary",
              )}
            </Button>
          )}
        </div>
        {hasPreview && (
          <p className="text-foreground-dimmed text-sm">
            {t("previewPending")}
          </p>
        )}
        {requestId && !pending && (
          <p className="max-w-3xl text-foreground-dimmed text-sm leading-6">
            {t("recoveryHelp")}
          </p>
        )}
        <Notice value={notice} />
      </InferredForm>
    </div>
  );
};
