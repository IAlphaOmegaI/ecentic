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
  prompt: {
    findingWordBudget: number;
    previousAssessment?: unknown;
    quoteCatalog: unknown;
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
  calls.push({ system, prompt });
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
console.info("Shopping assessment copy contracts passed");
