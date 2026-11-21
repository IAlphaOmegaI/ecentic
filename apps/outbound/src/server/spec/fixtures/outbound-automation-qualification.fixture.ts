import { mock } from "bun:test";
import assert from "node:assert/strict";
import { defaultPlaybook } from "@/lib/outbound";
import { defaultCampaignCriteria } from "@/lib/outbound-campaigns";
import type { Person } from "@/server/utils/outbound/providers";

mock.module("server-only", () => ({}));
const company = {
  id: "company-fixture",
  name: "Example Beauty",
  domain: "examplebeauty.test",
  website: "https://examplebeauty.test",
  country: "US",
  platform: "shopify" as const,
  teamSize: 15,
  annualRevenue: null,
  source: "apollo" as const,
  sourceId: "company123",
};
const campaign = {
  id: "campaign-fixture",
  name: "Beauty",
  criteria: {
    ...defaultCampaignCriteria(defaultPlaybook),
    targetRoles: ["Head of Ecommerce", "Head of Marketing", "Founder"],
    qualificationNotes: "Own skincare products and an established team.",
  },
};
const playbook = {
  ...defaultPlaybook,
  targetRoles: "Head of Ecommerce\nHead of Marketing\nFounder",
  excludedDomains: "",
  excludedCompanies: "",
};
const product = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Daily Face Cream",
  brand: { "@type": "Brand", name: company.name },
  description:
    "A physical face cream with a replaceable refill cartridge inside a reusable glass jar.",
  offers: { "@type": "Offer", price: "24", priceCurrency: "USD" },
};
const productHtml = (record: unknown = product) =>
  `<html><body><h1>Daily Face Cream</h1><p>${product.description}</p><script type="application/ld+json">${JSON.stringify(record)}</script></body></html>`;
