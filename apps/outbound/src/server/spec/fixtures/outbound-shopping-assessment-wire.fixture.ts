import { mock } from "bun:test";
import assert from "node:assert/strict";
import { defaultPlaybook } from "@/lib/outbound";
import { buildSyntheticShoppingEvidence } from "../helpers/outbound-shopping-fixture";

mock.module("server-only", () => ({}));
Object.assign(process.env, {
  AZURE_RESOURCE_NAME: "fixture-resource",
  AZURE_API_KEY: "fixture-only-key",
  AZURE_DEPLOYMENT_GPT: "gpt-5.3-chat",
  AZURE_API_VERSION: "v1",
});
const Shopping = await import("@/server/utils/outbound/shopping-assessment");
const original = await buildSyntheticShoppingEvidence({
  prospect: {
    company: "Sample Goods",
    domain: "samplegoods.com",
    product: "Linen tote",
    productUrl: "https://samplegoods.com/products/tote",
  },
});
const calls: {
  system: string;
  prompt: Record<string, unknown>;
  schema: Record<string, unknown>;
}[] = [];
const state: { outputs: unknown[]; failAt: number | null } = {
  outputs: [],
  failAt: null,
};
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
  assert.equal(body.max_completion_tokens, 2000);
  assert.equal(body.response_format.type, "json_schema");
  calls.push({
    system: body.messages[0].content,
    prompt: JSON.parse(body.messages.at(-1).content),
    schema: body.response_format.json_schema.schema,
  });
  if (state.failAt === calls.length)
    return Response.json(
      { error: { message: "Unavailable", type: "server_error" } },
      { status: 503 },
    );
  assert.ok(
    state.outputs[calls.length - 1],
    "No third or unplanned request is permitted",
  );
  return Response.json({
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
  });
}) as unknown as typeof fetch;
const run = (
  outputs: unknown[],
  options: {
    failAt?: number;
    deadline?: number;
    evidence?: typeof original.evidence;
  } = {},
) => {
  calls.length = 0;
  state.outputs = outputs;
  state.failAt = options.failAt ?? null;
  return Shopping.assess({
    ...(options.evidence ?? original.evidence),
    playbook: defaultPlaybook,
    deadline: options.deadline ?? Date.now() + 60000,
  });
};
const value = <T>(
  result: { success: true; data: T } | { success: false; error: Error },
): T => {
  if (!result.success) throw result.error;
  return result.data;
};
const saved = value(await run([original.selection]));
assert.equal(saved.status, "researched");
assert.equal(calls.length, 1);
assert.equal(saved.attempts, 1);
assert.deepEqual(
  Object.keys(calls[0]!.schema["properties"] as object).sort(),
  [
    "correctness",
    "decision",
    "description",
    "listed",
    "pageDataIssue",
    "priceComparison",
    "productAttributes",
    "reason",
  ].sort(),
);
assert.equal(
  calls[0]!.prompt["findingWordBudget"],
  undefined,
  "Fact selection does not generate email prose",
);
if (saved.status === "researched")
  assert.deepEqual(saved.receipt.sources, original.receipt.sources);
const invalid = {
  ...original.selection,
  listed: original.selection.listed.map((item) => ({
    ...item,
    name: "Invented Shop",
  })),
};
const repaired = value(await run([invalid, original.selection]));
assert.equal(repaired.status, "researched");
assert.equal(calls.length, 2);
assert.deepEqual(calls[1]!.prompt["priorSelection"], invalid);
assert.deepEqual(
  calls[0]!.prompt["quoteCatalog"],
  calls[1]!.prompt["quoteCatalog"],
);
assert.equal(value(await run([invalid, invalid])).status, "held");
assert.equal(calls.length, 2, "One factual repair only; no weaker fallback");
const modelHold = {
  ...original.selection,
  decision: "hold",
  reason: "No supported finding",
};
assert.equal(value(await run([modelHold])).status, "held");
assert.equal(calls.length, 1);
for (const failAt of [1, 2]) {
  const failed = await run([invalid, original.selection], { failAt });
  assert.equal(failed.success, false);
  assert.equal(
    calls.length,
    failAt,
    "Interrupted provider response is not retried",
  );
  if (!failed.success)
    assert.match(failed.error.message, /reconcile this stage/);
}
const damaged = structuredClone(original.evidence);
damaged.answer.raw[0]!.body += " changed";
assert.equal(value(await run([], { evidence: damaged })).status, "held");
assert.equal(
  calls.length,
  0,
  "Corrupt raw evidence must hold before assessment",
);
assert.equal(
  value(await run([], { deadline: Date.now() + 1000 })).status,
  "held",
);
assert.equal(calls.length, 0);
console.info("Shopping fact assessment wire contracts passed");
