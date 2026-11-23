import { mock } from "bun:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import messages from "../../../../messages/en.json";
import { type Prospect, prospectSchema } from "../../outbound";
import {
  type ProspectList as ProspectPage,
  parseProspectQuery,
} from "../../outbound-prospects";

const browser = new JSDOM(
  "<!doctype html><html><body><div id='root'></div></body></html>",
  {
    url: "http://localhost/prospects",
    pretendToBeVisual: true,
  },
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
  "PointerEvent",
  "KeyboardEvent",
  "FocusEvent",
  "CustomEvent",
  "getComputedStyle",
] as const)
  Object.defineProperty(globalThis, name, {
    configurable: true,
    writable: true,
    value: name === "window" ? window : window[name],
  });
Object.assign(globalThis, {
  IS_REACT_ACT_ENVIRONMENT: true,
  requestAnimationFrame: window.requestAnimationFrame.bind(window),
  cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
  ResizeObserver: class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
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
window.HTMLElement.prototype.scrollIntoView = () => {};
// JSDOM has no Web Animations API; ScrollArea uses it to settle thumb geometry.
window.Element.prototype.getAnimations = () => [];
globalThis.fetch = Object.assign(
  async () => {
    throw new Error("Live requests forbidden in prospect list tests");
  },
  { preconnect: () => {} },
);
const calls: { method: "push" | "replace"; href: string; options: unknown }[] =
  [];
const navigation = { refreshes: 0 };
const router = {
  push: (href: string, options: unknown) => {
    calls.push({ method: "push", href, options });
  },
  replace: (href: string, options: unknown) => {
    calls.push({ method: "replace", href, options });
  },
  refresh: () => {
    navigation.refreshes += 1;
  },
};
mock.module("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    prefetch: _prefetch,
    ...props
  }: {
    href: string;
    children?: import("react").ReactNode;
    prefetch?: boolean;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  useRouter: () => router,
}));
const imports: { content: string }[] = [];
mock.module("@/server/app/outbound", () => ({
  importProspects: async (input: { content: string }) => {
    imports.push(input);
    return {
      success: true,
      data: {
        imported: 1,
        duplicate: 0,
        suppressed: 0,
        invalid: 0,
        errors: [],
      },
    };
  },
}));
const { act, useEffect } = await import("react");
const { createRoot } = await import("react-dom/client");
const { NextIntlClientProvider } = await import("next-intl");
const { ProspectList } = await import(
  "@/app/[locale]/(workspace)/_components/prospect-list"
);
const host = document.getElementById("root");
assert(host);
const root = createRoot(host);
const copy = messages.outbound;
const queue: ProspectPage = {
  total: 101,
  page: 2,
  pageSize: 50,
  rows: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      company: "Sample Goods",
      domain: "samplegoods.com",
      name: "Jane Smith",
      title: "Head of Growth",
      email: "jane@samplegoods.com",
      status: "approved",
      linkedinUrl: "https://www.linkedin.com/in/jane-fixture",
      linkedinStatus: "ready",
      lifecycles: ["sent"],
    },
  ],
};
const render = (query = parseProspectQuery(), page = queue) =>
  act(async () => {
    root.render(
      <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
        <ProspectList queue={page} query={query} manualPreparation={null} />
      </NextIntlClientProvider>,
    );
  });
const wait = (milliseconds = 50) =>
  act(async () => {
    await Bun.sleep(milliseconds);
  });
const button = (label: string, within: ParentNode = document) => {
  const found = Array.from(
    within.querySelectorAll<HTMLButtonElement>("button"),
  ).find(
    (node) =>
      node.textContent?.trim() === label ||
      node.getAttribute("aria-label") === label,
  );
  assert(found, `Missing button: ${label}`);
  return found;
};
const click = (node: Element) =>
  act(async () => {
    node.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  });
const change = (node: HTMLInputElement | HTMLTextAreaElement, value: string) =>
  act(async () => {
    const prototype =
      node instanceof window.HTMLTextAreaElement
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(node, value);
    node.dispatchEvent(new window.Event("input", { bubbles: true }));
  });
