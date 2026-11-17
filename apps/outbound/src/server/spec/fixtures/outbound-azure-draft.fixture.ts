import { mock } from "bun:test";
import assert from "node:assert/strict";
import { z } from "zod";

mock.module("server-only", () => ({}));
Object.assign(process.env, {
  AZURE_RESOURCE_NAME: "fixture-resource",
  AZURE_API_KEY: "fixture-only-key",
  AZURE_DEPLOYMENT_GPT: "gpt-5.3-chat",
  AZURE_API_VERSION: "v1",
});
const calls: string[] = [];
const state = { fail: false };
globalThis.fetch = mock(async (url, options) => {
  calls.push(String(url));
  assert.equal(new URL(String(url)).pathname, "/openai/v1/chat/completions");
  assert.equal(options?.redirect, "error");
  assert.equal(options?.cache, "no-store");
  assert.ok(options?.signal);
  assert.equal(
    new Headers(options?.headers).get("api-key"),
    "fixture-only-key",
  );
  const body = JSON.parse(String(options?.body));
  assert.equal(body.max_completion_tokens, 2000);
  assert.equal(body.response_format.type, "json_schema");
  assert.equal(
    body.messages.at(0).content,
    "Preserve the supported feature and proposed check.",
  );
  if (state.fail)
    return Response.json(
      { error: { message: "Unavailable", type: "server_error" } },
      { status: 503 },
    );
  return Response.json({
    id: "chatcmpl_fixture",
    object: "chat.completion",
    created: 1780000000,
    model: "gpt-5.3-chat",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: JSON.stringify({
            subject: "Daily Face Cream",
            body: "A fixture draft.",
          }),
        },
        finish_reason: "stop",
      },
    ],
    usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 },
  });
}) as unknown as typeof fetch;

const AI = await import("@/server/utils/ai");
const input = {
  output: z.object({ subject: z.string(), body: z.string() }),
  instructions: "Preserve the supported feature and proposed check.",
  prompt: "Fixture only",
};
assert.deepEqual(await AI.generate(input), {
  subject: "Daily Face Cream",
  body: "A fixture draft.",
});
assert.equal(calls.length, 1);
state.fail = true;
await assert.rejects(() => AI.generate(input));
assert.equal(
  calls.length,
  2,
  "An ambiguous paid request must never retry automatically.",
);
console.info("Azure draft wire contracts passed");