const home = `<html><script src="https://cdn.shopify.com/a.js"></script><body><h1>Example Beauty</h1><p>We make our own skincare products. Our team of 15 creates physical face creams.</p><a href="/products/daily-face-cream">Daily Face Cream</a></body></html>`;
const reads: string[] = [];
const state = {
  blocked: false,
  modelFailure: false,
  invalidQuote: false,
  largeHome: false,
  readError: "",
  redirectHome: false,
  outage: false,
  rejectedSchema: false,
  invalidInsight: false,
  invalidOutput: false,
  noInsight: false,
};
const sourceHttp = await import("@/server/utils/http");
mock.module("@/server/utils/http", () => ({
  ...sourceHttp,
  page: async (
    url: string,
    options: { strictGuard?: boolean; limit?: number },
  ) => {
    assert.equal(options.strictGuard, true);
    assert.ok((options.limit ?? 0) <= 8 * 1024 * 1024);
    reads.push(url);
    if (!url.endsWith("robots.txt") && state.readError)
      return {
        success: false,
        error: Object.assign(new Error("Fixture transport failure"), {
          name: state.readError,
        }),
      };
    const body = url.endsWith("robots.txt")
      ? "User-agent: *\nAllow: /"
      : url.includes("/products/")
        ? productHtml()
        : `${home}${state.largeHome ? `<!--${"a".repeat(1600000)}-->` : ""}`;
    if (state.largeHome && !url.endsWith("robots.txt"))
      assert.ok((options.limit ?? 0) >= Buffer.byteLength(body));
    return {
      success: true,
      data: {
        url:
          state.redirectHome && !url.endsWith("robots.txt")
            ? "https://us.examplebeauty.test/"
            : url,
        body,
        status: url.endsWith("robots.txt")
          ? 200
          : state.blocked
            ? 403
            : state.outage
              ? 503
              : 200,
        headers: new Headers(),
      },
    };
  },
}));
const key = "fixture-azure-key";
Object.assign(process.env, {
  AZURE_RESOURCE_NAME: "fixture-resource",
  AZURE_API_KEY: key,
  AZURE_DEPLOYMENT_GPT: "fixture-deployment",
  AZURE_API_VERSION: "2024-10-21",
});
mock.module("@/server/app/outbound/provider-credentials", () => ({
  resolveKey: async () => ({ success: true, data: "fixture-apollo-key" }),
}));
const calls: Record<string, unknown>[] = [];
const field = (record: Record<string, unknown>, key: string) => record[key];
const companyRequests: string[] = [];
const organizationState = {
  missingCountry: false,
  interrupted: false,
  wrongDomain: false,
};
globalThis.fetch = mock(async (_url, options) => {
  if (String(_url).includes("/organizations/enrich")) {
    companyRequests.push(String(_url));
    assert.equal(options?.method, "GET");
    assert.equal(
      new Headers(options?.headers).get("x-api-key"),
      "fixture-apollo-key",
    );
    if (organizationState.interrupted) throw new Error("Disconnected");
    return Response.json({
      organization: {
        id: company.sourceId,
        name: company.name,
        primary_domain: organizationState.wrongDomain
          ? "another.test"
          : company.domain,
        country: organizationState.missingCountry ? null : "United States",
        estimated_num_employees: company.teamSize,
        technology_names: ["Shopify"],
      },
    });
  }
  if (String(_url).includes("/people/match"))
    return Response.json({
      person: {
        id: "person123",
        name: "Alex Doe",
        first_name: "Alex",
        last_name: "Doe",
        title: "Head of Ecommerce",
        email: "alex@examplebeauty.test",
        email_status: "verified",
        time_zone: "America/New_York",
        organization: { name: company.name, primary_domain: company.domain },
      },
    });
  const body = JSON.parse(String(options?.body ?? "{}")) as Record<
    string,
    unknown
  >;
  calls.push(body);
  assert.equal(options?.redirect, "error");
  assert.equal(new Headers(options?.headers).get("api-key"), key);
  // Azure rejects z.url()'s URI format before generation. The wire schema has
  // plain required strings; strict local validation still runs after receipt.
  const outputSchema = (
    field(body, "response_format") as { json_schema: { schema: unknown } }
  ).json_schema.schema;
  assert.equal(JSON.stringify(outputSchema).includes('"format"'), false);
  assert.equal(JSON.stringify(outputSchema).includes('"minLength"'), false);
  if (state.rejectedSchema)
    return Response.json(
      {
        error: {
          message: "Invalid schema: uri is not a valid format.",
          type: "invalid_request_error",
        },
      },
      { status: 400 },
    );
  if (state.modelFailure)
    return Response.json(
      { type: "error", error: { type: "overloaded_error", message: key } },
      { status: 503 },
    );
  const payload = JSON.parse(
    (field(body, "messages") as { role: string; content: string }[]).find(
      (message) => message.role === "user",
    )?.content ?? "{}",
  );
  const sources = payload.sources as { url: string; excerpt: string }[];
  const store = sources.find((source) => source.url === company.website);
  assert.ok(store);
  const quote = {
    url: company.website,
    quote: state.invalidQuote
      ? "Fabricated public claim never observed"
      : "We make our own skincare products.",
  };
  const assessment = {
    decision: "qualified",
    reason: "Own skincare brand with an observed team.",
    productCategory: "face cream",
    ownBrandEvidence: quote,
    physicalProductEvidence: {
      url: company.website,
      quote: "Our team of 15 creates physical face creams.",
    },
    establishedEvidence: {
      url: company.website,
      quote: "Our team of 15 creates physical face creams.",
    },
    criteriaEvidence: [quote],
    criteriaSatisfied: true,
    productInsight: state.noInsight
      ? null
      : {
          sourceUrl: state.invalidOutput
            ? "not a URL"
            : `${company.website}/products/daily-face-cream`,
          sourceQuote: product.description,
          feature: state.invalidInsight
            ? "clinically proven wrinkle prevention"
            : "a replaceable refill cartridge",
          kind: "design",
          relevance:
            "A shopper comparing refillable skincare can ask whether the reusable container and refill system meet their needs.",
        },
  };
  return Response.json(
    {
      id: "chatcmpl_auto",
      object: "chat.completion",
      created: 1780000000,
      model: "fixture-deployment",
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: JSON.stringify(assessment) },
          finish_reason: "stop",
        },
      ],
      usage: { prompt_tokens: 400, completion_tokens: 120, total_tokens: 520 },
    },
    { headers: { "apim-request-id": "req_auto" } },
  );
}) as unknown as typeof fetch;

