import { mock } from "bun:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { defaultPlaybook } from "@/lib/outbound";
import type {
  AiCapture,
  BrowserResearch,
  RawCapture,
  Source,
} from "@/server/utils/outbound/live-shopping-contract";

mock.module("server-only", () => ({}));
Object.assign(process.env, {
  AZURE_RESOURCE_NAME: "fixture-resource",
  AZURE_API_KEY: "fixture-only-key",
  AZURE_DEPLOYMENT_GPT: "gpt-5.3-chat",
  AZURE_API_VERSION: "v1",
});
const Shopping = await import("@/server/utils/outbound/shopping-assessment");
const playbook = {
  ...defaultPlaybook,
  maxBodyWords: 99,
  bodyTemplate:
    "Hey {first}! {finding} {consequence} {founderLine} {callToAction} {optout} {signature}",
  productCheckIntro: "I'm Iseld, a founder of ecentic.",
  callToAction: "Worth a chat?",
  optout: "Reply no to opt out.",
  signature: "Iseld",
};
const fixture = () => {
  const timestamp = new Date().toISOString();
  const product = {
    name: "Linen tote",
    url: "https://samplegoods.com/products/tote",
  };
  const raw = (url: string, body: string): RawCapture => ({
    url,
    body,
    status: 200,
    receivedAt: timestamp,
    sha256: createHash("sha256").update(body).digest("hex"),
  });
  const source = (
    id: string,
    kind: Source["kind"],
    capture: Source["capture"],
    raw: RawCapture,
  ): Source => ({
    id,
    kind,
    capture,
    url: raw.url,
    content: raw.body,
    checkedAt: timestamp,
    artifact: `sha256:${raw.sha256}`,
  });
  const answerRaw = raw(
    "https://www.google.com/search?q=large+linen+tote",
    "Linen tote. Variant: large. Current price: USD 30. one-time purchase.",
  );
  const pageRaw = raw(
    product.url,
    "Linen tote. Variant: large. Current price: USD 25. one-time purchase.",
  );
  const ucpRaw = {
    ...raw("https://samplegoods.com/.well-known/ucp", "404 Not Found"),
    status: 404,
  };
  const answer: AiCapture = {
    job: {
      id: randomUUID(),
      submittedAt: timestamp,
      query: {
        product,
        category: "large linen tote",
        country: "US",
        surface: "google_ai_mode",
        prompt: "Where can I buy a large linen tote?",
      },
    },
    executedAt: timestamp,
    receivedAt: timestamp,
    answer: answerRaw.body,
    source: source("answer", "search", "provider", answerRaw),
    links: [],
    cached: false,
    raw: [answerRaw],
  };
  const browser: Extract<BrowserResearch, { status: "captured" }> = {
    status: "captured",
    sources: [
      source("product", "product", "browser", pageRaw),
      source("ucp", "ucp", "http", ucpRaw),
    ],
    raw: [pageRaw, ucpRaw],
    ucp: {
      url: "https://samplegoods.com/.well-known/ucp",
      status: "notObserved",
      httpStatus: 404,
      capabilities: [],
      sourceIds: ["ucp"],
    },
    checkout: {
      status: "notTested",
      sourceIds: [],
      notes: "No checkout interaction.",
    },
    candidates: [],
    limitations: ["Market was not independently established."],
  };
  const catalog = Shopping.createAssessmentCatalog({ answer, browser });
  const offer = (id: string, raw: RawCapture, price: string) => {
    const quote = catalog.quotes.find((quote) => quote.sourceId === id);
    assert.ok(quote);
    return {
      quoteId: quote.id,
      offer: raw.body,
      variant: "large",
      price,
      currency: "USD",
      currencyAnchor: "USD",
      condition: "one-time",
      conditionAnchor: "one-time purchase",
      marketAnchor: null,
    };
  };
  const selected = {
    kind: "product-data-gap",
    observation:
      "I checked the large Linen tote: the answer showed USD 30, while your page showed USD 25 for the same one-time purchase.",
    consequence: "That difference is limited to this answer.",
    askAbout: "the large Linen tote",
    priceComparison: {
      answer: offer("answer", answerRaw, "USD 30"),
      page: offer("product", pageRaw, "USD 25"),
    },
    answerQuoteId: catalog.quotes.find((quote) => quote.sourceId === "answer")!
      .id,
    productQuoteId: catalog.quotes.find(
      (quote) => quote.sourceId === "product",
    )!.id,
    quoteIds: catalog.quotes
      .filter((quote) => quote.sourceId !== "ucp")
      .map((quote) => quote.id),
  };
  const output = {
    decision: "supported",
    reason: "A same-variant price difference.",
    selected,
    competitors: [],
  };
  const long = {
    ...output,
    selected: {
      ...selected,
      observation: Array(4).fill(selected.observation).join(" "),
    },
  };
  return { answer, browser, output, long };
};
const calls: {
  system: string;
  schema: Record<string, unknown>;
  prompt: {
    findingWordBudget: number;
    previousAssessment?: unknown;
    quoteCatalog: unknown;
    reassessmentMode?: string;
    rejectionReason?: string;
  };
}[] = [];
const state: {
  outputs: unknown[];
  failAt: number | null;
  afterCall?: () => void;
} = { outputs: [], failAt: null };
globalThis.fetch = mock(async (url, options) => {
  assert.equal(new URL(String(url)).pathname, "/openai/v1/chat/completions");
  assert.equal(
    new URL(String(url)).hostname,
    "fixture-resource.openai.azure.com",
  );
  assert.equal(options?.redirect, "error");
  assert.equal(options?.cache, "no-store");
  assert.ok(options?.signal);
  const body = JSON.parse(String(options?.body));
  assert.equal(body.max_completion_tokens, 3500);
  assert.equal(body.response_format.type, "json_schema");
  const system = body.messages[0].content;
  const prompt = JSON.parse(body.messages.at(-1).content);
  calls.push({
    system,
    prompt,
    schema: body.response_format.json_schema.schema,
  });
  state.afterCall?.();
  if (state.failAt === calls.length)
    return Response.json(
      { error: { message: "Unavailable", type: "server_error" } },
      { status: 503 },
    );
  assert.ok(
    state.outputs[calls.length - 1],
    "No third request or unplanned provider call is permitted.",
  );
  return Response.json(
    {
      id: `chatcmpl_${calls.length}`,
      object: "chat.completion",
      created: 1780000000,
      model: "gpt-5.3-chat",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: JSON.stringify(state.outputs[calls.length - 1]),
          },
          finish_reason: "stop",
        },
      ],
      usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 },
    },
    { headers: { "apim-request-id": `request-${calls.length}` } },
  );
}) as unknown as typeof fetch;
const run = (
  evidence: ReturnType<typeof fixture>,
  outputs: unknown[],
  options: {
    failAt?: number;
    deadline?: number;
    playbook?: typeof playbook;
  } = {},
) => {
  calls.length = 0;
  state.outputs = outputs;
  state.failAt = options.failAt ?? null;
  return Shopping.assess({
    ...evidence,
    playbook: options.playbook ?? playbook,
    deadline: options.deadline ?? Date.now() + 60000,
  });
};
const value = <Data>(
  result: { success: true; data: Data } | { success: false; error: Error },
): Data => {
  if (!result.success) throw result.error;
  return result.data;
};
const original = fixture();
const recovered = value(await run(original, [original.long, original.output]));
assert.equal(recovered.status, "researched");
assert.equal(calls.length, 2);
const initial = calls[0];
const revision = calls[1];
assert.ok(initial && revision);
assert.equal(initial.prompt.findingWordBudget, 79);
assert.equal(initial.prompt.previousAssessment, undefined);
assert.deepEqual(revision.prompt.previousAssessment, original.long);
assert.deepEqual(initial.prompt.quoteCatalog, revision.prompt.quoteCatalog);
assert.match(revision.system, /preserving all factual qualifications/);
assert.deepEqual(recovered.usage, { inputTokens: 40, outputTokens: 20 });
assert.deepEqual(recovered.providerRequestIds, ["request-1", "request-2"]);
assert.equal(recovered.providerRequestId, "request-2");
if (recovered.status === "researched") {
  assert.equal(
    recovered.receipt.selected.observation,
    original.output.selected.observation,
  );
  assert.deepEqual(recovered.receipt.sources, [
    original.answer.source,
    ...original.browser.sources,
  ]);
}
const expanded = {
  ...original.output,
  selected: {
    ...original.output.selected,
    observation: Array(2).fill(original.output.selected.observation).join(" "),
  },
};
assert.equal(value(await run(original, [expanded])).status, "researched");
assert.equal(
  calls.length,
  1,
  "A finding above 45 words that fits the template needs no reassessment.",
);
const stillLong = value(await run(original, [original.long, original.long]));
assert.equal(stillLong.status, "held");
assert.equal(calls.length, 2);
if (stillLong.status === "held") assert.match(stillLong.reason, /more words/);
const changed = {
  ...original.output,
  selected: { ...original.output.selected, askAbout: "a different product" },
};
const rejected = value(await run(original, [original.long, changed]));
assert.equal(rejected.status, "held");
if (rejected.status === "held")
  assert.match(rejected.reason, /changed the selected finding/);
