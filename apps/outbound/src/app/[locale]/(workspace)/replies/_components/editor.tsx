"use client";
import { LoaderIcon } from "@zenncore/icons";
import { resultify } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import { field, InferredForm } from "@zenncore/web/components/inferred-form";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { z } from "zod";
import { Link, useRouter } from "@/i18n/navigation";
import {
  applyConversationSave,
  conversationEditorDirty,
  conversationEditorState,
  conversationErrorKey,
  conversationSaveReceipt,
  receiveConversation,
  settledConversationSend,
  type UnconfirmedConversationSend,
  unconfirmedConversationSend,
} from "@/lib/outbound-conversation-editor";
import {
  CONVERSATION_STAGES,
  type ConversationDetail,
} from "@/lib/outbound-conversations";
import * as Conversations from "@/server/app/outbound/conversation-actions";
import { Environment } from "@/server/utils/environment";
import { Multiline, Notice } from "../../_components/common";
import { ConversationThreadSelector } from "./thread-selector";

export const ConversationEditor = ({
  detail,
}: {
  detail: ConversationDetail;
}) => {
  const t = useTranslations("outbound.conversations");
  const router = useRouter();
  const [state, setState] = useState(() => conversationEditorState(detail));
  const [operation, setOperation] = useState<
    "stage" | "draft" | "send" | "generate" | "archive" | null
  >(null);
  const [refreshing, startRefresh] = useTransition();
  const dirty = conversationEditorDirty(state);
  const pending =
    operation !== null ||
    refreshing ||
    state.revision !== detail.thread.revision;
  const [stageNotice, setStageNotice] = useState<{
    error: boolean;
    text: string;
  } | null>(null);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(
    null,
  );
  const [requestId, setRequestId] = useState<string | null>(null);
  const [authenticationRequired, setAuthenticationRequired] = useState<
    "stage" | "reply" | null
  >(null);
  const running = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    setState((current) => receiveConversation(current, detail));
  }, [detail]);
  const refresh = () => startRefresh(() => router.refresh());
  const [unconfirmedSend, setUnconfirmedSend] =
    useState<UnconfirmedConversationSend | null>(null);
  useEffect(() => {
    const settled = settledConversationSend(unconfirmedSend, detail);
    if (!settled) return;
    setUnconfirmedSend(null);
    setNotice({
      error: settled.status !== "accepted",
      text: t(`send.${settled.status}`),
    });
  }, [detail, unconfirmedSend, t]);
  const requestStorageKey = `outbound-conversation-reply:${detail.thread.id}`;
  const unresolved = detail.sendAttempts.some(
    (attempt) =>
      attempt.status === "starting" || attempt.status === "uncertain",
  );
  const closed = ["notInterested", "closed"].includes(detail.thread.stage);
  const archived = Boolean(state.archivedAt);
  const locked =
    pending ||
    state.stale ||
    unresolved ||
    closed ||
    archived ||
    Boolean(unconfirmedSend);
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
    kind: "stage" | "draft" | "send" | "generate" | "archive",
  ) => {
    if (running.current || pending || state.stale) return;
    running.current = true;
    setOperation(kind);
    const report =
      kind === "stage" || kind === "archive" ? setStageNotice : setNotice;
    report(null);
    const response = await resultify(operation);
    running.current = false;
    if (!mounted.current) return;
    setOperation(null);
    if (
      !response.success ||
      !response.data.success ||
      response.data.data === undefined
    ) {
      const unknownResponse =
        !response.success ||
        (response.data.success && response.data.data === undefined);
      if (unknownResponse && kind === "send")
        setUnconfirmedSend(unconfirmedConversationSend(detail));
      const reason = conversationErrorKey(
        response.success ? response.data.error : response.error,
      );
      setAuthenticationRequired(
        reason === "authentication"
          ? kind === "stage" || kind === "archive"
            ? "stage"
            : "reply"
          : null,
      );
      if (reason === "changed") {
        setState((current) => ({ ...current, stale: true }));
        refresh();
      }
      report({
        error: true,
        text: t(
          `error.${unknownResponse && kind === "send" ? "unresolved" : unknownResponse && kind === "generate" ? "generationUncertain" : reason}`,
        ),
      });
      return;
    }
    setAuthenticationRequired(null);
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
          id: state.id,
          expectedRevision: state.revision,
          requestId: identifier,
        }),
      (result) => {
        clearRequest();
        if ("applied" in result && result.applied === false) {
          setNotice({ error: true, text: t("error.changed") });
          return;
        }
        refresh();
      },
      "generate",
    );
  };
  const signIn = (
    <Button
      variant="soft"
      color="neutral"
      render={
        <Link
          href={`/sign-in?redirect=${encodeURIComponent(`/replies/${detail.thread.prospectId}?thread=${state.id}`)}`}
          target="_blank"
          rel="noreferrer"
        />
      }
    >
      {t("editor.signIn")}
    </Button>
  );
  return (
    <div className="space-y-4">
      <ConversationThreadSelector
        selected={detail.thread}
        threads={detail.threads}
        disabled={dirty.body || dirty.stage || pending}
      />
      <section className="space-y-2">
        <Button
          variant="soft"
          color="neutral"
          disabled={
            pending ||
            state.stale ||
            dirty.body ||
            dirty.stage ||
            Boolean(unconfirmedSend)
          }
          onClick={() => {
            void run(
              () =>
                Conversations.archiveConversation(Environment.CLIENT, {
                  id: state.id,
                  archived: !archived,
                  expectedRevision: state.revision,
                }),
              (receipt) => {
                if (!conversationSaveReceipt(state, receipt)) {
                  setState((current) => ({ ...current, stale: true }));
                  setStageNotice({ error: true, text: t("error.changed") });
                } else {
                  setState((current) =>
                    applyConversationSave(current, receipt, {
                      archivedAt: receipt.archivedAt,
                    }),
                  );
                  setStageNotice({
                    error: false,
                    text: t(
                      receipt.archivedAt ? "archive.saved" : "archive.restored",
                    ),
                  });
                }
                refresh();
              },
              "archive",
            );
          }}
        >
          {operation === "archive" && (
            <LoaderIcon
              aria-hidden
              className="size-4 animate-spin motion-reduce:animate-none"
            />
          )}
          {t(archived ? "archive.restore" : "archive.action")}
        </Button>
        <p className="text-foreground-dimmed text-xs leading-5">
          {t(archived ? "archive.archivedHelp" : "archive.help")}
        </p>
      </section>
      {state.stale && (
        <div className="space-y-2">
          <p role="status" className="text-foreground-dimmed text-sm leading-5">
            {t("editor.changed")}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="soft"
              color="neutral"
              disabled={pending}
              onClick={() =>
                setState((current) => ({ ...current, stale: false }))
              }
            >
              {t("editor.continue")}
            </Button>
            <Button
              variant="soft"
              color="neutral"
              disabled={refreshing}
              onClick={refresh}
            >
              {t("action.quaternary")}
            </Button>
          </div>
        </div>
      )}
      {pending && !operation && (
        <p role="status" className="text-foreground-dimmed text-xs">
          {t("editor.refreshing")}
        </p>
      )}
      <section
        className="space-y-2"
        aria-busy={operation === "stage" || refreshing}
      >
        <h2 className="font-heading font-medium text-foreground-rich text-lg">
          {t("outcomeTitle")}
        </h2>
        <InferredForm
          key={`stage:${state.revision}`}
          config={{
            stage: field({
              shape: "select",
              validator: z.enum(CONVERSATION_STAGES),
              label: t("columns.stage"),
              items: CONVERSATION_STAGES.map((value) => ({
                value,
                label: t(`stage.${value}`),
              })),
              disabled: pending || state.stale || archived,
            }),
          }}
          defaultValues={{ stage: state.stage }}
          onChange={({ stage }) => {
            setState((current) => ({ ...current, stage }));
            setStageNotice(null);
          }}
          onSubmit={({ stage }) => {
            void run(
              () =>
                Conversations.updateConversationStage(Environment.CLIENT, {
                  id: state.id,
                  stage,
                  expectedRevision: state.revision,
                }),
              (receipt) => {
                if (!conversationSaveReceipt(state, receipt)) {
                  setState((current) => ({ ...current, stale: true }));
                  setStageNotice({ error: true, text: t("error.changed") });
                } else {
                  setState((current) =>
                    applyConversationSave(current, receipt, { stage }),
                  );
                  setStageNotice({
                    error: false,
                    text: t("editor.stageSaved"),
                  });
                }
                refresh();
              },
              "stage",
            );
          }}
        >
          <Button
            type="submit"
            variant="soft"
            color="neutral"
            disabled={pending || state.stale || archived || !dirty.stage}
          >
            {operation === "stage" && (
              <LoaderIcon
                aria-hidden
                className="size-4 animate-spin motion-reduce:animate-none"
              />
            )}
            {t(
              operation === "stage"
                ? "editor.savingStage"
                : "outcome.action.primary",
            )}
          </Button>
          <Notice value={stageNotice} />
          {authenticationRequired === "stage" && signIn}
        </InferredForm>
        {["meetingBooked", "meetingHeld"].includes(state.stage) && (
          <p className="text-foreground-dimmed text-xs leading-5">
            {t("meetingHelp")}
          </p>
        )}
        {["closed", "notInterested", "meetingBooked", "meetingHeld"].includes(
          state.stage,
        ) && (
          <p className="text-foreground-dimmed text-xs leading-5">
            {t("editor.followUpsPaused")}
          </p>
        )}
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
      <section className="space-y-2 border-accent-foreground border-t pt-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-heading font-medium text-foreground-rich text-lg">
            {t("replyTitle")}
          </h2>
          <Button
            variant="soft"
            color="neutral"
            disabled={
              locked || dirty.body || dirty.stage || !detail.thread.needsReply
            }
            onClick={generate}
          >
            {operation === "generate" && (
              <LoaderIcon
                aria-hidden
                className="size-4 animate-spin motion-reduce:animate-none"
              />
            )}
            {t(
              operation === "generate"
                ? "editor.generating"
                : requestId
                  ? "recovery.action.primary"
                  : "action.tertiary",
            )}
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
        {(unresolved || unconfirmedSend) && (
          <Button
            variant="soft"
            color="neutral"
            disabled={pending}
            onClick={refresh}
          >
            {t("action.quaternary")}
          </Button>
        )}
        {closed && (
          <p className="text-foreground-dimmed text-sm">{t("error.closed")}</p>
        )}
        <fieldset disabled={pending || archived} className="min-w-0">
          <InferredForm
            key={`draft:${state.revision}`}
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
            defaultValues={{ body: state.body }}
            onChange={({ body }) => {
              setState((current) => ({ ...current, body }));
              setNotice(null);
            }}
            onSubmit={({ body }) => {
              void run(
                () =>
                  Conversations.saveConversationReply(Environment.CLIENT, {
                    id: state.id,
                    body,
                    expectedRevision: state.revision,
                  }),
                (receipt) => {
                  if (!conversationSaveReceipt(state, receipt)) {
                    setState((current) => ({ ...current, stale: true }));
                    setNotice({ error: true, text: t("error.changed") });
                  } else {
                    setState((current) =>
                      applyConversationSave(current, receipt, { body }),
                    );
                    clearRequest();
                    setNotice({ error: false, text: t("editor.draftSaved") });
                  }
                  refresh();
                },
                "draft",
              );
            }}
          >
            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                variant="soft"
                color="neutral"
                disabled={locked || !dirty.body}
              >
                {operation === "draft" && (
                  <LoaderIcon
                    aria-hidden
                    className="size-4 animate-spin motion-reduce:animate-none"
                  />
                )}
                {t(
                  operation === "draft"
                    ? "editor.savingDraft"
                    : "action.secondary",
                )}
              </Button>
              <Button
                type="button"
                disabled={
                  locked || dirty.body || dirty.stage || !state.savedBody.trim()
                }
                onClick={() => {
                  void run(
                    () =>
                      Conversations.sendConversationReply(Environment.CLIENT, {
                        id: state.id,
                        expectedRevision: state.revision,
                      }),
                    (result) => {
                      setNotice({
                        error: result.status !== "accepted",
                        text: t(`send.${result.status}`),
                      });
                      if (result.status === "uncertain")
                        setUnconfirmedSend(
                          unconfirmedConversationSend(
                            detail,
                            result.id === state.id ? result.attempt : undefined,
                          ),
                        );
                      refresh();
                    },
                    "send",
                  );
                }}
              >
                {operation === "send" && (
                  <LoaderIcon
                    aria-hidden
                    className="size-4 animate-spin motion-reduce:animate-none"
                  />
                )}
                {t(operation === "send" ? "editor.sending" : "action.primary")}
              </Button>
            </div>
            {dirty.body && (
              <p className="text-foreground-dimmed text-xs">{t("unsaved")}</p>
            )}
          </InferredForm>
        </fieldset>
        <Notice value={notice} />
        {authenticationRequired === "reply" && signIn}
      </section>
    </div>
  );
};
