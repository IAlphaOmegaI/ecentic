import { mock } from "bun:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import messages from "../../../../messages/en.json";
import type {
  ConversationDetail,
  ConversationStage,
} from "../../outbound-conversations";

const browser = new JSDOM(
  "<!doctype html><html><body><div id='root'></div></body></html>",
  { url: "http://localhost/", pretendToBeVisual: true },
);
const window = browser.window as unknown as Window & typeof globalThis;
for (const name of [
  "window",
  "document",
  "navigator",
  "HTMLElement",
  "Element",
  "Node",
  "HTMLInputElement",
  "HTMLTextAreaElement",
  "HTMLButtonElement",
  "MutationObserver",
  "Event",
  "MouseEvent",
  "KeyboardEvent",
  "FocusEvent",
  "CustomEvent",
  "sessionStorage",
  "getComputedStyle",
] as const) {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    writable: true,
    value: name === "window" ? window : window[name],
  });
}
Object.assign(globalThis, {
  IS_REACT_ACT_ENVIRONMENT: true,
  requestAnimationFrame: window.requestAnimationFrame.bind(window),
  cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
});
window.matchMedia = (query) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener() {},
  removeListener() {},
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent: () => true,
});
Object.assign(globalThis, {
  ResizeObserver: class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
});
window.HTMLElement.prototype.scrollIntoView = () => {};
globalThis.fetch = Object.assign(
  async () => {
    throw new Error("Live requests forbidden in editor tests");
  },
  { preconnect: () => {} },
);

const calls: {
  environment: unknown;
  input: {
    id: string;
    expectedRevision: number;
    stage?: ConversationStage;
    body?: string;
  };
}[] = [];
const response = {
  handler: async (_input: unknown): Promise<unknown> => ({
    success: true,
    data: { id: "11111111-1111-4111-8111-111111111111", revision: 3 },
  }),
};
const action = async (
  environment: unknown,
  input: (typeof calls)[number]["input"],
) => {
  calls.push({ environment, input });
  return response.handler(input);
};
const navigation = { refreshes: 0, sends: 0 };
const sending = {
  handler: async (): Promise<unknown> => {
    throw new Error("Simulated lost send response");
  },
};
mock.module("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children?: import("react").ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({
    refresh: () => {
      navigation.refreshes += 1;
    },
    push: () => {},
  }),
}));
mock.module("@/server/app/outbound/conversation-actions", () => ({
  updateConversationStage: action,
  saveConversationReply: action,
  generateConversationReply: async () => {
    throw new Error("Unexpected generation");
  },
  sendConversationReply: async () => {
    navigation.sends += 1;
    return sending.handler();
  },
}));
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { NextIntlClientProvider } = await import("next-intl");
const { ConversationEditor } = await import(
  "@/app/[locale]/(workspace)/replies/_components/editor"
);
const { Environment } = await import("@/server/utils/environment");
const host = document.getElementById("root");
assert(host);
const root = createRoot(host);
const thread: ConversationDetail["thread"] = {
  id: "11111111-1111-4111-8111-111111111111",
  prospectId: "22222222-2222-4222-8222-222222222222",
  revision: 2,
  stage: "open",
  company: "Example",
  person: "Ada",
  channel: "email",
  subject: "Hello",
  accountLabel: "sender@example.com",
  counterpart: "ada@example.com",
  needsReply: true,
  lastInboundAt: "2026-11-19T12:00:00.000Z",
  lastOutboundAt: null,
  updatedAt: "2026-11-19T12:00:00.000Z",
};
const detail: ConversationDetail = {
  thread,
  threads: [thread],
  meetingBookingUrl: "",
  messages: [],
  total: 0,
  page: 1,
  pageSize: 50,
  draft: {
    body: "Saved reply",
    generatedAt: null,
    basedOnMessageId: "inbound-1",
  },
  sendAttempts: [],
};
const render = async (value: ConversationDetail) =>
  act(async () => {
    root.render(
      <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
        <ConversationEditor key={value.thread.id} detail={value} />
      </NextIntlClientProvider>,
    );
  });
const click = async (element: Element) =>
  act(async () => {
    element.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  });