assert.equal(calls.length, 2);
const falsePrice = {
  ...original.output,
  selected: {
    ...original.output.selected,
    observation: "The answer showed USD 999 for this same option.",
  },
};
const invalid = value(await run(original, [original.long, falsePrice]));
assert.equal(invalid.status, "held");
if (invalid.status === "held") assert.match(invalid.reason, /amount outside/);
const inventedMarket = {
  ...original.output,
  selected: {
    ...original.output.selected,
    consequence: "This difference affects US shoppers.",
  },
};
const invented = value(await run(original, [original.long, inventedMarket]));
assert.equal(invented.status, "held");
if (invented.status === "held")
  assert.match(invented.reason, /did not establish a US market/);
const differentVariant = {
  ...original.long,
  selected: {
    ...original.long.selected,
    priceComparison: {
      ...original.long.selected.priceComparison,
      page: {
        ...original.long.selected.priceComparison.page,
        variant: "small",
      },
    },
  },
};
assert.equal(value(await run(original, [differentVariant])).status, "held");
assert.equal(
  calls.length,
  1,
  "A factual failure does not purchase a copy reassessment.",
);
const damaged = fixture();
const capture = damaged.answer.raw[0];
assert.ok(capture);
capture.body += " changed";
assert.equal(value(await run(damaged, [damaged.long])).status, "held");
assert.equal(
  calls.length,
  1,
  "Broken source lineage does not purchase a copy reassessment.",
);
for (const failAt of [1, 2]) {
  const failed = await run(original, [original.long, original.output], {
    failAt,
  });
  assert.equal(failed.success, false);
  assert.equal(
    calls.length,
    failAt,
    "An interrupted provider response is not retried.",
  );
  if (!failed.success)
    assert.match(failed.error.message, /Reconcile this stage/);
}
assert.equal(
  value(
    await run(original, [], { playbook: { ...playbook, maxBodyWords: 10 } }),
  ).status,
  "held",
);
assert.equal(calls.length, 0);
assert.equal(
  value(await run(original, [], { deadline: Date.now() + 1000 })).status,
  "held",
);
assert.equal(calls.length, 0);
const clock = { now: Date.now() };
const realNow = Date.now;
Date.now = () => clock.now;
state.afterCall = () => {
  clock.now += 1000;
};
assert.equal(
  value(await run(original, [original.long], { deadline: clock.now + 5500 }))
    .status,
  "held",
);
assert.equal(
  calls.length,
  1,
  "Do not reassess when fewer than five seconds remain.",
);
Date.now = realNow;
state.afterCall = undefined;