const Qualification = await import(
  "@/server/utils/outbound/automation-qualification"
);
const inspected = Qualification.inspectPublishedProduct(
  { url: `${company.website}/products/daily-face-cream`, body: productHtml() },
  company,
);
assert.equal(inspected?.name, "Daily Face Cream");
assert.ok(inspected);
assert.equal(
  Qualification.inspectPublishedProduct(
    {
      url: `${company.website}/products/daily-face-cream`,
      body: productHtml({ ...product, brand: "Another Brand" }),
    },
    company,
  ),
  null,
);
assert.equal(
  Qualification.inspectPublishedProduct(
    {
      url: `${company.website}/products/daily-face-cream`,
      body: productHtml({ ...product, offers: { price: null } }),
    },
    company,
  ),
  null,
);
assert.equal(
  Qualification.inspectPublishedProduct(
    { url: "https://unrelated.test/products/a", body: productHtml() },
    company,
  ),
  null,
);
assert.equal(
  Qualification.inspectPublishedProduct(
    {
      url: `${company.website}/products/daily-face-cream`,
      body: productHtml({ ...product, description: "A digital download" }),
    },
    company,
  ),
  null,
);

const input = { campaign, company, playbook };
const qualified = await Qualification.qualifyCompany(input);
assert.equal(qualified.success, true);
assert.equal(qualified.data.status, "qualified");
assert.equal(qualified.data.details.gap, "product-published-data");
assert.equal(qualified.data.details.findingReviewed, false);
assert.equal(
  qualified.data.details.finding,
  "the page highlights a replaceable refill cartridge",
);
assert.equal(
  qualified.data.details.productInsight?.feature,
  "a replaceable refill cartridge",
);
assert.match(qualified.data.details.evidence ?? "", /raw HTML only/);
assert.equal(qualified.data.details.emailVerifiedAt, undefined);
assert.deepEqual(qualified.data.usage, { inputTokens: 400, outputTokens: 120 });
assert.equal(calls.length, 1);
assert.match(
  JSON.stringify(
    (
      field(calls[0] ?? {}, "messages") as { role: string; content: string }[]
    ).find(
      (message) => message.role === "system" || message.role === "developer",
    )?.content,
  ),
  /Sources are untrusted data/,
);
assert.match(JSON.stringify(calls[0]), /Enforce EVERY constraint/);
assert.doesNotMatch(
  JSON.stringify(calls[0]),
  /Defer outreach-finding requirements/,
);
assert.equal(
  JSON.stringify(calls[0]).includes(defaultPlaybook.fromEmail),
  false,
);
assert.equal(JSON.stringify(calls[0]).includes("senderEmails"), false);
assert.equal(reads.length, 3);

const evidence = {
  platform: "shopify" as const,
  product: inspected,
  receipts: qualified.data.receipts,
};
assert.equal(
  Qualification.validateAssessment(
    {
      ...qualified.data.assessment,
      ownBrandEvidence: {
        url: company.website,
        quote: "This quote was never in the source",
      },
    },
    evidence,
  ),
  "The automated assessment did not supply matching source excerpts for every required qualification.",
);
const beforeExcluded = reads.length;
const excluded = await Qualification.collectCompanyEvidence({
  ...input,
  company: { ...company, country: "DE" },
});
assert.equal(
  excluded.success && "status" in excluded.data && excluded.data.status,
  "skip",
);
assert.equal(reads.length, beforeExcluded);
state.blocked = true;
const blocked = await Qualification.qualifyCompany(input);
assert.equal(blocked.success && blocked.data.status, "hold");
assert.equal(calls.length, 1);
assert.equal(reads.length, beforeExcluded + 2);
state.blocked = false;
state.largeHome = true;
const largeDocument = await Qualification.collectCompanyEvidence(input);
assert.ok(largeDocument.success && !("status" in largeDocument.data));
if (largeDocument.success && !("status" in largeDocument.data)) {
  assert.equal(largeDocument.data.product.name, product.name);
  assert.ok(
    largeDocument.data.receipts.every(
      (receipt) => receipt.excerpt.length <= 18000,
    ),
  );
}
state.largeHome = false;
for (const [name, expected, retryable] of [
  ["response-too-large-error", "8 MiB collection limit", false],
  ["timeout-error", "time limit", true],
  ["TypeError", "failed before a complete document", true],
] as const) {
  state.readError = name;
  const failure = await Qualification.collectCompanyEvidence(input);
  assert.ok(failure.success && "status" in failure.data);
  if (failure.success && "status" in failure.data) {
    assert.ok(failure.data.reason.includes(expected));
    assert.equal(failure.data.retryable, retryable);
    assert.equal(failure.data.reason.includes("restricted"), false);
  }
}
state.readError = "";
state.outage = true;
const outage = await Qualification.collectCompanyEvidence(input);
assert.ok(outage.success && "status" in outage.data && outage.data.retryable);
if (outage.success && "status" in outage.data)
  assert.match(outage.data.reason, /temporarily unavailable/);
