"use client";
import { LoaderIcon } from "@zenncore/icons";
import { resultify } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import { field, InferredForm } from "@zenncore/web/components/inferred-form";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { useRouter } from "@/i18n/navigation";
import {
  CONVERSATION_STAGES,
  type ConversationDetail,
} from "@/lib/outbound-conversations";
import * as Conversations from "@/server/app/outbound/conversation-actions";
import { Environment } from "@/server/utils/environment";
import { Multiline, Notice } from "../../_components/common";
import { ConversationThreadSelector } from "./thread-selector";

const errorKey = (error: unknown) => {
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String(error.message)
      : "";
  switch (message) {
    case "conversation-changed":
      return "changed";
    case "conversation-closed":
    case "conversation-suppressed":
      return "closed";
    case "conversation-draft-stale":
    case "conversation-inbound-required":
    case "conversation-reply-not-needed":
      return "stale";
    case "conversation-send-unresolved":
      return "unresolved";
    case "conversation-message-truncated":
      return "truncated";
    case "conversation-generation-uncertain":
      return "generationUncertain";
    case "conversation-inbox-unavailable":
    case "conversation-account-unavailable":
      return "connection";
    case "conversation-draft-controls":
      return "controls";
    default:
      return "generic";
  }
};
export const ConversationEditor = ({
  detail,
}: {
  detail: ConversationDetail;
}) => {
  const t = useTranslations("outbound.conversations");
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(
    null,
  );
  const [requestId, setRequestId] = useState<string | null>(null);
  const running = useRef(false);
  const [unconfirmedSend, setUnconfirmedSend] = useState(false);
  const requestStorageKey = `outbound-conversation-reply:${detail.thread.id}`;
  const unresolved = detail.sendAttempts.some(
    (attempt) =>
      attempt.status === "starting" || attempt.status === "uncertain",
  );
  const closed = ["notInterested", "closed"].includes(detail.thread.stage);
  const locked = pending || unresolved || closed || unconfirmedSend;
  useEffect(() => {
    try {
      setRequestId(sessionStorage.getItem(requestStorageKey));
    } catch {
      /* Optional recovery hint. */
    }
  }, [requestStorageKey]);
  const run = async <Data,>(
    operation: () => Promise<{
      success: boolean;
      data?: Data;
      error?: unknown;
    }>,
    onSuccess: (data: Data) => void,
    failureMode: "generic" | "send" | "generate" = "generic",
  ) => {
    if (running.current) return;
    running.current = true;
    setPending(true);
    setNotice(null);
    const response = await resultify(operation);
    running.current = false;
    setPending(false);
    if (
      !response.success ||
      !response.data.success ||
      response.data.data === undefined
    ) {
      const unknownResponse =
        !response.success ||
        (response.data.success && response.data.data === undefined);
      if (unknownResponse && failureMode === "send") setUnconfirmedSend(true);
      setNotice({
        error: true,
        text: t(
          `error.${unknownResponse && failureMode === "send" ? "unresolved" : unknownResponse && failureMode === "generate" ? "generationUncertain" : errorKey(response.success ? response.data.error : response.error)}`,
        ),
      });
      return;
    }
    onSuccess(response.data.data);
  };
  const clearRequest = () => {
    setRequestId(null);
    try {
      sessionStorage.removeItem(requestStorageKey);
    } catch {
      /* Optional recovery hint. */
    }
  };
  const generate = () => {
    const identifier = requestId ?? crypto.randomUUID();
    setRequestId(identifier);
    try {
      sessionStorage.setItem(requestStorageKey, identifier);
    } catch {
      /* Server still fences the request. */
    }
    void run(
      () =>
        Conversations.generateConversationReply(Environment.CLIENT, {
          id: detail.thread.id,
          expectedRevision: detail.thread.revision,
          requestId: identifier,
        }),
      (result) => {
        clearRequest();
        if ("applied" in result && result.applied === false) {
          setNotice({ error: true, text: t("error.changed") });
          return;
        }
        router.refresh();
      },
      "generate",
    );
  };
  return (
    <div className="space-y-7">
      <ConversationThreadSelector
        selected={detail.thread}
        threads={detail.threads}
        disabled={dirty || pending}
      />
      <section className="space-y-3">
        <h2 className="font-heading font-medium text-foreground-rich text-lg">
          {t("outcomeTitle")}
        </h2>
        <InferredForm
          config={{
            stage: field({
              shape: "select",
              validator: z.enum(CONVERSATION_STAGES),
              label: t("columns.stage"),
              items: CONVERSATION_STAGES.map((value) => ({
                value,
                label: t(`stage.${value}`),
              })),
              disabled: pending,
            }),
          }}
          defaultValues={{ stage: detail.thread.stage }}
          onSubmit={({ stage }) => {
            void run(
              () =>
                Conversations.updateConversationStage(Environment.CLIENT, {
                  id: detail.thread.id,
                  stage,
                  expectedRevision: detail.thread.revision,
                }),
              () => router.refresh(),
            );
          }}
        >
          <Button
            type="submit"
            variant="soft"
            color="neutral"
            disabled={pending || dirty}
          >
            {t("outcome.action.primary")}
          </Button>
        </InferredForm>
        <p className="text-foreground-dimmed text-xs leading-5">
          {t("meetingHelp")}
        </p>
        {detail.meetingBookingUrl && (
          <Button
            variant="soft"
            color="neutral"
            render={
              <a
                href={detail.meetingBookingUrl}
                target="_blank"
                rel="noreferrer"
              />
            }
          >
            {t("booking.action.primary")}
          </Button>
        )}
      </section>
      <section className="space-y-3 border-accent-foreground border-t pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading font-medium text-foreground-rich text-lg">
            {t("replyTitle")}
          </h2>
          <Button
            variant="soft"
            color="neutral"
            disabled={locked || dirty || !detail.thread.needsReply}
            onClick={generate}
          >
            {pending && (
              <LoaderIcon aria-hidden className="size-4 animate-spin" />
            )}
            {t(requestId ? "recovery.action.primary" : "action.tertiary")}
          </Button>
        </div>
        <p className="text-foreground-dimmed text-xs leading-5">
          {t("replyHelp")}
        </p>
        {requestId && (
          <p role="status" className="text-foreground-dimmed text-xs leading-5">
            {t("recoveryHelp")}
          </p>
        )}
        {unresolved && (
          <Notice value={{ error: true, text: t("error.unresolved") }} />
        )}
        {closed && (
          <p className="text-foreground-dimmed text-sm">{t("error.closed")}</p>
        )}
        <InferredForm
          config={{
            body: field({
              shape: "custom",
              Component: Multiline,
              validator: z
                .string()
                .trim()
                .min(1, { error: t("invalidBody") })
                .max(10000, { error: t("invalidBody") }),
              label: t("draftLabel"),
            }),
          }}
          defaultValues={{ body: detail.draft.body }}
          onChange={({ body }) =>
            setDirty(body.trim() !== detail.draft.body.trim())
          }
          onSubmit={({ body }) => {
            void run(
              () =>
                Conversations.saveConversationReply(Environment.CLIENT, {
                  id: detail.thread.id,
                  body,
                  expectedRevision: detail.thread.revision,
                }),
              () => {
                clearRequest();
                router.refresh();
              },
            );
          }}
        >
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              variant="soft"
              color="neutral"
              disabled={locked || !dirty}
            >
              {t("action.secondary")}
            </Button>
            <Button
              type="button"
              disabled={locked || dirty || !detail.draft.body.trim()}
              onClick={() => {
                void run(
                  () =>
                    Conversations.sendConversationReply(Environment.CLIENT, {
                      id: detail.thread.id,
                      expectedRevision: detail.thread.revision,
                    }),
                  (result) => {
                    setNotice({
                      error: result.status !== "accepted",
                      text: t(`send.${result.status}`),
                    });
                    if (result.status === "uncertain") setUnconfirmedSend(true);
                    router.refresh();
                  },
                  "send",
                );
              }}
            >
              {t("action.primary")}
            </Button>
          </div>
          {dirty && (
            <p className="text-foreground-dimmed text-xs">{t("unsaved")}</p>
          )}
        </InferredForm>
        <Notice value={notice} />
      </section>
    </div>
  );
};