const button = (text: string) => {
  const found = Array.from(host.querySelectorAll("button")).find(
    (element) => element.textContent?.trim() === text,
  );
  assert(found, `Missing button: ${text}`);
  return found;
};
const choose = async (label: string) => {
  const trigger = host.querySelector("form [role='combobox']");
  assert(trigger, "Actual InferredForm stage select is rendered");
  await click(trigger);
  const option = Array.from(document.querySelectorAll("[role='option']")).find(
    (element) => element.textContent?.trim() === label,
  );
  assert(option, `Missing option: ${label}`);
  await act(async () => {
    option.dispatchEvent(
      new window.PointerEvent("pointerdown", {
        bubbles: true,
        pointerType: "mouse",
        button: 0,
      }),
    );
    option.dispatchEvent(
      new window.PointerEvent("pointerup", {
        bubbles: true,
        pointerType: "mouse",
        button: 0,
      }),
    );
    option.dispatchEvent(
      new window.MouseEvent("click", { bubbles: true, detail: 1 }),
    );
  });
};
const changeBody = async (value: string) =>
  act(async () => {
    const textarea = host.querySelector("textarea");
    assert(textarea);
    Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      "value",
    )?.set?.call(textarea, value);
    textarea.dispatchEvent(new window.Event("input", { bubbles: true }));
  });

const deferred: { resolve?: (value: unknown) => void } = {};
response.handler = () =>
  new Promise((resolve) => {
    deferred.resolve = resolve;
  });
await render(detail);
await choose("Meeting booked");
assert.equal(button("Save stage").disabled, false);
await click(button("Save stage"));
assert(button("Saving stage…").disabled, "A pending save disables its control");
await click(button("Saving stage…"));
assert.equal(calls.length, 1, "Double clicks make only one request");
await act(async () =>
  deferred.resolve?.({ success: true, data: { id: thread.id, revision: 3 } }),
);
assert.deepEqual(calls[0], {
  environment: Environment.CLIENT,
  input: { id: thread.id, expectedRevision: 2, stage: "meetingBooked" },
});
assert(host.textContent?.includes("Stage saved."));
assert.equal(
  button("Save stage").disabled,
  true,
  "Controls stay disabled until refreshed revision arrives",
);
await render({
  ...detail,
  thread: { ...thread, revision: 3, stage: "meetingBooked" },
});
assert.equal(
  host.querySelector("form [role='combobox']")?.textContent?.trim(),
  "Meeting booked",
);
assert(host.textContent?.includes("Stage saved."));

response.handler = async () => ({
  success: false,
  error: { name: "validation-error", message: "fixture-failure" },
});
await choose("Has a question");
await click(button("Save stage"));
assert.equal(calls[1]?.input.expectedRevision, 3);
assert.equal(
  host.querySelector("form [role='combobox']")?.textContent?.trim(),
  "Has a question",
  "Failed selection survives",
);
assert(
  host
    .querySelector("form [role='alert']")
    ?.textContent?.includes("We could not complete"),
  "Stage feedback is next to its form",
);
assert.equal(button("Save stage").disabled, false);

response.handler = async () => ({
  success: false,
  error: { name: "unauthenticated-error", message: "Unauthenticated" },
});
await click(button("Save stage"));
assert(
  host
    .querySelector("form [role='alert']")
    ?.textContent?.includes("session expired"),
);
const signIn = Array.from(host.querySelectorAll("a")).find(
  (element) => element.textContent === "Sign in again",
);
assert.equal(
  signIn?.target,
  "_blank",
  "Signing in keeps the original editor open",
);
assert(signIn?.href.includes(encodeURIComponent(thread.id)));
await changeBody("My unsaved reply");
await render({
  ...detail,
  thread: { ...thread, revision: 4, stage: "interested" },
  draft: { ...detail.draft, body: "New server reply" },
});
assert.equal(
  host.querySelector("textarea")?.value,
  "My unsaved reply",
  "Same-thread refresh retains edited reply",
);
assert.equal(
  host.querySelector("form [role='combobox']")?.textContent?.trim(),
  "Has a question",
);
assert.equal(
  button("Save draft").disabled,
  true,
  "New inbound revision requires review",
);
await click(button("Continue with my edits"));
response.handler = async () => ({
  success: true,
  data: { id: thread.id, revision: 5 },
});
await click(button("Save draft"));
assert.deepEqual(calls.at(-1)?.input, {
  id: thread.id,
  expectedRevision: 4,
  body: "My unsaved reply",
});
await render({
  ...detail,
  thread: { ...thread, revision: 5, stage: "interested" },
  draft: { ...detail.draft, body: "My unsaved reply" },
});
assert(host.textContent?.includes("Draft saved."));
assert.equal(button("Save draft").disabled, true);

