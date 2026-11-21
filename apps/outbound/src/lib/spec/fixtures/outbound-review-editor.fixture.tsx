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
  saveDraft: action("draft"),
  reviewProspect: action("review"),
  recordOutcome: action("outcome"),
}));
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
const render = async (automatic: boolean) =>
  act(async () => {
    root.render(
      <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
        <ReviewEditor
          key={String(automatic)}
          prospect={prospect}
          playbook={{ ...defaultPlaybook, automationEnabled: automatic }}
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
  const found = Array.from(host.querySelectorAll("button")).find(
    (element) => element.textContent?.trim() === text,
  );
  assert(found, `Missing button: ${text}`);
  return found;
};
const labels = messages.outbound.review;
const draftForm = () => host.querySelector("form");
const approval = () =>
  host.querySelector("[aria-labelledby='review-approval-title']");
const controls = () => {
  const identifier = button(labels.panel.controls).getAttribute(
    "aria-controls",
  );
  assert(identifier);
  const panel = document.getElementById(identifier);
  assert(panel);
  return panel;
};
const hasFailure = (container: Element | null) =>
  container
    ?.querySelector("[role='alert']")
    ?.textContent?.includes("Fixture action failed") ?? false;

await render(false);
await click(button(labels.panel.controls));
await click(button(labels.action.tertiary));
assert.deepEqual(calls.at(-1), {
  action: "review",
  input: { prospect: prospect.id, revision: 2, decision: "hold", reason: "" },
});
assert(
  hasFailure(controls()),
  "Hold failure is visible inside the Controls accordion",
);
assert(
  !hasFailure(draftForm()),
  "Hold failure does not appear under draft editor",
);
assert(!hasFailure(approval()));
reply.success = true;
await click(button(labels.action.tertiary));
assert(
  controls()
    .querySelector("[role='status']")
    ?.textContent?.includes(messages.outbound.common.saved),
  "Hold success stays beside Hold",
);
assert(!draftForm()?.querySelector("[role='status']"));
reply.success = false;
await click(button(labels.action.primary));
assert(hasFailure(approval()), "Approval failure appears beside Approve");
assert(!hasFailure(controls()));
assert(!hasFailure(draftForm()));
await click(button(labels.action.secondary));
assert.equal(calls.at(-1)?.action, "draft");
assert(
  hasFailure(draftForm()),
  "Draft save failure remains inside the editor form",
);
assert(!hasFailure(approval()));
assert(!hasFailure(controls()));

await render(true);
await click(button(labels.panel.resume));
assert.deepEqual(calls.at(-1), {
  action: "review",
  input: { prospect: prospect.id, revision: 2, decision: "review", reason: "" },
});
assert(hasFailure(approval()), "Resume failure appears beside Resume");
assert(!hasFailure(draftForm()));
await act(async () => root.unmount());
window.close();
console.log("Review editor DOM contracts passed");