const search = () => {
  const found = host.querySelector<HTMLInputElement>(
    `input[aria-label="${copy.prospect.search}"]`,
  );
  assert(found);
  return found;
};
const lastNavigation = () => {
  const call = calls.at(-1);
  assert(call);
  assert.deepEqual(call.options, { scroll: false });
  return call;
};
const closeWithEscape = () =>
  act(async () => {
    document.activeElement?.dispatchEvent(
      new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
  });

// A blocked research stage stays visible even when the saved prospect status is still a draft.
await render(parseProspectQuery(), {
  ...queue,
  rows: queue.rows.map((row) => ({
    ...row,
    status: "draft",
    lifecycles: ["held"],
  })),
});
assert(
  host
    .querySelector("tbody")
    ?.textContent?.includes(copy.prospect.progress.lifecycle.held),
);
await render(parseProspectQuery({ lifecycle: "researching" }), {
  ...queue,
  rows: queue.rows.map((row) => ({
    ...row,
    lifecycles: ["researching", "scheduled", "sent"],
  })),
});
assert(
  host
    .querySelector("tbody")
    ?.textContent?.includes(copy.prospect.progress.lifecycle.researching),
);

// The page range and controls follow the server's clamped page, with links only to loaded rows.
await render(parseProspectQuery({ status: "approved", page: 99 }));
assert.match(host.textContent ?? "", /51.*100.*101/);
assert.equal(
  host
    .querySelector(`a[href="/prospects/${queue.rows[0]?.id}"]`)
    ?.textContent?.includes("Sample Goods"),
  true,
);
assert.equal(host.querySelectorAll("tbody tr").length, 1);
// Repeated soft row actions must not create a backdrop-filter layer per row.
// Those layers caused Chromium to blank large areas of the scrolling workspace.
const historyLink = host.querySelector('tbody a[href^="/sent"]');
assert(historyLink);
assert(!/backdrop-(?:blur|filter)/.test(historyLink.className));
assert(historyLink.classList.contains("bg-neutral/10"));
await click(button(copy.prospect.list.action.secondary));
assert.equal(lastNavigation().href, "/prospects?status=approved&page=3");
await click(button(copy.prospect.list.action.primary));
assert.equal(lastNavigation().href, "/prospects?status=approved");

// Debouncing coalesces edits, resets the page, preserves filters and uses replace.
calls.length = 0;
await change(search(), "sam");
await change(search(), "sample goods");
await wait(350);
assert.equal(calls.length, 1);
assert.deepEqual(lastNavigation(), {
  method: "replace",
  href: "/prospects?q=sample+goods&status=approved",
  options: { scroll: false },
});
// A stale server response must not erase newer text waiting for acknowledgement.
await change(search(), "sample bags");
await render(parseProspectQuery({ q: "sample goods", status: "approved" }), {
  ...queue,
  page: 1,
});
assert.equal(search().value, "sample bags");
await wait(350);
assert.equal(lastNavigation().href, "/prospects?q=sample+bags&status=approved");
await render(parseProspectQuery({ q: "sample bags", status: "approved" }), {
  ...queue,
  page: 1,
});
const acknowledged = calls.length;
await wait(350);
assert.equal(calls.length, acknowledged);

// URL normalization acknowledges padded text; a later browser Back stays authoritative.
await change(search(), "  padded search  ");
await wait(350);
assert.equal(
  lastNavigation().href,
  "/prospects?q=padded+search&status=approved",
);
await render(parseProspectQuery({ q: "padded search", status: "approved" }), {
  ...queue,
  page: 1,
});
await render(parseProspectQuery({ q: "sample bags", status: "approved" }), {
  ...queue,
  page: 1,
});
assert.equal(
  search().value,
  "sample bags",
  "Browser Back must replace an acknowledged normalized search",
);
const restored = calls.length;
await wait(350);
assert.equal(
  calls.length,
  restored,
  "Browser Back must not trigger another search navigation",
);

// Reset supersedes an in-flight search, including when the visible URL is already clear.
await render(parseProspectQuery(), { ...queue, page: 1 });
calls.length = 0;
await change(search(), "late search");
await wait(350);
assert.equal(lastNavigation().href, "/prospects?q=late+search");
await click(button(copy.prospect.list.action.tertiary, host));
assert.equal(lastNavigation().href, "/prospects");
assert.equal(calls.length, 2, "Reset must supersede the pending navigation");
await render(parseProspectQuery({ q: "late search" }), { ...queue, page: 1 });
assert.equal(
  search().value,
  "",
  "The stale response cannot restore cleared text",
);
await wait(350);
assert.equal(calls.length, 2, "A cleared search must not restart its debounce");
await render(parseProspectQuery(), { ...queue, page: 1 });
await change(search(), "not submitted");
await click(button(copy.prospect.list.action.tertiary, host));
await wait(350);
assert.equal(
  calls.length,
  2,
  "Reset also cancels a search that has not been sent",
);
await render(parseProspectQuery({ q: "restored by back" }), {
  ...queue,
  page: 1,
});
assert.equal(search().value, "restored by back");

// Hidden filters remain visible in the trigger count; reset removes all filters and search.
await render(
  parseProspectQuery({
    q: "Sample",
    status: "approved",
    lifecycle: "sent",
    linkedin: "ready",
    page: 2,
  }),
);
assert.equal(search().value, "Sample");
assert(
  Array.from(host.querySelectorAll("button")).some((node) =>
    node.textContent?.includes(`${copy.prospect.list.toolbar.filters}(3)`),
  ),
);
await click(button(copy.prospect.list.action.tertiary, host));
assert.equal(lastNavigation().href, "/prospects");
assert.equal(search().value, "");
await render(parseProspectQuery(), { ...queue, page: 1 });
assert.equal(
  button(copy.prospect.list.action.primary).getAttribute("aria-disabled"),
  "true",
);

// Selects are real shared popups and emit server query changes instead of filtering a loaded page.
await change(search(), "raced search");
await click(button(copy.prospect.list.toolbar.filters));
await wait();
await click(button(copy.prospect.list.toolbar.pipelineStatus));
await wait();
const approved = Array.from(
  document.querySelectorAll<HTMLElement>('[role="option"]'),
).find((node) => node.textContent?.trim() === copy.status.approved);
assert(approved, "Approved option should be present");
await act(async () => {
  approved.dispatchEvent(
    new window.PointerEvent("pointerdown", {
      bubbles: true,
      pointerType: "mouse",
      buttons: 1,
    }),
  );
});
await click(approved);
assert.equal(
  lastNavigation().href,
  "/prospects?q=raced+search&status=approved",
);
const afterFilter = calls.length;
await wait(350);
assert.equal(
  calls.length,
  afterFilter,
  "A pending debounce cannot remove the new filter",
);
await render(parseProspectQuery({ q: "raced search", status: "approved" }), {
  ...queue,
  page: 1,
});
await wait();
await closeWithEscape();
await wait();

// The menu transfers focus to the lazy import side panel; closing returns focus to More.
const more = button(copy.prospect.list.toolbar.more);
await act(async () => {
  more.focus();
  more.dispatchEvent(
    new window.KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
  );
});
await wait();
const importItem = Array.from(
  document.querySelectorAll<HTMLElement>('[role="menuitem"]'),
).find((node) => node.textContent?.trim() === copy.import.action.primary);
assert(importItem, "Import action should be present");
await click(importItem);
await wait(100);
const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
assert(dialog, "Import dialog should open");
assert(
  dialog.contains(document.activeElement),
  "Import dialog should contain focus after menu closes",
);
const content = dialog.querySelector<HTMLTextAreaElement>(
  'textarea[name="content"]',
);
assert(content, "Lazy import form should mount");
await change(content, "company,email\nSample Goods,jane@samplegoods.com");
await click(button(copy.import.action.primary, dialog));
await wait();
assert.deepEqual(imports, [
  { content: "company,email\nSample Goods,jane@samplegoods.com" },
]);
assert.equal(navigation.refreshes, 1);
await closeWithEscape();
await wait(100);
assert.equal(document.querySelector('[role="dialog"]'), null);
assert.equal(document.activeElement, more);

await render(parseProspectQuery({ q: "missing" }), {
  rows: [],
  total: 0,
  page: 1,
  pageSize: 50,
});
assert(host.textContent?.includes(copy.prospect.searchEmptyTitle));
assert.equal(
  button(copy.prospect.list.action.primary).getAttribute("aria-disabled"),
  "true",
);
assert.equal(
  button(copy.prospect.list.action.secondary).getAttribute("aria-disabled"),
  "true",
);

// The detail accordion does not mount its heavy editors until opened, then preserves edits.
const mounts = { editor: 0, tools: 0 };
mock.module("@/app/[locale]/(workspace)/_components/prospects", () => ({
  ProspectEditor: () => {
    useEffect(() => {
      mounts.editor += 1;
    }, []);
    return (
      <input aria-label="Manual draft fixture" defaultValue="Saved draft" />
    );
  },
}));
mock.module("@/app/[locale]/(workspace)/_components/integrations", () => ({
  ProspectTools: () => {
    useEffect(() => {
      mounts.tools += 1;
    }, []);
    return <p>Tools fixture</p>;
  },
}));
const { ProspectEditorPanel } = await import(
  "@/app/[locale]/(workspace)/prospects/[id]/_components/editor"
);
const prospect: Prospect = {
  ...prospectSchema.parse({
    company: "Sample Goods",
    domain: "samplegoods.com",
    country: "US",
    name: "Jane Smith",
    first: "Jane",
    email: "jane@samplegoods.com",
  }),
  id: "11111111-1111-4111-8111-111111111111",
  revision: 1,
  senderEmail: "sender@example.com",
  sentStep: 0,
  sentFirstMessage: null,
  sentPostalAddress: null,
  companyId: "company",
  personId: "person",
  status: "held",
  messages: [],
  issues: [],
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
  createdAt: "2026-11-21T12:00:00.000Z",
  updatedAt: "2026-11-21T12:00:00.000Z",
};
await act(async () =>
  root.render(
    <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
      <ProspectEditorPanel prospect={prospect} clay={null} />
    </NextIntlClientProvider>,
  ),
);
await wait();
assert.deepEqual(mounts, { editor: 0, tools: 0 });
assert.equal(host.querySelector("input"), null);
const editorToggle = Array.from(host.querySelectorAll("button")).find((node) =>
  node.textContent?.includes(copy.prospect.summary.manualTitle),
);
assert(editorToggle);
await click(editorToggle);
await wait(100);
assert.deepEqual(mounts, { editor: 1, tools: 1 });
const draft = host.querySelector<HTMLInputElement>(
  'input[aria-label="Manual draft fixture"]',
);
assert(draft);
await change(draft, "Unsaved edit");
await click(editorToggle);
await wait();
await click(editorToggle);
await wait();
assert.deepEqual(mounts, { editor: 1, tools: 1 });
assert.equal(
  host.querySelector<HTMLInputElement>(
    'input[aria-label="Manual draft fixture"]',
  )?.value,
  "Unsaved edit",
);
await act(async () => root.unmount());
browser.window.close();
console.log("Prospect list DOM contracts passed");