const observationSettings = { ...playbook, allowProductObservations: true };
const neutral = {
  ...original.output,
  reason: "The merchant explicitly lists a large Linen tote.",
  selected: {
    ...original.output.selected,
    kind: "product-observation",
    observation: "I was looking at linen totes and opened your product page.",
    consequence: "The page lists a large option.",
    priceComparison: null,
  },
};
const falseComparison = {
  ...original.output,
  selected: { ...original.output.selected, priceComparison: null },
};
const fallback = value(
  await run(original, [falseComparison, neutral], {
    playbook: observationSettings,
  }),
);
assert.equal(fallback.status, "researched");
assert.equal(calls.length, 2);
assert.deepEqual(fallback.neutralFallback?.originalOutput, falseComparison);
assert.match(
  fallback.neutralFallback?.originalReason ?? "",
  /comparable local offer/,
);
assert.equal(fallback.neutralFallback?.outcome, "researched");
assert.equal(fallback.neutralFallback?.originalAssessment.decision, "hold");
assert.deepEqual(fallback.providerRequestIds, ["request-1", "request-2"]);
assert.deepEqual(fallback.usage, { inputTokens: 40, outputTokens: 20 });
const neutralCall = calls[1];
assert.ok(neutralCall);
assert.equal(neutralCall.prompt.reassessmentMode, "neutral");
assert.deepEqual(neutralCall.prompt.previousAssessment, falseComparison);
assert.match(neutralCall.system, /only neutral fallback/);
assert.match(neutralCall.system, /merchant product excerpts/);
assert.match(neutralCall.system, /Do not put numeric percentages/);
assert.match(
  neutralCall.system,
  /ingredient concentrations.*clinical statistics/,
);
assert.match(neutralCall.system, /Attribute every fact to the source/);
const neutralSchema = JSON.stringify(neutralCall.schema);
assert.ok(!neutralSchema.includes('"product-data-gap"'));
assert.ok(!neutralSchema.includes('"query-comparison"'));
assert.ok(!neutralSchema.includes('"currencyAnchor"'));
const neutralQuotes = neutralCall.prompt.quoteCatalog as { sourceId: string }[];
assert.ok(
  neutralQuotes.every((quote) =>
    ["answer", "product"].includes(quote.sourceId),
  ),
);
if (fallback.status === "researched") {
  assert.deepEqual(fallback.receipt.sources, [
    original.answer.source,
    ...original.browser.sources,
  ]);
  assert.deepEqual(fallback.receipt.product, original.answer.job.query.product);
  assert.equal(
    fallback.receipt.queries[0]?.executedAt,
    original.answer.executedAt,
  );
  assert.equal(fallback.receipt.selected.kind, "product-observation");
  assert.deepEqual(fallback.receipt.competitors, []);
}
const competing = structuredClone(original);
const competitorRaw: RawCapture = {
  url: "https://otherbrand.com/products/tote",
  body: "Other Brand Synthetic tote has woven polyester handles.",
  status: 200,
  receivedAt: original.answer.receivedAt,
  sha256: createHash("sha256")
    .update("Other Brand Synthetic tote has woven polyester handles.")
    .digest("hex"),
};
competing.browser.raw.push(competitorRaw);
competing.browser.sources.push({
  id: "competitor",
  kind: "competitor",
  capture: "browser",
  url: competitorRaw.url,
  checkedAt: competitorRaw.receivedAt,
  content: competitorRaw.body,
  artifact: `sha256:${competitorRaw.sha256}`,
});
competing.browser.candidates.push({
  name: "Other Brand",
  product: "Synthetic tote",
  url: competitorRaw.url,
  sourceIds: ["competitor"],
});
const missingCompetitor = {
  ...falseComparison,
  selected: { ...falseComparison.selected, kind: "query-comparison" },
};
const recoveredComparison = value(
  await run(competing, [missingCompetitor, neutral], {
    playbook: observationSettings,
  }),
);
assert.equal(recoveredComparison.status, "researched");
assert.equal(calls.length, 2);
assert.equal(
  recoveredComparison.neutralFallback?.originalReason,
  "A comparison needs an inspected competing product.",
);
assert.ok(
  !JSON.stringify(calls[1]?.prompt.quoteCatalog).includes(competitorRaw.body),
  "The neutral fallback receives no competing-product excerpt to misattribute.",
);
for (const proposal of [
  {
    ...original.output,
    selected: {
      ...original.output.selected,
      observation: "The captured answer differs from the rendered page.",
    },
  },
  {
    ...neutral,
    selected: {
      ...neutral.selected,
      observation: "The page says this tote is 100% linen.",
    },
  },
  differentVariant,
]) {
  const repaired = value(
    await run(original, [proposal, neutral], { playbook: observationSettings }),
  );
  assert.equal(repaired.status, "researched");
  assert.equal(calls.length, 2);
  assert.deepEqual(repaired.neutralFallback?.originalOutput, proposal);
}
assert.equal(value(await run(original, [falseComparison])).status, "held");
assert.equal(
  calls.length,
  1,
  "Neutral recovery requires explicit policy permission.",
);
const modelHold = {
  decision: "hold",
  reason: "No supported fact in the merchant text.",
  selected: null,
  competitors: [],
};
assert.equal(
  value(await run(original, [modelHold], { playbook: observationSettings }))
    .status,
  "held",
);
assert.equal(
  calls.length,
  1,
  "The model's own hold is not an automatic paid retry.",
);
assert.equal(
  value(
    await run(damaged, [falseComparison], { playbook: observationSettings }),
  ).status,
  "held",
);
assert.equal(calls.length, 1, "Corrupt capture hashes cannot buy a fallback.");
const future = structuredClone(original);
const futureProduct = future.browser.sources[0];
assert.ok(futureProduct);
futureProduct.checkedAt = new Date(Date.now() + 86400000).toISOString();
assert.equal(
  value(await run(future, [falseComparison], { playbook: observationSettings }))
    .status,
  "held",
);
assert.equal(calls.length, 1, "Future-dated evidence cannot buy a fallback.");
const noRenderedPage = structuredClone(original);
const httpProduct = noRenderedPage.browser.sources[0];
assert.ok(httpProduct);
httpProduct.capture = "http";
assert.equal(
  value(await run(noRenderedPage, [], { playbook: observationSettings }))
    .status,
  "held",
);
assert.equal(
  calls.length,
  0,
  "HTTP-only evidence cannot form a rendered excerpt catalog.",
);
for (const replacement of [
  {
    ...neutral,
    selected: {
      ...neutral.selected,
      consequence: "The wrong information is losing sales.",
    },
  },
  {
    ...neutral,
    selected: {
      ...neutral.selected,
      consequence: "Your page lists this for USD 25.",
    },
  },
  {
    ...neutral,
    selected: {
      ...neutral.selected,
      consequence: "This is 100 percent linen.",
    },
  },
  {
    ...neutral,
    selected: {
      ...neutral.selected,
      consequence: "I bought one for my girlfriend.",
    },
  },
  {
    ...neutral,
    selected: {
      ...neutral.selected,
      observation: "I checked your page. ".repeat(30),
    },
  },
  modelHold,
]) {
  const failed = value(
    await run(original, [falseComparison, replacement], {
      playbook: observationSettings,
    }),
  );
  assert.equal(failed.status, "held");
  assert.equal(
    calls.length,
    2,
    "A rejected neutral fallback must never buy a third assessment.",
  );
  assert.equal(failed.neutralFallback?.outcome, "held");
  assert.deepEqual(failed.neutralFallback?.originalOutput, falseComparison);
}
const failedNeutral = value(
  await run(original, [falseComparison, neutral], {
    playbook: observationSettings,
    failAt: 2,
  }),
);
assert.equal(failedNeutral.status, "held");
assert.equal(failedNeutral.neutralFallback?.outcome, "uncertain");
assert.deepEqual(
  failedNeutral.neutralFallback?.originalOutput,
  falseComparison,
);
assert.equal(calls.length, 2);
assert.deepEqual(failedNeutral.providerRequestIds, ["request-1"]);
assert.deepEqual(failedNeutral.usage, {
  inputTokens: null,
  outputTokens: null,
});
const unknownInitial = await run(original, [falseComparison, neutral], {
  playbook: observationSettings,
  failAt: 1,
});
assert.equal(unknownInitial.success, false);
assert.equal(
  calls.length,
  1,
  "An unknown original provider outcome never starts a fallback.",
);
const invalidNeutralKind = value(
  await run(original, [falseComparison, original.output], {
    playbook: observationSettings,
  }),
);
assert.equal(invalidNeutralKind.status, "held");
assert.equal(invalidNeutralKind.neutralFallback?.outcome, "uncertain");
assert.equal(
  calls.length,
  2,
  "The constrained fallback schema rejects returning to a discrepancy.",
);
const brokenCopyThenNeutral = value(
  await run(original, [original.long, falseComparison], {
    playbook: observationSettings,
  }),
);
assert.equal(brokenCopyThenNeutral.status, "held");
assert.equal(brokenCopyThenNeutral.neutralFallback, undefined);
assert.equal(
  calls.length,
  2,
  "Copy recovery and neutral recovery cannot become a retry chain.",
);
console.info("Shopping assessment copy contracts passed");