state.outage = false;
state.redirectHome = true;
const redirect = await Qualification.collectCompanyEvidence(input);
assert.ok(redirect.success && "status" in redirect.data);
if (redirect.success && "status" in redirect.data) {
  assert.match(redirect.data.reason, /another host/);
  assert.equal(redirect.data.reason.includes("restricted"), false);
  assert.equal(redirect.data.retryable, false);
}
state.redirectHome = false;
assert.equal(calls.length, 1);
state.modelFailure = true;
const failed = await Qualification.assessCompanyEvidence({
  ...input,
  evidence,
});
assert.equal(failed.success, false);
if (!failed.success) {
  assert.equal("code" in failed.error && failed.error.code, "uncertain");
  assert.equal(JSON.stringify(failed).includes(key), false);
}
assert.equal(calls.length, 2);
state.modelFailure = false;
state.rejectedSchema = true;
const rejectedSchema = await Qualification.assessCompanyEvidence({
  ...input,
  evidence,
});
assert.equal(rejectedSchema.success, false);
if (!rejectedSchema.success) {
  assert.equal(
    "code" in rejectedSchema.error && rejectedSchema.error.code,
    "contract",
  );
  assert.equal(
    "statusCode" in rejectedSchema.error && rejectedSchema.error.statusCode,
    400,
  );
  assert.equal(
    "receipt" in rejectedSchema.error &&
      (rejectedSchema.error.receipt as { statusCode: number }).statusCode,
    400,
  );
}
assert.equal(calls.length, 3);
state.rejectedSchema = false;
state.invalidOutput = true;
const invalidOutput = await Qualification.assessCompanyEvidence({
  ...input,
  evidence,
});
assert.equal(invalidOutput.success, false);
assert.equal(calls.length, 4);
state.invalidOutput = false;
state.invalidInsight = true;
const weakInsight = await Qualification.qualifyCompany(input);
assert.equal(weakInsight.success && weakInsight.data.status, "hold");
if (weakInsight.success && weakInsight.data.status === "hold") {
  assert.equal(
    weakInsight.data.assessment?.productInsight?.feature,
    "clinically proven wrinkle prevention",
  );
  assert.equal(weakInsight.data.observedProduct?.name, product.name);
}
assert.equal(calls.length, 5);
state.invalidInsight = false;

// The live campaign mixes business fit and a later research finding in one
// objective. Qualification must preserve the criteria without demanding a
// shopper-query receipt before the coordinator has reached that stage.
state.noInsight = true;
const shoppingCampaign = {
  ...campaign,
  criteria: {
    ...campaign.criteria,
    objective:
      "Find established US brands that make and sell their own physical, barcoded products on their own Shopify or WooCommerce store, where one checkable product-data gap on a named product makes them harder for AI shopping assistants to pick, so ecentic can open with that finding and offer a free AI shopping check. This is the cold brand lane; enterprise, bigger commerce, travel and agency prospects belong to their own campaigns.",
    qualificationNotes:
      "Own skincare products and an established team. Before contact research, staff check one verified finding on a named product, re-checked within 7 days of approval.",
  },
};
const shopping = await Qualification.qualifyCompany({
  ...input,
  campaign: shoppingCampaign,
  playbook: { ...playbook, requireShoppingEvidence: true },
});
assert.ok(shopping.success && shopping.data.status === "qualified");
if (shopping.success && shopping.data.status === "qualified") {
  assert.equal(shopping.data.assessment.productInsight, null);
  assert.equal(shopping.data.details.shoppingResearchId, undefined);
  assert.equal(shopping.data.details.findingReviewed, false);
  assert.equal(
    Qualification.validateAssessment(shopping.data.assessment, evidence, false),
    null,
  );
  // Deferring a shopping finding must not relax business fit or source binding.
  for (const assessment of [
    { ...shopping.data.assessment, criteriaSatisfied: false },
    { ...shopping.data.assessment, criteriaEvidence: [] },
    { ...shopping.data.assessment, ownBrandEvidence: null },
    { ...shopping.data.assessment, physicalProductEvidence: null },
    { ...shopping.data.assessment, establishedEvidence: null },
    {
      ...shopping.data.assessment,
      criteriaEvidence: [
        { url: company.website, quote: "An unobserved business claim" },
      ],
    },
  ])
    assert.equal(
      Qualification.validateAssessment(assessment, evidence, false),
      "The automated assessment did not supply matching source excerpts for every required qualification.",
    );
  assert.notEqual(
    Qualification.validateAssessment(shopping.data.assessment, evidence),
    null,
  );
}
const shoppingMessages = field(calls.at(-1) ?? {}, "messages") as {
  role: string;
  content: string;
}[];
const shoppingSystem =
  shoppingMessages.find(
    (message) => message.role === "system" || message.role === "developer",
  )?.content ?? "";
