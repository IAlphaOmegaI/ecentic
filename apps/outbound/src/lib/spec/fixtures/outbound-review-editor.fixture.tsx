import { mock } from "bun:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import messages from "../../../../messages/en.json";

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

const calls: { action: string; input: unknown }[] = [];
const reply = { success: false };
const action = (name: string) => async (input: unknown) => {
  calls.push({ action: name, input });
  return reply.success
    ? { success: true, data: {} }
    : { success: false, error: { message: "Fixture action failed" } };
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
  useRouter: () => ({ refresh: () => {}, push: () => {} }),
}));
mock.module("@/server/app/outbound", () => ({
  generateDrafts: action("generate"),
  reviewProspect: action("review"),
  recordOutcome: action("outcome"),
}));
mock.module("@/server/app/outbound/copy-actions", () => ({
  saveWriterParts: action("parts"),
  rejudgeDraft: action("rejudge"),
  previewRebuild: action("preview"),
}));
const savedAnswer =
  "<script>window.stolen = true</script>\nThe complete saved answer.";
mock.module("@/server/app/outbound/review-context", () => ({
  readSavedAnswer: async (input: unknown) => {
    calls.push({ action: "answer", input });
    return {
      success: true,
      data: { text: savedAnswer, citations: ["Saved citation"] },
    };
  },
}));
const { COPY_CRITERIA, writingSnapshotSchema } = await import(
  "@/lib/outbound-composition"
);
const { reviewChecks, reviewNextAction } = await import(
  "@/lib/outbound-review-context"
);
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { NextIntlClientProvider } = await import("next-intl");
const { ReviewEditor } = await import(
  "@/app/[locale]/(workspace)/review/[id]/_components/editor"
);
const { defaultPlaybook, prospectSchema } = await import("@/lib/outbound");
const host = document.getElementById("root");
assert(host);
const root = createRoot(host);
const input = prospectSchema.parse({
  company: "Example Goods",
  domain: "example.com",
  country: "US",
  name: "Ada",
  first: "Ada",
  email: "ada@example.com",
  product: "Linen tote",
  finding: "The saved product page lists one size.",
  evidence: "One size",
});
const prospect: import("../../outbound").Prospect = {
  ...input,
  id: "11111111-1111-4111-8111-111111111111",
  revision: 2,
  senderEmail: "sender@example.com",
  sentStep: 0,
  sentFirstMessage: null,
  sentPostalAddress: null,
  companyId: "company",
  personId: "person",
  status: "held",
  messages: [
    {
      step: 1,
      subject: "Linen tote",
      body: "Hi Ada, here is the saved draft.",
      afterDays: 0,
    },
    {
      step: 2,
      subject: "Linen tote",
      body: "First follow-up draft.",
      afterDays: 4,
    },
    {
      step: 3,
      subject: "Linen tote",
      body: "Second follow-up draft.",
      afterDays: 8,
    },
  ],
  approvedAt: null,
  approvedBy: null,
  approvalHash: null,
  playbookRevision: 1,
  holdReason: "Review requested",
  linkedinStatus: "research",
  linkedinDraft: "",
  linkedinNextActionAt: null,
  linkedinNote: "",
  lastContactedAt: null,
  createdAt: "2026-11-19T12:00:00.000Z",
  updatedAt: "2026-11-19T12:00:00.000Z",
  issues: [],
};
const parts = {
  subject: "Linen tote",
  opening: "My sister needed a large tote.",
  result: "Example Goods did not appear in the answer.",
  relevance: "That leaves the shop out of the first shortlist.",
  followupFact: "",
};
const writing = writingSnapshotSchema.parse({
  version: "discovery-email-v1",
  writingPolicyHash: "a".repeat(64),
  receiptHash: "b".repeat(64),
  contentHash: "c".repeat(64),
  revision: 2,
  generatedAt: "2026-11-26T12:00:00.000Z",
  parts,
  queryTopic: parts.subject,
  narrative: { relationship: "sister", occasion: null },
  quality: {
    passed: false,
    evaluatedAt: "2026-11-26T12:00:00.000Z",
    deterministicIssues: [],
    criteria: COPY_CRITERIA.map((criterion) => ({
      criterion,
      passed: criterion !== "naturalVoice",
      reason:
        criterion === "naturalVoice"
          ? "The opening needs a plainer voice."
          : "Synthetic criterion passed.",
    })),
  },
});
const firstMessage = prospect.messages[0];
assert(firstMessage);
firstMessage.writing = writing;
const context: import("../../outbound-review-context").ReviewContext = {
  prospect,
  playbook: defaultPlaybook,
  proposal: true,
  copyEditable: true,
  copyTrusted: true,
  research: {
    query: "linen tote gift ideas",
    queryIntent: "unbranded-specific",
    priceDifference: false,
    kind: "discovery-absence",
    observation: "Example Goods did not appear.",
    position: null,
    total: 2,
    listed: ["Alder", "Birch"],
    checkedAt: "2026-11-26T12:00:00.000Z",
    fullAnswerAvailable: true,
  },
  previous: {
    revision: 1,
    createdAt: "2026-11-25T12:00:00.000Z",
    messages: prospect.messages.map((message) => ({
      ...message,
      body: `Older text for step ${message.step}.`,
      writing: undefined,
    })),
    postalAddress: "Older saved postal address",
  },
};
const render = async (value: typeof context = context) =>
  act(async () => {
    root.render(
      <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
        <ReviewEditor
          key={`${value.prospect.status}-${value.proposal}`}
          context={value}
          backHref="/review"
        />
      </NextIntlClientProvider>,
    );
  });
