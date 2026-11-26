import { expect, mock, setSystemTime } from "bun:test";
import {
  defaultPlaybook,
  inSendWindow,
  type ProspectInput,
  prospectIssues,
  prospectSchema,
} from "@/lib/outbound";

mock.module("server-only", () => ({}));
const now = new Date("2026-11-25T16:00:00Z");
setSystemTime(now);
const settings = {
  ...defaultPlaybook,
  bodyTemplate: "{finding}",
  sendingEnabled: true,
  senderConfirmed: true,
  allowUsMarketWindow: true,
  senderEmails: "sender@brand.com",
};
const details = prospectSchema.parse({
  company: "Sample Goods",
  domain: "samplegoods.com",
  country: "US",
  name: "Jane Smith",
  first: "Jane",
  title: "Head of Growth",
  email: "jane@samplegoods.com",
  emailStatus: "verified",
  emailVerifiedAt: now.toISOString(),
  emailSource: "fixture-receipt",
  roleSource: "https://samplegoods.com/team",
  roleCheckedAt: now.toISOString(),
  timezone: "America/New_York",
  mxProvider: "google",
  mxCheckedAt: now.toISOString(),
  product: "Linen tote",
  productUrl: "https://samplegoods.com/products/tote",
  finding: "Published tote dimensions.",
  evidence: "Saved published dimensions.",
  evidenceCheckedAt: now.toISOString(),
  legitEvidence: "Physical product and active brand.",
});
expect(prospectIssues(details, settings)).toEqual([]);
const inbox = {
  id: "fixture-inbox",
  email: "sender@brand.com",
  enabled: true,
  error: null,
  lastSyncedAt: now,
  transport: "google-app-password",
  appPassword: "fixture-only",
  nextSendAt: null as Date | null,
};
const prospects = [
  ...Array.from({ length: 21 }, (_, index) => ({
    id: `waiting-${index}`,
    inboxId: inbox.id,
    revision: 1,
    details: { ...details, timezone: "" },
    nextSendAt: null,
  })),
  {
    id: "future",
    inboxId: inbox.id,
    revision: 1,
    details,
    nextSendAt: new Date(now.getTime() + 86_400_000),
  },
  { id: "ready", inboxId: inbox.id, revision: 1, details, nextSendAt: null },
];
const checked: string[] = [];
const claimed: string[] = [];
const mailHost = { provider: "google" as ProspectInput["mxProvider"] };
let researches = 0;
mock.module("@/server/app/outbound/transport-store", () => ({
  list: async () => ({ success: true, data: [inbox] }),
  read: async () => ({ success: true, data: inbox }),
  due: async () => ({ success: true, data: prospects }),
  withSyncLock: async (_id: string, action: () => Promise<unknown>) => ({
    success: true,
    data: await action(),
  }),
  ingestBatch: async () => ({ success: true, data: {} }),
  completePendingActivation: async () => ({
    success: true,
    data: { activated: false },
  }),
}));
mock.module("@/server/utils/outbound/direct-mailbox", () => ({
  syncPage: async () => ({
    success: true,
    data: { complete: true, messages: [], checkpoint: {} },
  }),
}));
mock.module("@/server/utils/outbound/research", () => ({
  checkProduct: async () => {
    researches += 1;
    return {
      success: true,
      data: {
        status: "verified",
        product: details.product,
        gap: details.gap,
        evidence: details.evidence,
        checkedAt: details.evidenceCheckedAt,
      },
    };
  },
}));
mock.module("@/server/utils/outbound/mx", () => ({
  check: async (email: string) => {
    checked.push(email);
    return {
      success: true,
      data: { provider: mailHost.provider, checkedAt: now.toISOString() },
    };
  },
}));
mock.module("@/server/app/outbound/store", () => ({
  policy: async () => ({ settings, revision: 1 }),
  patchProspect: async () => ({ success: true, data: {} }),
  claimDelivery: async (_actor: string, input: { prospect: string }) => {
    claimed.push(input.prospect);
    const prospect = prospects.find((row) => row.id === input.prospect);
    if (
      !prospect ||
      !inSendWindow(prospect.details, now, settings) ||
      (prospect.nextSendAt && prospect.nextSendAt > now)
    )
      return { success: false, error: new Error("Final scheduling gate") };
    return { success: true, data: { attempt: "fixture-attempt" } };
  },
  // No SMTP callback is invoked. This fixture tests selection and research budgeting.
  dispatchDelivery: async () => ({
    success: true,
    data: { status: "accepted" },
  }),
}));
const Worker = await import("@/server/app/outbound/worker");
const result = await Worker.run({ dryRun: false });
expect(result).toMatchObject({ success: true, data: { sent: 1 } });
expect(claimed).toEqual(["ready"]);
expect(checked).toEqual([details.email]);
expect(researches).toBe(1);
checked.length = 0;
claimed.length = 0;
researches = 0;
inbox.nextSendAt = new Date(now.getTime() + 3 * 60_000);
expect(await Worker.run({ dryRun: false })).toMatchObject({
  success: true,
  data: { sent: 0 },
});
expect(checked).toEqual([]);
expect(claimed).toEqual([]);
expect(researches).toBe(0);
inbox.nextSendAt = null;
mailHost.provider = "microsoft";
expect(await Worker.run({ dryRun: false })).toMatchObject({
  success: true,
  data: { sent: 0 },
});
expect(claimed).toEqual([]);
settings.allowMicrosoftRecipients = true;
expect(await Worker.run({ dryRun: false })).toMatchObject({
  success: true,
  data: { sent: 1 },
});
expect(claimed).toEqual(["ready"]);
claimed.length = 0;
mailHost.provider = "unknown";
expect(await Worker.run({ dryRun: false })).toMatchObject({
  success: true,
  data: { sent: 0 },
});
expect(claimed).toEqual([]);
setSystemTime();
console.log("Worker scheduling prefilters passed");
