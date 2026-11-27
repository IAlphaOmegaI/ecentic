import { mock, spyOn } from "bun:test";
import assert from "node:assert/strict";
import { defaultPlaybook, prospectSchema } from "@/lib/outbound";

mock.module("server-only", () => ({}));
mock.module("next/headers", () => ({ headers: async () => new Headers() }));
mock.module("next/server", () => ({ connection: async () => undefined }));
mock.module("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: async () => ({
        user: { id: "staff-fixture", role: "staff" },
        session: { id: "fixture-session" },
      }),
    },
  },
}));
const Store = await import("@/server/app/outbound/store");
const Jobs = await import("@/server/app/outbound/jobs");
const Providers = await import("@/server/utils/outbound/providers");
const Credentials = await import("@/server/app/outbound/provider-credentials");
const now = new Date();
const base = {
  prospect: {
    id: "d3013043-3e41-40e5-b97f-833886827380",
    campaignId: null,
    replacementOf: null,
    replacementAuthorization: null,
    companyId: "company-fixture",
    personId: "person-fixture",
    details: prospectSchema.parse({
      company: "Fixture Brand",
      domain: "example.com",
      country: "US",
      platform: "shopify",
      name: "Jane Smith",
      first: "Jane",
      title: "Head of E-commerce",
      email: "jane@example.com",
      emailStatus: "verified",
      emailSource: "Apollo receipt fixture",
      emailVerifiedAt: now.toISOString(),
      mxProvider: "google",
      mxCheckedAt: now.toISOString(),
      product: "Trail Shoes",
      productUrl: "https://example.com/products/shoes",
      gap: "barcode-missing-from-page-data",
      finding: "A supported finding",
      evidence: "Human-reviewed product and rendered evidence",
      evidenceCheckedAt: now.toISOString(),
      findingReviewed: true,
      linkedinUrl: "https://www.linkedin.com/in/fixture-jane",
    }),
    status: "candidate" as const,
    messages: [],
    revision: 2,
    playbookRevision: 1,
    approvedAt: null,
    approvedBy: null,
    approvalHash: null,
    holdReason: "",
    linkedinStatus: "research" as const,
    linkedinDraft: "",
    linkedinNextActionAt: null,
    linkedinNote: "",
    firstSentAt: null,
    lastSentAt: null,
    nextSendAt: null,
    sentStep: 0,
    inboxId: null,
    threadId: null,
    createdBy: "staff-fixture",
    createdAt: now,
    updatedAt: now,
  },
  settings: { ...defaultPlaybook, emailVerificationDays: 30 },
  suppressed: false,
  lastContactedAt: null,
};
const read = spyOn(Store, "getEnrichmentContext").mockResolvedValue({
  success: true,
  data: base,
});
const policy = spyOn(Store, "policy").mockResolvedValue({
  settings: base.settings,
  revision: 1,
});
const row = spyOn(Store, "readProspect").mockResolvedValue({
  success: true,
  data: base.prospect,
});
const job = {
  id: "job-fixture",
  provider: "apollo" as const,
  prospectId: base.prospect.id,
  requestId: "request-fixture",
  status: "starting" as const,
  input: { operation: "verify", email: "jane@example.com", revision: 2 },
  output: {
    records: [
      { record_id: "receipt-fixture", input: { email: "jane@example.com" } },
    ],
  },
  error: null,
  createdAt: now,
  updatedAt: now,
};
const reserve = spyOn(Jobs, "reserve").mockResolvedValue({
  success: true,
  data: job,
});
spyOn(Jobs, "update").mockResolvedValue({ success: true, data: job });
const enrich = spyOn(Providers, "enrichApolloPerson").mockResolvedValue({
  success: true,
  data: null,
});
const verify = spyOn(Providers, "verifyApolloEmails").mockResolvedValue({
  success: true,
  data: {
    requestId: "request-fixture",
    status: "pending",
    records: [],
    requestedAt: now.toISOString(),
  },
});
const clay = spyOn(Providers, "startClayEnrichment").mockResolvedValue({
  success: true,
  data: {
    runId: "run-fixture",
    status: "pending",
    requestedAt: now.toISOString(),
  },
});
spyOn(Credentials, "metadata").mockResolvedValue({
  success: true,
  data: {
    configured: true,
    credentialStatus: "verified",
    configuration: { routineId: "routine-fixture" },
  },
});
const Actions = await import("@/server/app/outbound/integrations");
const rejected = [
  { ...base, suppressed: true },
  { ...base, lastContactedAt: now },
  { ...base, prospect: { ...base.prospect, status: "replied" as const } },
  {
    ...base,
    prospect: {
      ...base.prospect,
      details: { ...base.prospect.details, relationship: "partner" as const },
    },
  },
  {
    ...base,
    prospect: {
      ...base.prospect,
      details: { ...base.prospect.details, country: "GB" },
    },
  },
  {
    ...base,
    prospect: {
      ...base.prospect,
      details: { ...base.prospect.details, platform: "unknown" as const },
    },
  },
  { ...base, settings: { ...base.settings, excludedDomains: "example.com" } },
  {
    ...base,
    settings: { ...base.settings, excludedCompanies: "Fixture Brand" },
  },
  {
    ...base,
    prospect: {
      ...base.prospect,
      details: { ...base.prospect.details, findingReviewed: false },
    },
  },
  {
    ...base,
    prospect: {
      ...base.prospect,
      details: { ...base.prospect.details, evidence: "" },
    },
  },
  {
    ...base,
    prospect: {
      ...base.prospect,
      details: {
        ...base.prospect.details,
        productUrl: "https://other.example/product",
      },
    },
  },
  {
    ...base,
    prospect: {
      ...base.prospect,
      details: {
        ...base.prospect.details,
        evidenceCheckedAt: new Date(now.getTime() - 8 * 86400000).toISOString(),
      },
    },
  },
  {
    ...base,
    prospect: {
      ...base.prospect,
      details: {
        ...base.prospect.details,
        evidenceCheckedAt: new Date(now.getTime() + 86400000).toISOString(),
      },
    },
  },
  {
    ...base,
    prospect: {
      ...base.prospect,
      details: { ...base.prospect.details, mxProvider: "microsoft" as const },
    },
  },
];
for (const context of rejected) {
  read.mockResolvedValue({ success: true, data: context });
  assert.equal(
    (await Actions.enrichProspect({ prospectId: base.prospect.id })).success,
    false,
  );
  assert.equal(
    (await Actions.verifyProspect({ prospectId: base.prospect.id })).success,
    false,
  );
  assert.equal(
    (await Actions.startClay({ prospectIds: [base.prospect.id] })).success,
    false,
  );
}
assert.equal(reserve.mock.calls.length, 0);
assert.equal(enrich.mock.calls.length, 0);
assert.equal(verify.mock.calls.length, 0);
assert.equal(clay.mock.calls.length, 0);
for (const details of [
  { ...base.prospect.details, title: "" },
  { ...base.prospect.details, name: "", linkedinUrl: "" },
  { ...base.prospect.details, emailStatus: "catchAll" as const },
  { ...base.prospect.details, emailSource: "" },
  {
    ...base.prospect.details,
    emailVerifiedAt: new Date(now.getTime() - 31 * 86400000).toISOString(),
  },
  { ...base.prospect.details, mxProvider: "unknown" as const },
]) {
  read.mockResolvedValue({
    success: true,
    data: { ...base, prospect: { ...base.prospect, details } },
  });
  assert.equal(
    (await Actions.startClay({ prospectIds: [base.prospect.id] })).success,
    false,
  );
}
assert.equal(reserve.mock.calls.length, 0);
read.mockResolvedValue({ success: true, data: base });
assert.equal(
  (await Actions.verifyProspect({ prospectId: base.prospect.id })).success,
  true,
);
assert.equal(
  (await Actions.startClay({ prospectIds: [base.prospect.id] })).success,
  true,
);
assert.equal(
  (await Actions.enrichProspect({ prospectId: base.prospect.id })).success,
  false,
); // No matching provider person.
assert.equal(reserve.mock.calls.length, 3);
assert.equal(enrich.mock.calls.length, 1);
assert.equal(verify.mock.calls.length, 1);
assert.equal(clay.mock.calls.length, 1);
assert.deepEqual(clay.mock.calls[0]?.[0], {
  items: [
    {
      id: base.prospect.id,
      inputs: {
        name: "Jane Smith",
        domain: "example.com",
        linkedin_url: base.prospect.details.linkedinUrl,
        email: "jane@example.com",
        title: "Head of E-commerce",
        company: "Fixture Brand",
      },
    },
  ],
});