assert.match(
  shoppingSystem,
  /company-fit qualification BEFORE live shopping research/,
);
assert.match(shoppingSystem, /Enforce every company-fit constraint/);
assert.match(
  shoppingSystem,
  /Defer outreach-finding requirements to the later shopping-research stage/,
);
assert.match(
  shoppingSystem,
  /live research and browser evidence gates must still pass/,
);
assert.doesNotMatch(shoppingSystem, /Enforce EVERY constraint/);
const shoppingPayload = JSON.parse(
  shoppingMessages.find((message) => message.role === "user")?.content ?? "{}",
);
assert.deepEqual(shoppingPayload.campaign.criteria, shoppingCampaign.criteria);
assert.equal(shoppingPayload.policy.targetingNotes, playbook.targetingNotes);

const replayInput = {
  ...input,
  campaign: shoppingCampaign,
  playbook: { ...playbook, requireShoppingEvidence: true },
  evidence,
};
const beforeReplay = {
  reads: reads.length,
  calls: calls.length,
  evidence: JSON.stringify(evidence),
};
const replayed = await Qualification.qualifyCompanyEvidence(replayInput);
assert.ok(replayed.success && replayed.data.status === "qualified");
assert.equal(reads.length, beforeReplay.reads);
assert.equal(calls.length, beforeReplay.calls + 1);
assert.equal(JSON.stringify(evidence), beforeReplay.evidence);
if (replayed.success && replayed.data.status === "qualified") {
  assert.deepEqual(replayed.data.receipts, evidence.receipts);
  assert.deepEqual(replayed.data.companyEvidence, evidence);
  assert.equal(
    replayed.data.details.evidenceCheckedAt,
    qualified.data.details.evidenceCheckedAt,
  );
}
const blockedReplays: Parameters<
  typeof Qualification.qualifyCompanyEvidence