await choose("Interested");
assert.equal(button("Send saved reply").disabled, false);
await click(button("Send saved reply"));
assert.equal(navigation.sends, 1);
assert(
  button("Send saved reply").disabled,
  "An unknown response cannot be retried",
);
assert(host.textContent?.includes("outcome is unknown"));
await click(button("Send saved reply"));
assert.equal(navigation.sends, 1);

const unresolvedDetail = {
  ...detail,
  thread: { ...thread, revision: 5, stage: "interested" as const },
  draft: { ...detail.draft, body: "My unsaved reply" },
};
await click(button("Refresh"));
await render(unresolvedDetail);
assert(
  button("Send saved reply").disabled,
  "Refreshing alone never clears uncertainty",
);
const receipt = {
  id: "new-receipt",
  status: "accepted" as const,
  body: "My unsaved reply",
  createdAt: "2026-11-19T12:01:00.000Z",
  error: null,
};
await render({
  ...unresolvedDetail,
  sendAttempts: [{ ...receipt, body: "Different reply" }],
});
assert(
  button("Send saved reply").disabled,
  "A different body does not settle the send",
);
await render({
  ...unresolvedDetail,
  sendAttempts: [{ ...receipt, status: "uncertain" }],
});
assert(
  button("Send saved reply").disabled,
  "A real uncertain receipt keeps the lock",
);
await render({
  ...unresolvedDetail,
  thread: { ...unresolvedDetail.thread, revision: 6, needsReply: false },
  draft: { ...detail.draft, body: "" },
  sendAttempts: [receipt],
});
assert(host.textContent?.includes("Accepted by the provider"));
assert(!host.textContent?.includes("outcome is unknown"));
const freshDetail = {
  ...detail,
  thread: {
    ...unresolvedDetail.thread,
    revision: 7,
    updatedAt: "2026-11-19T12:02:00.000Z",
  },
  draft: { ...detail.draft, body: "Fresh reply" },
  sendAttempts: [receipt],
};
await render(freshDetail);
assert.equal(
  button("Send saved reply").disabled,
  false,
  "A fresh inbound draft is usable after reconciliation",
);
sending.handler = async () => ({
  success: true,
  data: { id: thread.id, attempt: "known-attempt", status: "uncertain" },
});
await click(button("Send saved reply"));
assert.equal(navigation.sends, 2);
const known = {
  ...receipt,
  body: "Fresh reply",
  createdAt: "2026-11-19T12:03:00.000Z",
};
await render({
  ...freshDetail,
  sendAttempts: [{ ...known, id: "unrelated-attempt", status: "failed" }],
});
assert(
  button("Send saved reply").disabled,
  "A known uncertain attempt requires that exact receipt",
);
await render({
  ...freshDetail,
  sendAttempts: [{ ...known, id: "known-attempt", status: "failed" }],
});
assert.equal(
  button("Send saved reply").disabled,
  false,
  "A known failed receipt releases the lock without fabricating delivery",
);
assert(host.textContent?.includes("Sending failed"));

const other = {
  ...thread,
  id: "33333333-3333-4333-8333-333333333333",
  stage: "open" as const,
};
await render({
  ...detail,
  thread: other,
  threads: [other],
  draft: { ...detail.draft, body: "Other thread reply" },
});
assert.equal(host.querySelector("textarea")?.value, "Other thread reply");
assert(
  !host.textContent?.includes("outcome is unknown"),
  "Identity change resets pending and notice state",
);
await act(async () => root.unmount());
window.close();
console.log("Conversation editor DOM contracts passed");