// A current, correlated provider receipt uses the email validity window, not product evidence age.
spyOn(Jobs, "find").mockResolvedValue({ success: true, data: job });
spyOn(Jobs, "beginPoll").mockResolvedValue({ success: true, data: job });
const checkedAt = new Date(now.getTime() - 20 * 86400000).toISOString();
const poll = spyOn(Providers, "pollApolloVerification").mockResolvedValue({
  success: true,
  data: {
    requestId: "request-fixture",
    status: "complete",
    retryAfterSeconds: 30,
    results: [
      {
        email: "jane@example.com",
        status: "verified",
        verdict: "validated",
        verifiedAt: checkedAt,
        source: "apollo",
        recordId: "receipt-fixture",
      },
    ],
  },
});
const patch = spyOn(Store, "patchProspect").mockResolvedValue({
  success: true,
  data: { id: base.prospect.id },
} as never);
assert.equal(
  (await Actions.pollVerification({ prospectId: base.prospect.id })).success,
  true,
);
assert.equal(patch.mock.calls[0]?.[2]?.emailStatus, "verified");
assert.equal(patch.mock.calls[0]?.[2]?.emailVerifiedAt, checkedAt);
const calls = patch.mock.calls.length;
poll.mockResolvedValue({
  success: true,
  data: {
    requestId: "request-fixture",
    status: "complete",
    retryAfterSeconds: 30,
    results: [
      {
        email: "jane@example.com",
        status: "verified",
        verdict: "validated",
        verifiedAt: checkedAt,
        source: "apollo",
        recordId: "another-request-record",
      },
    ],
  },
});
assert.equal(
  (await Actions.pollVerification({ prospectId: base.prospect.id })).success,
  false,
);
assert.equal(patch.mock.calls.length, calls);
poll.mockResolvedValue({
  success: true,
  data: {
    requestId: "request-fixture",
    status: "complete",
    retryAfterSeconds: 30,
    results: ["verified", "unknown"].map((status) => ({
      email: "jane@example.com",
      status: status as "verified" | "unknown",
      verdict: status === "verified" ? "validated" : "invalid",
      verifiedAt: checkedAt,
      source: "apollo" as const,
      recordId: "receipt-fixture",
    })),
  },
});
assert.equal(
  (await Actions.pollVerification({ prospectId: base.prospect.id })).success,
  false,
);
assert.equal(patch.mock.calls.length, calls);
poll.mockResolvedValue({
  success: true,
  data: {
    requestId: "request-fixture",
    status: "complete",
    retryAfterSeconds: 30,
    results: [
      {
        email: "jane@example.com",
        status: "verified",
        verdict: "validated",
        verifiedAt: null,
        source: "apollo",
        recordId: "receipt-fixture",
      },
    ],
  },
});
assert.equal(
  (await Actions.pollVerification({ prospectId: base.prospect.id })).success,
  true,
);
assert.equal(patch.mock.calls.at(-1)?.[2]?.emailStatus, "stale");
assert.equal(patch.mock.calls.at(-1)?.[2]?.emailVerifiedAt, "");
assert.equal(policy.mock.calls.length, 2);
assert.equal(row.mock.calls.length, 4);
console.log("Paid preparation preconditions passed");