>[0][] = [
  {
    ...replayInput,
    campaign: {
      ...shoppingCampaign,
      criteria: {
        ...shoppingCampaign.criteria,
        excludedDomains: [company.domain],
      },
    },
  },
  {
    ...replayInput,
    playbook: { ...replayInput.playbook, excludedDomains: company.domain },
  },
  {
    ...replayInput,
    playbook: { ...replayInput.playbook, excludedCompanies: company.name },
  },
  { ...replayInput, company: { ...company, country: null } },
  { ...replayInput, company: { ...company, country: "DE" } },
  {
    ...replayInput,
    playbook: { ...replayInput.playbook, allowedCountries: "CA" },
  },
  {
    ...replayInput,
    playbook: { ...replayInput.playbook, heldCountries: "US" },
  },
  {
    ...replayInput,
    campaign: {
      ...shoppingCampaign,
      criteria: { ...shoppingCampaign.criteria, teamSizeMin: 20 },
    },
  },
  {
    ...replayInput,
    company: { ...company, teamSize: null },
    campaign: {
      ...shoppingCampaign,
      criteria: { ...shoppingCampaign.criteria, teamSizeMin: 1 },
    },
  },
  {
    ...replayInput,
    company: { ...company, annualRevenue: 200 },
    campaign: {
      ...shoppingCampaign,
      criteria: { ...shoppingCampaign.criteria, annualRevenueMax: 100 },
    },
  },
  {
    ...replayInput,
    campaign: {
      ...shoppingCampaign,
      criteria: { ...shoppingCampaign.criteria, annualRevenueMin: 1 },
    },
  },
  {
    ...replayInput,
    company: { ...company, website: "http://examplebeauty.test" },
  },
  {
    ...replayInput,
    company: { ...company, website: "https://unrelated.test" },
  },
  {
    ...replayInput,
    campaign: {
      ...shoppingCampaign,
      criteria: { ...shoppingCampaign.criteria, platforms: ["woocommerce"] },
    },
  },
  {
    ...replayInput,
    evidence: { ...evidence, platform: "woocommerce" },
    campaign: {
      ...shoppingCampaign,
      criteria: { ...shoppingCampaign.criteria, platforms: ["shopify"] },
    },
  },
  {
    ...replayInput,
    evidence: {
      ...evidence,
      product: { ...evidence.product, url: "https://unrelated.test/product" },
    },
  },
  {
    ...replayInput,
    evidence: {
      ...evidence,
      product: { ...evidence.product, brand: "Unrelated Brand" },
    },
  },
  {
    ...replayInput,
    evidence: { ...evidence, product: { ...evidence.product, price: 49 } },
  },
  { ...replayInput, evidence: { ...evidence, receipts: [] } },
  {
    ...replayInput,
    evidence: {
      ...evidence,
      receipts: evidence.receipts.map((source) => ({
        ...source,
        checkedAt: "2020-01-01T00:00:00.000Z",
      })),
    },
  },
  {
    ...replayInput,
    evidence: {
      ...evidence,
      receipts: evidence.receipts.map((source) => ({
        ...source,
        checkedAt: new Date(Date.now() + 86400000).toISOString(),
      })),
    },
  },
  {
    ...replayInput,
    evidence: {
      ...evidence,
      receipts: evidence.receipts.map((source) => ({
        ...source,
        url: "https://unrelated.test/product",
      })),
    },
  },
  {
    ...replayInput,
    evidence: {
      ...evidence,
      receipts: evidence.receipts.map((source) => ({
        ...source,
        excerpt:
          source.excerpt.split("\nObserved structured product: ")[0] ?? "",
      })),
    },
  },
];
const beforeBlocked = { reads: reads.length, calls: calls.length };
for (const blockedInput of blockedReplays) {
  const blocked = await Qualification.qualifyCompanyEvidence(blockedInput);
  assert.ok(blocked.success && blocked.data.status !== "qualified");
}
assert.equal(reads.length, beforeBlocked.reads);
assert.equal(calls.length, beforeBlocked.calls);
state.invalidQuote = true;
const heldReplay = await Qualification.qualifyCompanyEvidence(replayInput);
assert.ok(heldReplay.success && heldReplay.data.status === "hold");
if (heldReplay.success && heldReplay.data.status === "hold")
  assert.deepEqual(heldReplay.data.companyEvidence, evidence);
assert.equal(reads.length, beforeBlocked.reads);
state.invalidQuote = false;
state.noInsight = false;

const enrichedCompany = await Qualification.enrichCompany({ company });
assert.equal(enrichedCompany.success, true);
assert.equal(enrichedCompany.data.country, "US");
assert.equal(enrichedCompany.data.teamSize, 15);
assert.equal(enrichedCompany.data.platform, "shopify");
assert.equal(
  companyRequests[0],
  "https://api.apollo.io/api/v1/organizations/enrich?domain=examplebeauty.test",
);
organizationState.missingCountry = true;
const missingCountry = await Qualification.enrichCompany({ company });
assert.equal(missingCountry.success, true);
assert.equal(missingCountry.data.country, null);
organizationState.wrongDomain = true;
assert.equal((await Qualification.enrichCompany({ company })).success, false);
organizationState.interrupted = true;
const interrupted = await Qualification.enrichCompany({ company });
assert.equal(interrupted.success, false);
assert.equal(
  "code" in interrupted.error && interrupted.error.code,
  "uncertain",
);
assert.equal(companyRequests.length, 4);
const Providers = await import("@/server/utils/outbound/providers");
const enrichedPerson = await Providers.enrichApolloPerson({ id: "person123" });
assert.equal(enrichedPerson.success, true);
assert.equal(enrichedPerson.data?.timezone, "America/New_York");

