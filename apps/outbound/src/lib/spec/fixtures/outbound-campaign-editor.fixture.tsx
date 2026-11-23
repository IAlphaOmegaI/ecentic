import { mock } from "bun:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import messages from "../../../../messages/en.json";
import type { Campaign } from "../../outbound-campaigns";

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
globalThis.fetch = Object.assign(
  async () => {
    throw new Error("Live requests forbidden in campaign editor tests");
  },
  { preconnect: () => {} },
);

const calls: { kind: "metadata" | "criteria"; input: unknown }[] = [];
const response = {
  metadata: async (_input: unknown): Promise<unknown> => ({
    success: true,
    data: { id: "campaign-fixture", revision: 2 },
  }),
  criteria: async (_input: unknown): Promise<unknown> => ({
    success: true,
    data: { id: "campaign-fixture", revision: 3 },
  }),
};
const navigation = { refreshes: 0 };
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
    replace: () => {},
  }),
}));
mock.module("@/server/app/outbound/campaign-actions", () => ({
  updateCampaign: async (input: unknown) => {
    calls.push({ kind: "metadata", input });
    return response.metadata(input);
  },
  saveCampaignCriteria: async (input: unknown) => {
    calls.push({ kind: "criteria", input });
    return response.criteria(input);
  },
  createCampaign: async () => {
    throw new Error("Unexpected create");
  },
}));
mock.module("@/server/app/outbound/claude-actions", () => ({
  generate: async () => {
    throw new Error("Unexpected generation");
  },
  recover: async () => {
    throw new Error("Unexpected recovery");
  },
}));
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { NextIntlClientProvider } = await import("next-intl");
const { CampaignSettings } = await import(
  "@/app/[locale]/(workspace)/campaigns/_components/editor"
);
const host = document.getElementById("root");
assert(host);
const root = createRoot(host);
const copy = messages.outbound.campaigns;
const campaign: Campaign = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Fixture campaign",
  status: "active",
  revision: 2,
  answers: "",
  createdAt: "2026-11-19T12:00:00.000Z",
  updatedAt: "2026-11-19T12:00:00.000Z",
  criteria: {
    objective: "Find established physical-product brands.",
    qualificationNotes: "Verify the company website.",
    countries: ["US"],
    platforms: ["shopify", "woocommerce"],
    keywords: ["skincare"],
    excludedKeywords: [],
    targetRoles: ["Founder"],
    excludedRoles: [],
    excludedDomains: [],
    teamSizeMin: null,
    teamSizeMax: null,
    annualRevenueMin: null,
    annualRevenueMax: null,
  },
};
const previewChange = () => {};
const render = (value: Campaign) =>
  act(async () => {
    root.render(
      <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
        <CampaignSettings
          key={value.id}
          campaign={value}
          feedbackVersion={0}
          onPreviewChange={previewChange}
          claudeConfigured={false}
        />
      </NextIntlClientProvider>,
    );
  });
const button = (text: string) => {
  const found = Array.from(host.querySelectorAll("button")).find(
    (node) => node.textContent?.trim() === text,
  );
  assert(found, `Missing button: ${text}`);
  return found;
};
const click = (node: Element) =>
  act(async () => {
    node.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  });
const field = (name: string) => {
  const node = host.querySelector<HTMLInputElement | HTMLTextAreaElement>(
    `input[name="${name}"],textarea[name="${name}"]`,
  );
  assert(node, `Missing input: ${name}`);
  return node;
};
const change = (name: string, value: string) =>
  act(async () => {
    const node = field(name);
    const prototype =
      node instanceof window.HTMLTextAreaElement
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(node, value);
    node.dispatchEvent(new window.Event("input", { bubbles: true }));
  });
