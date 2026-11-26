import type {
  ConversationDetail,
  ConversationStage,
} from "./outbound-conversations";

export const conversationEditorState = (detail: ConversationDetail) => ({
  id: detail.thread.id,
  revision: detail.thread.revision,
  stage: detail.thread.stage,
  savedStage: detail.thread.stage,
  archivedAt: detail.thread.archivedAt,
  body: detail.draft.body,
  savedBody: detail.draft.body,
  stale: false,
});
export type ConversationEditorState = ReturnType<
  typeof conversationEditorState
>;

export type UnconfirmedConversationSend = {
  threadId: string;
  revision: number;
  body: string;
  after: string;
  priorAttemptIds: string[];
  attemptId?: string;
};

export const unconfirmedConversationSend = (
  detail: ConversationDetail,
  attemptId?: string,
): UnconfirmedConversationSend => ({
  threadId: detail.thread.id,
  revision: detail.thread.revision,
  body: detail.draft.body,
  after: detail.thread.updatedAt,
  priorAttemptIds: detail.sendAttempts.map((attempt) => attempt.id),
  ...(attemptId ? { attemptId } : {}),
});

/** A refresh is not proof of delivery; reconcile only a matching recorded attempt. */
export const settledConversationSend = (
  pending: UnconfirmedConversationSend | null,
  detail: ConversationDetail,
) => {
  if (!pending || pending.threadId !== detail.thread.id) return null;
  if (
    detail.sendAttempts.some((attempt) =>
      ["starting", "uncertain"].includes(attempt.status),
    )
  )
    return null;
  const matches = detail.sendAttempts.filter(
    (attempt) =>
      (attempt.status === "accepted" || attempt.status === "failed") &&
      attempt.body === pending.body &&
      (pending.attemptId
        ? attempt.id === pending.attemptId
        : !pending.priorAttemptIds.includes(attempt.id) &&
          Date.parse(attempt.createdAt) >= Date.parse(pending.after)) &&
      (attempt.status !== "accepted" ||
        detail.thread.revision > pending.revision),
  );
  return matches.length === 1 ? matches[0] : null;
};

export const conversationEditorDirty = (state: ConversationEditorState) => ({
  stage: state.stage !== state.savedStage,
  body: state.body.trim() !== state.savedBody.trim(),
});

/** A refresh can update the timeline without throwing away staff edits. */
export const receiveConversation = (
  state: ConversationEditorState,
  detail: ConversationDetail,
) => {
  const next = conversationEditorState(detail);
  if (next.id !== state.id) return next;
  if (next.revision <= state.revision) return state;
  const dirty = conversationEditorDirty(state);
  return {
    ...next,
    stage: dirty.stage ? state.stage : next.stage,
    body: dirty.body ? state.body : next.body,
    stale: state.stale || dirty.stage || dirty.body,
  };
};

/** Ignore a stale or misbound acknowledgement rather than marking another thread saved. */
export const conversationSaveReceipt = (
  state: ConversationEditorState,
  receipt: { id: string; revision: number },
) =>
  receipt.id === state.id &&
  Number.isSafeInteger(receipt.revision) &&
  receipt.revision > state.revision;

export const applyConversationSave = (
  state: ConversationEditorState,
  receipt: { id: string; revision: number },
  change:
    | { stage: ConversationStage }
    | { body: string }
    | { archivedAt: string | null },
): ConversationEditorState => {
  if (!conversationSaveReceipt(state, receipt))
    return { ...state, stale: true };
  return {
    ...state,
    revision: receipt.revision,
    stale: false,
    ...("stage" in change
      ? { stage: change.stage, savedStage: change.stage }
      : "archivedAt" in change
        ? { archivedAt: change.archivedAt }
        : { body: change.body.trim(), savedBody: change.body.trim() }),
  };
};

export const conversationErrorKey = (error: unknown) => {
  const name =
    typeof error === "object" && error !== null && "name" in error
      ? String(error.name)
      : "";
  if (name === "unauthenticated-error") return "authentication";
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String(error.message)
      : "";
  switch (message) {
    case "conversation-changed":
    case "conversation-request-mismatch":
      return "changed";
    case "conversation-archived":
      return "archived";
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