const person: Person = {
  id: "person123",
  name: "Alex Doe",
  first: "Alex",
  title: "Head of Ecommerce",
  domain: company.domain,
  company: company.name,
  linkedinUrl: "https://www.linkedin.com/in/alex-fixture",
  email: "alex@examplebeauty.test",
  emailStatus: "verified",
  matchConfidence: "high",
  source: "apollo",
  timezone: "America/New_York",
};
const contacts = {
  people: [person],
  company,
  criteria: campaign.criteria,
  playbook,
  observedAt: new Date().toISOString(),
};
const selected = Qualification.selectContact(contacts);
assert.equal(selected.status, "selected");
if (selected.status === "selected") {
  assert.equal(selected.provisional, false);
  assert.equal(selected.details.emailStatus, "unknown");
  assert.equal(selected.details.emailVerifiedAt, "");
  assert.equal(selected.details.timezone, "America/New_York");
}
const provisional = Qualification.selectContact({
  ...contacts,
  people: [{ ...person, domain: "", name: "Alex", timezone: null }],
});
assert.equal(provisional.status, "selected");
if (provisional.status === "selected") {
  assert.equal(provisional.provisional, true);
  assert.equal(provisional.details.roleSource, "");
  assert.equal(provisional.details.roleCheckedAt, "");
  assert.equal(provisional.details.timezone, "");
}
assert.equal(
  Qualification.selectContact({
    ...contacts,
    people: [{ ...person, domain: "another.test" }],
  }).status,
  "hold",
);
const leadershipRoles = [
  "VP Digital",
  "Director of Digital Product",
  "CMO",
  "Marketing Manager",
];
const leadershipContacts = {
  ...contacts,
  company: { ...company, teamSize: 150 },
  criteria: { ...contacts.criteria, targetRoles: leadershipRoles },
  playbook: { ...playbook, targetRoles: leadershipRoles.join("\n") },
  people: [
    {
      ...person,
      id: "assistant",
      title: "International Assistant Marketing Manager",
    },
    { ...person, id: "manager", title: "Global Marketing Manager" },
    { ...person, id: "vp", title: "Vice President of Digital & eCommerce" },
    {
      ...person,
      id: "director",
      title: "Director, Digital Product & eCommerce",
    },
    { ...person, id: "cmo", title: "Chief Marketing Officer" },
  ],
};
const best = Qualification.selectContact(leadershipContacts);
assert.equal(best.status, "selected");
if (best.status === "selected") assert.equal(best.person.id, "vp");
const next = Qualification.selectContact({
  ...leadershipContacts,
  excludedIds: ["vp"],
});
assert.equal(next.status, "selected");
if (next.status === "selected") assert.equal(next.person.id, "director");
const marketing = Qualification.selectContact({
  ...leadershipContacts,
  excludedIds: ["vp", "director"],
});
assert.equal(marketing.status, "selected");
if (marketing.status === "selected") assert.equal(marketing.person.id, "cmo");
for (const title of [
  "Assistant Marketing Manager",
  "Junior Marketing Manager",
  "Jr. Marketing Manager",
  "Marketing Manager Trainee",
]) {
  assert.equal(
    Qualification.selectContact({
      ...leadershipContacts,
      people: [{ ...person, title }],
    }).status,
    "hold",
  );
}
assert.equal(
  Qualification.selectContact({
    ...leadershipContacts,
    criteria: {
      ...leadershipContacts.criteria,
      targetRoles: ["Marketing Manager"],
    },
    people: [{ ...person, title: "Vice President of Digital & eCommerce" }],
  }).status,
  "hold",
);
assert.equal(
  Qualification.selectContact({
    ...contacts,
    people: [{ ...person, domain: "", company: "Different business" }],
  }).status,
  "hold",
);
assert.equal(
  Qualification.selectContact({
    ...contacts,
    company: { ...company, teamSize: null },
    people: [{ ...person, title: "Founder" }],
  }).status,
  "hold",
);
assert.equal(
  Qualification.selectContact({
    ...contacts,
    observedAt: "2020-01-01T00:00:00.000Z",
  }).status,
  "hold",
);
console.log("Automatic qualification contracts passed");