const chooseStatus = async (label: string) => {
  const select = field("name")
    .closest("form")
    ?.querySelector("[role='combobox']");
  assert(select);
  await click(select);
  const option = Array.from(document.querySelectorAll("[role='option']")).find(
    (node) => node.textContent?.trim() === label,
  );
  assert(option, `Missing status: ${label}`);
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
const disabled = (node: Element) => node.matches(":disabled");
const formButton = (name: string) => {
  const node = field(name)
    .closest("form")
    ?.querySelector<HTMLButtonElement>("button[type='submit']");
  assert(node);
  return node;
};

await render(campaign);
await click(button(copy.metadataTitle));
await click(button(copy.criteriaTitle));
assert(
  disabled(button(copy.metadata.action.primary)),
  "Unchanged metadata cannot be resaved",
);
await change("name", "Staff-edited campaign");
await chooseStatus(copy.statuses.paused);
await render({ ...campaign, updatedAt: "2026-11-19T12:01:00.000Z" });
assert.equal(
  field("name").value,
  "Staff-edited campaign",
  "Discovery refresh keeps the unsaved name",
);
assert.equal(
  field("name")
    .closest("form")
    ?.querySelector("[role='combobox']")
    ?.textContent?.trim(),
  copy.statuses.paused,
  "Discovery refresh keeps the unsaved status",
);
assert(!disabled(formButton("name")));
let resolveMetadata: ((value: unknown) => void) | undefined;
response.metadata = () =>
  new Promise((resolve) => {
    resolveMetadata = resolve;
  });
await click(formButton("name"));
assert(
  disabled(field("name")),
  "Metadata inputs stop changing while their save is pending",
);
await click(formButton("name"));
assert.equal(calls.length, 1, "Pending metadata cannot submit twice");
await act(async () =>
  resolveMetadata?.({ success: true, data: { id: campaign.id, revision: 2 } }),
);
assert(
  disabled(field("name")),
  "Saved metadata waits for its refreshed values",
);
const metadataSaved = {
  ...campaign,
  name: "Staff-edited campaign",
  status: "paused" as const,
  updatedAt: "2026-11-19T12:02:00.000Z",
};
await render(metadataSaved);
assert(!disabled(field("name")));
assert(disabled(formButton("name")), "Matching saved metadata is clean");
assert.deepEqual(calls[0], {
  kind: "metadata",
  input: {
    id: campaign.id,
    expectedRevision: 2,
    name: metadataSaved.name,
    status: "paused",
  },
});

await change(
  "objective",
  "Find brands with an established physical catalogue.",
);
let resolveCriteria: ((value: unknown) => void) | undefined;
response.criteria = () =>
  new Promise((resolve) => {
    resolveCriteria = resolve;
  });
await click(formButton("objective"));
assert(
  disabled(field("objective")),
  "Criteria cannot change during their save",
);
await click(formButton("objective"));
assert.equal(calls.filter((call) => call.kind === "criteria").length, 1);
await act(async () =>
  resolveCriteria?.({ success: true, data: { id: campaign.id, revision: 3 } }),
);
assert(
  disabled(field("objective")),
  "Saved criteria wait for their refreshed revision",
);
assert(
  field("objective").closest("form")?.textContent?.includes(copy.saved),
  "Criteria success feedback is beside the criteria action",
);
const criteriaSaved = {
  ...metadataSaved,
  revision: 3,
  criteria: {
    ...campaign.criteria,
    objective: "Find brands with an established physical catalogue.",
  },
  updatedAt: "2026-11-19T12:03:00.000Z",
};
await render(criteriaSaved);
assert(!disabled(field("objective")));
assert.equal(field("objective").value, criteriaSaved.criteria.objective);
assert(
  disabled(formButton("objective")),
  "Unchanged criteria are not resubmitted",
);

await change("objective", "Keep my in-progress targeting criteria.");
const external = {
  ...criteriaSaved,
  revision: 4,
  criteria: {
    ...criteriaSaved.criteria,
    objective: "Another staff member's saved objective.",
  },
  updatedAt: "2026-11-19T12:04:00.000Z",
};
await render(external);
assert.equal(
  field("objective").value,
  "Keep my in-progress targeting criteria.",
  "A newer server revision does not discard staff edits",
);
assert(
  host.textContent?.includes(copy.forms.changed),
  "A stale revision has explicit conflict feedback",
);
assert(
  disabled(formButton("objective")),
  "Stale criteria cannot silently overwrite the new revision",
);
assert.equal(calls.filter((call) => call.kind === "criteria").length, 1);
await click(button(copy.forms.loadSaved));
assert.equal(field("objective").value, external.criteria.objective);
assert(
  !disabled(field("objective")),
  "Loading saved criteria releases the stale lock",
);
assert(disabled(formButton("objective")), "Loaded criteria start clean");

await change("name", "Concurrent metadata submission");
response.metadata = () =>
  new Promise((resolve) => {
    resolveMetadata = resolve;
  });
await click(formButton("name"));
assert(disabled(field("name")));
await act(async () =>
  resolveMetadata?.({ success: true, data: { id: campaign.id, revision: 4 } }),
);
assert(disabled(field("name")));
const raced = {
  ...external,
  name: "A newer staff metadata edit",
  updatedAt: "2026-11-19T12:05:00.000Z",
};
await render(raced);
assert.equal(
  field("name").value,
  "Concurrent metadata submission",
  "Conflicting refreshed metadata keeps the submitted values visible",
);
assert(
  host.textContent?.includes(copy.forms.changed),
  "A mismatching saved refresh reports the newer change",
);
assert(
  !disabled(button(copy.forms.loadSaved)),
  "A mismatched refresh can be recovered instead of remaining pending",
);
await click(button(copy.forms.loadSaved));
assert.equal(field("name").value, raced.name);
assert(!disabled(field("name")));
assert(disabled(formButton("name")));
await act(async () => root.unmount());
browser.window.close();
console.log("Campaign editor DOM contracts passed");