const click = async (element: Element) =>
  act(async () => {
    element.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  });
const button = (text: string) => {
  const found = Array.from(document.querySelectorAll("button")).find(
    (element) => element.textContent?.trim() === text,
  );
  assert(found, `Missing button: ${text}`);
  return found;
};
const labels = messages.outbound.review;
const hasFailure = (container: Element | null) =>
  container
    ?.querySelector("[role='alert']")
    ?.textContent?.includes("Fixture action failed") ?? false;
assert.deepEqual(
  reviewChecks({
    ...context,
    prospect: {
      ...prospect,
      issues: [{ code: "copyQuality", field: "message1" }],
    },
  }),
  { contact: "ready", research: "ready", copy: "attention" },
);
assert.equal(
  reviewChecks({
    ...context,
    prospect: {
      ...prospect,
      issues: [{ code: "emailUnverified", field: "email" }],
    },
  }).contact,
  "attention",
);
assert(context.research);
assert.equal(
  reviewNextAction({
    ...context,
    research: {
      ...context.research,
      kind: "no-gap",
      queryIntent: "unbranded-broad",
    },
  }),
  "anotherProduct",
);
assert.equal(
  reviewNextAction({
    ...context,
    research: {
      ...context.research,
      kind: "no-gap",
      queryIntent: "unbranded-specific",
    },
  }),
  "broader",
);
await render();
assert.equal(
  host.querySelectorAll("article").length,
  3,
  "All three exact emails are visible",
);
for (const message of prospect.messages)
  assert(host.textContent?.includes(message.body));
assert(host.textContent?.includes(prospect.holdReason));
assert(context.research);
assert(host.textContent?.includes(context.research.query));
assert.deepEqual(reviewChecks(context), {
  contact: "ready",
  research: "ready",
  copy: "attention",
});
assert(
  !Array.from(host.querySelectorAll("button")).some(
    (element) => element.textContent?.trim() === labels.panel.resume,
  ),
  "No action automatically releases the hold",
);
assert(
  !Array.from(host.querySelectorAll("button")).some(
    (element) => element.textContent?.trim() === labels.action.primary,
  ),
  "Held proposal cannot be approved from this UI",
);
await click(button(labels.composition.compare));
assert.equal(host.querySelectorAll("article").length, 6);
assert(host.textContent?.includes("Older saved postal address"));
await click(button(labels.composition.edit));
const draft = host.querySelector("form");
assert(draft);
assert.equal(
  draft.querySelectorAll("textarea").length,
  4,
  "Only four text parts and a subject are editable",
);
await click(button(labels.composition.saveCheck));
assert.deepEqual(calls.at(-1), {
  action: "parts",
  input: { prospect: prospect.id, revision: 2, parts },
});
assert(hasFailure(draft), "Copy failure stays beside the copy form");
await click(button(labels.panel.controls));
await click(button(labels.action.tertiary));
assert.deepEqual(calls.at(-1), {
  action: "review",
  input: {
    prospect: prospect.id,
    revision: 2,
    decision: "hold",
    reason: prospect.holdReason,
  },
});
assert(!hasFailure(draft));
const forms = host.querySelectorAll("form");
assert(hasFailure(forms.item(1)), "Hold feedback stays beside Hold");
await click(button(labels.composition.openAnswer));
assert.deepEqual(calls.at(-1), {
  action: "answer",
  input: { prospectId: prospect.id, revision: 2 },
});
assert(document.body.textContent?.includes(savedAnswer));
assert.equal(
  document.querySelector("script"),
  null,
  "Saved HTML is displayed as text",
);
await act(async () => root.unmount());
window.close();
console.log("Review editor DOM contracts passed");
