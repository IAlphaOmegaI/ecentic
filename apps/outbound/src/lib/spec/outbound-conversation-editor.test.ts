import { expect, test } from "bun:test";
import { resolve } from "node:path";
import {
  applyConversationSave,
  conversationEditorDirty,
  conversationEditorState,
  conversationErrorKey,
  conversationSaveReceipt,
  receiveConversation,
  settledConversationSend,
  unconfirmedConversationSend,
} from "../outbound-conversation-editor";
import {
  conversationHref,
  parseConversationQuery,
} from "../outbound-conversation-view";
import type { ConversationDetail } from "../outbound-conversations";

const detail = {
  thread: { id: "thread-a", revision: 2, stage: "open" },
  draft: { body: "Saved reply" },
} as ConversationDetail;

test("refresh keeps local edits and requires review of a new revision", () => {
  const state = {
    ...conversationEditorState(detail),
    body: "My reply",
    stage: "interested" as const,
  };
  const next = receiveConversation(state, {
    ...detail,
    thread: { ...detail.thread, revision: 3, stage: "question" },
    draft: { ...detail.draft, body: "New server draft" },
  });
  expect(next).toMatchObject({
    body: "My reply",
    savedBody: "New server draft",
    stage: "interested",
    savedStage: "question",
    revision: 3,
    stale: true,
  });
  expect(conversationEditorDirty(next)).toEqual({ body: true, stage: true });
});

test("own stage save preserves reply edits without confusing it with an external update", () => {
  const state = { ...conversationEditorState(detail), body: "My reply" };
  const saved = applyConversationSave(
    state,
    { id: state.id, revision: 3 },
    { stage: "meetingBooked" },
  );
  const refreshed = receiveConversation(saved, {
    ...detail,
    thread: { ...detail.thread, stage: "meetingBooked", revision: 3 },
  });
  expect(refreshed).toMatchObject({
    body: "My reply",
    stage: "meetingBooked",
    stale: false,
  });
  expect(conversationEditorDirty(refreshed)).toEqual({
    body: true,
    stage: false,
  });
});

test("only a newer receipt for the current real thread can mark edits saved", () => {
  const state = conversationEditorState(detail);
  expect(conversationSaveReceipt(state, { id: "thread-b", revision: 3 })).toBe(
    false,
  );
  expect(conversationSaveReceipt(state, { id: state.id, revision: 2 })).toBe(
    false,
  );
  expect(
    conversationSaveReceipt(state, { id: state.id, revision: Number.NaN }),
  ).toBe(false);
  expect(
    applyConversationSave(
      state,
      { id: "thread-b", revision: 3 },
      { body: "Wrong reply" },
    ),
  ).toMatchObject({ body: "Saved reply", stale: true });
});

test("changing threads resets local identity and content; old refreshes do not roll back a save", () => {
  const state = {
    ...conversationEditorState(detail),
    body: "My reply",
    revision: 4,
    stale: true,
  };
  expect(receiveConversation(state, detail)).toEqual(state);
  expect(
    receiveConversation(state, {
      ...detail,
      thread: { ...detail.thread, id: "thread-b" },
    }),
  ).toMatchObject({ id: "thread-b", body: "Saved reply", stale: false });
});

test("serialized server conflicts map to repair copy without exposing provider errors", () => {
  expect(
    conversationErrorKey({
      name: "conflict-error",
      message: "conversation-changed",
    }),
  ).toBe("changed");
  expect(
    conversationErrorKey({ message: "conversation-send-unresolved" }),
  ).toBe("unresolved");
  expect(conversationErrorKey({ message: "database secret" })).toBe("generic");
  expect(
    conversationErrorKey({
      name: "unauthenticated-error",
      message: "Unauthenticated",
    }),
  ).toBe("authentication");
});

test("an uncertain send unlocks only for an unambiguous matching settled receipt", () => {
  const baseline = {
    ...detail,
    thread: { ...detail.thread, updatedAt: "2026-11-19T12:00:00.000Z" },
    sendAttempts: [],
  };
  const pending = unconfirmedConversationSend(baseline);
  const receipt = {
    id: "new-attempt",
    status: "accepted" as const,
    body: baseline.draft.body,
    createdAt: "2026-11-19T12:01:00.000Z",
    error: null,
  };
  const refreshed = {
    ...baseline,
    thread: { ...baseline.thread, revision: 3 },
    sendAttempts: [receipt],
  };
  expect(settledConversationSend(pending, baseline)).toBeNull();
  expect(settledConversationSend(pending, refreshed)?.status).toBe("accepted");
  expect(
    settledConversationSend(pending, {
      ...refreshed,
      sendAttempts: [{ ...receipt, body: "Different draft" }],
    }),
  ).toBeNull();
  expect(
    settledConversationSend(pending, {
      ...refreshed,
      sendAttempts: [{ ...receipt, createdAt: "2026-11-18T12:00:00.000Z" }],
    }),
  ).toBeNull();
  expect(
    settledConversationSend(
      { ...pending, priorAttemptIds: [receipt.id] },
      refreshed,
    ),
  ).toBeNull();
  expect(
    settledConversationSend(
      { ...pending, attemptId: "other-attempt" },
      refreshed,
    ),
  ).toBeNull();
  expect(
    settledConversationSend(pending, {
      ...refreshed,
      sendAttempts: [
        receipt,
        { ...receipt, id: "unresolved", status: "uncertain" },
      ],
    }),
  ).toBeNull();
  expect(
    settledConversationSend(pending, {
      ...refreshed,
      sendAttempts: [receipt, { ...receipt, id: "ambiguous" }],
    }),
  ).toBeNull();
  expect(
    settledConversationSend(
      { ...pending, attemptId: receipt.id },
      { ...baseline, sendAttempts: [{ ...receipt, status: "failed" }] },
    )?.status,
  ).toBe("failed");
});

test("real conversation controls save, retain failed edits and survive refreshed revisions", async () => {
  const execution = Bun.spawn(
    [
      process.execPath,
      "--no-env-file",
      "run",
      resolve(
        import.meta.dir,
        "fixtures/outbound-conversation-editor.fixture.tsx",
      ),
    ],
    {
      env: {
        ...process.env,
        DATABASE_URL: "postgres://fixture:fixture@127.0.0.1:1/never_connect",
      },
      stdout: "pipe",
      stderr: "pipe",
    },
  );
  const [status, output, error] = await Promise.all([
    execution.exited,
    new Response(execution.stdout).text(),
    new Response(execution.stderr).text(),
  ]);
  expect(error).toBe("");
  expect(status).toBe(0);
  expect(output).toContain("Conversation editor DOM contracts passed");
}, 30000);

test("archive state changes preserve saved content and refresh into the correct visibility", () => {
  const state = conversationEditorState(detail);
  const next = applyConversationSave(
    state,
    { id: state.id, revision: 3 },
    { archivedAt: "2026-11-26T14:00:00.000Z" },
  );
  expect(next).toMatchObject({
    archivedAt: "2026-11-26T14:00:00.000Z",
    savedBody: state.savedBody,
    savedStage: state.savedStage,
  });
  expect(conversationErrorKey({ message: "conversation-archived" })).toBe(
    "archived",
  );
});

test("archived navigation preserves archive mode across searches and pagination", () => {
  const query = parseConversationQuery({
    view: "archived",
    q: "Saved",
    page: "2",
  });
  expect(query.archived).toBe(true);
  expect(conversationHref(query)).toBe("/replies?view=archived&q=Saved&page=2");
  expect(parseConversationQuery({}).archived).toBe(false);
});
