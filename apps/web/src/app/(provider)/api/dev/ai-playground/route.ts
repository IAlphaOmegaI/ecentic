import { resultify } from "@zenncore/utils";
import {
  jsonSchema,
  type LanguageModel,
  type LanguageModelUsage,
  streamObject,
} from "ai";
import { headers } from "next/headers";
import type {
  PlaygroundEvent,
  PlaygroundRun,
  PlaygroundUsage,
} from "@/lib/ai-playground";
import { auth } from "@/lib/auth";
import { isInternalStaff } from "@/server/database/validators";
import * as AI from "@/server/utils/ai";

// Reasoning models on a long prompt can sit well past the default.
export const maxDuration = 60;

const LABEL = "dev.playground";

const encoder = new TextEncoder();

type Emit = (event: PlaygroundEvent) => void;

type Settings = {
  model: LanguageModel;
  prompt: string;
  instructions?: string;
  temperature?: number;
  topP?: number;
  maxOutputTokens?: number;
  seed?: number;
};

const describe = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const toUsage = (usage: LanguageModelUsage): PlaygroundUsage => ({
  input: usage.inputTokens,
  output: usage.outputTokens,
  reasoning: usage.outputTokenDetails.reasoningTokens,
  cached: usage.inputTokenDetails.cacheReadTokens,
  total: usage.totalTokens,
});

// Text mode goes through the same instrumented `AI.stream` wrapper every product
// feature uses, so telemetry and error reporting behave identically.
const runText = async (settings: Settings, emit: Emit) => {
  const result = AI.stream({ label: LABEL, ...settings });

  for await (const part of result.fullStream) {
    switch (part.type) {
      case "text-delta":
        emit({ kind: "text", delta: part.text });
        break;
      case "reasoning-delta":
        emit({ kind: "reasoning", delta: part.text });
        break;
      case "finish":
        emit({ kind: "usage", usage: toUsage(part.totalUsage) });
        emit({ kind: "finish", reason: part.finishReason });
        break;
      case "error":
        emit({ kind: "error", message: describe(part.error) });
        break;
    }
  }
};

// Object mode takes a JSON Schema from the client, so it calls `streamObject`
// directly rather than `AI.stream` (whose output option is Zod-typed) — but keeps
// the same repair pass, which is what makes providers that fence or annotate
// their JSON parse at all.
const runObject = async (settings: Settings, schema: unknown, emit: Emit) => {
  const result = streamObject({
    ...settings,
    schema: jsonSchema(schema as Parameters<typeof jsonSchema>[0]),
    experimental_repairText: AI.repairText,
    experimental_telemetry: {
      isEnabled: true,
      functionId: `ai.${LABEL}`,
      recordInputs: false,
      recordOutputs: false,
    },
    onError: ({ error }) => emit({ kind: "error", message: describe(error) }),
  });

  // Raw deltas so a malformed or truncated response is still visible verbatim.
  for await (const delta of result.textStream) emit({ kind: "text", delta });

  const object = await resultify(() => result.object);

  if (object.success) emit({ kind: "object", value: object.data });
  else emit({ kind: "error", message: describe(object.error) });

  const usage = await resultify(() => result.usage);
  if (usage.success) emit({ kind: "usage", usage: toUsage(usage.data) });

  const finish = await resultify(() => result.finishReason);
  emit({ kind: "finish", reason: finish.success ? finish.data : "error" });
};

export const POST = async (request: Request) => {
  // The proxy matcher skips /api entirely, so this route guards itself. It runs
  // arbitrary prompts against every configured provider, so it holds the same bar
  // as the /dev page that calls it — ecentic staff only — once deployed. Local
  // development stays open so the sandbox needs no staff account to iterate on.
  if (process.env.NODE_ENV === "production") {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!isInternalStaff(session?.user.role))
      return new Response("Unauthorized", { status: 401 });
  }

  const run = (await request.json()) as PlaygroundRun;

  if (!run.model?.trim()) return new Response("Missing model", { status: 400 });
  if (!run.prompt?.trim())
    return new Response("Missing prompt", { status: 400 });

  const isObjectMode = run.mode === "object";
  const parsed = isObjectMode
    ? resultify(() => JSON.parse(run.schema ?? "") as unknown)
    : null;

  if (parsed && !parsed.success)
    return new Response(`Invalid JSON Schema — ${describe(parsed.error)}`, {
      status: 400,
    });

  const schema = parsed?.success ? parsed.data : null;

  if (isObjectMode && (typeof schema !== "object" || schema === null))
    return new Response("JSON Schema must be an object", { status: 400 });

  const settings: Settings = {
    model: AI.model(run.model.trim()),
    prompt: run.prompt,
    instructions: run.instructions?.trim() || undefined,
    temperature: run.temperature,
    topP: run.topP,
    maxOutputTokens: run.maxOutputTokens,
    seed: run.seed,
  };

  const stream = new ReadableStream<Uint8Array>({
    start: async (controller) => {
      const emit: Emit = (event) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));

      // A model that rejects on connect (bad deployment name, missing key) is the
      // single most common playground outcome — it belongs in the column, not as a
      // dead request.
      const outcome = await resultify(() =>
        isObjectMode
          ? runObject(settings, schema, emit)
          : runText(settings, emit),
      );

      if (!outcome.success)
        emit({ kind: "error", message: describe(outcome.error) });

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
      // Keeps proxies from buffering the stream into one chunk.
      "x-accel-buffering": "no",
    },
  });
};
