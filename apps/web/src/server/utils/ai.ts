import { createAzure } from "@ai-sdk/azure";
import { createStreamableValue } from "@ai-sdk/rsc";
import * as Sentry from "@sentry/nextjs";
import {
  generateObject,
  type LanguageModel,
  type RepairTextFunction,
  generateText as sdkGenerateText,
  streamText as sdkStreamText,
  streamObject,
} from "ai";
import { z } from "zod";

// Curated union of the model ids this app routes, per provider, with a
// `(string & {})` escape hatch. Restores autocomplete + typo-catching (the old
// GatewayModelId perk) while still accepting any string the resolver can route.
export type ModelId =
  // Azure OpenAI (ChatGPT) — logical id; the real deployment resolves via env.
  | "gpt-4o"
  | "gpt-4"
  // Anthropic — via gateway. `GATEWAY_ALIASES` maps these to its spelling.
  | "claude-sonnet-4-20250514"
  | "claude-sonnet-4-5"
  | "claude-sonnet-4-6"
  // Google — via gateway. 2.0-flash is absent: the gateway does not carry it.
  | "gemini-2.5-flash"
  | "gemini-3-flash-preview"
  // Perplexity — via gateway; ids match its spelling as-is.
  | "sonar"
  | "sonar-pro"
  // Preserves literal autocomplete while still accepting any provider/deployment id.
  | (string & Record<never, never>);

// Models occasionally wrap the JSON in markdown fences or surround it with
// prose/citations (Perplexity's sonar-pro especially, and Gemini when it
// "thinks out loud"). That makes the raw output unparsable and surfaces as
// NoObjectGeneratedError. Strip fences and extract the outermost `{ ... }` so
// the SDK can parse and validate instead of throwing.
export const repairText: RepairTextFunction = async ({ text }) => {
  const stripped = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return stripped.slice(start, end + 1);
};

// Two billing rails, and which one you get is decided by the SHAPE of the model
// argument, not by configuration: a provider instance calls that provider
// directly on its own key, while a bare `provider/model` string is resolved by
// the AI SDK's global provider — the Vercel AI Gateway — and billed to
// AI_GATEWAY_API_KEY.
//
// GPT runs direct on Azure, the one provider with a first-party key here.
// Everything Azure cannot serve (Claude, Gemini, Perplexity) goes through the
// gateway, so no per-vendor key is needed. To move a vendor back onto its own
// account later, give it a key and return a provider instance for its prefix.
const azure = createAzure({
  resourceName: process.env.AZURE_RESOURCE_NAME,
  apiKey: process.env.AZURE_API_KEY,
  // The provider targets Azure's v1 API surface, which accepts "preview" (latest
  // features incl. structured outputs) — NOT the older date-based versions.
  apiVersion: process.env.AZURE_API_VERSION ?? "preview",
});

// Azure serves models under DEPLOYMENT names, which differ from the base model
// name. Override via env when your deployment is named something other than the
// base id.
const deployment = (name: string) =>
  (name === "gpt-4o" && process.env.AZURE_DEPLOYMENT_GPT4O) || name;

// The gateway versions models with DOTS (`claude-sonnet-4.5`) where the native
// APIs use dashes or a date suffix (`claude-sonnet-4-5`, `-20250514`). Only the
// ids whose spelling actually differs need an entry; everything else is the
// native id with a provider prefix bolted on.
const GATEWAY_ALIASES: Record<string, string> = {
  "claude-sonnet-4-20250514": "claude-sonnet-4",
  "claude-sonnet-4-5": "claude-sonnet-4.5",
  "claude-sonnet-4-6": "claude-sonnet-4.6",
  "gemini-3-flash-preview": "gemini-3-flash",
};

// Resolves a logical model id to something `generateText`/`generateObject`
// accepts. ChatGPT on Azure is the default, so an id with no recognised prefix
// resolves to your Azure deployment as a provider instance (direct billing).
// claude*/gemini*/sonar* return a `provider/model` STRING instead, which the AI
// SDK routes through the gateway — that shape difference IS the routing.
export const model = (id: ModelId = "gpt-4o"): LanguageModel => {
  const slash = id.indexOf("/");
  const provider =
    slash !== -1
      ? id.slice(0, slash)
      : (() => {
          switch (true) {
            case id.startsWith("claude"):
              return "anthropic";
            case id.startsWith("gemini"):
              return "google";
            case id.startsWith("sonar"):
              return "perplexity";
            default:
              return "azure";
          }
        })();
  const name = slash === -1 ? id : id.slice(slash + 1);

  switch (provider) {
    case "anthropic":
    case "google":
    case "perplexity":
      return `${provider}/${GATEWAY_ALIASES[name] ?? name}`;
    default:
      return azure(deployment(name));
  }
};

// ─── Instrumentation ────────────────────────────────────────────────────────
// One place for all AI-call observability. `experimental_telemetry` is picked up
// by Sentry's Vercel AI integration (enabled in instrumentation.ts) and emitted
// as a `gen_ai.*` span with token usage, keyed by functionId `ai.<feature>`. The
// `with*` context wrappers instrument the server action; this instruments the
// model call itself. Every wrapper below routes through these.

type StreamTextArgs = Parameters<typeof sdkStreamText>[0];
type GenerateTextArgs = Parameters<typeof sdkGenerateText>[0];
type TelemetryConfig = NonNullable<StreamTextArgs["telemetry"]>;
type Usage = {
  totalTokens?: number;
  inputTokens?: number;
  outputTokens?: number;
};

// `functionId` (`ai.<feature>`) is how Sentry's Vercel AI integration groups and
// names the span for a call — that is our per-feature key.
const telemetry = (
  label: string,
  extra?: TelemetryConfig,
): TelemetryConfig => ({
  isEnabled: true,
  functionId: `ai.${label}`,
  // Off by default so prompts/outputs never land in Sentry; override per call.
  // The privacy policy states Sentry receives no product data, and AI calls
  // carry catalog content — keep these false unless that claim changes too.
  recordInputs: false,
  recordOutputs: false,
  ...extra,
});

const report = (label: string, error: unknown) =>
  Sentry.captureException(error, { tags: { ai_feature: label } });

const logUsage = (label: string, usage?: Usage) => {
  if (!usage) return;
  Sentry.logger?.info?.("ai.usage", {
    feature: label,
    tokens: usage.totalTokens,
    input: usage.inputTokens,
    output: usage.outputTokens,
  });
};

// ─── Wrappers ───────────────────────────────────────────────────────────────
// Two instrumented entry points over the AI SDK: `generate` (await the result)
// and `stream` (consume it as it arrives). Both default to plain text and, in
// text mode, RETURN THE NATIVE SDK RESULT unchanged so callers keep `.text`/
// `.fullStream`/`.toUIMessageStream()` and can pass tools, messages, stopWhen,
// etc. Pass `output: <zod schema>` for schema-validated structured output —
// `z.array(...)` runs the SDK's array mode (per-element `elementStream` when
// streaming), any other schema resolves the parsed value. `label` names the
// feature span.

const resolveModel = (id: ModelId | LanguageModel): LanguageModel =>
  typeof id === "string" ? model(id) : id;

export type GenerateTextOptions = Omit<GenerateTextArgs, "model"> & {
  model?: ModelId | LanguageModel;
  label: string;
  output?: undefined;
};

export type StreamTextOptions = Omit<StreamTextArgs, "model"> & {
  model?: ModelId | LanguageModel;
  label: string;
  output?: undefined;
};

export type OutputOptions<T extends z.ZodTypeAny> = {
  output: T;
  instructions: string;
  prompt: string;
  model?: ModelId | LanguageModel;
  schemaName?: string;
  schemaDescription?: string;
  label?: string;
};

const outputSettings = <T extends z.ZodTypeAny>(
  options: OutputOptions<T>,
  fallback: string,
) => {
  const {
    output,
    instructions,
    prompt,
    model: id = "gpt-4o",
    schemaName,
    schemaDescription,
    label = schemaName ?? fallback,
  } = options;
  return {
    label,
    output,
    settings: {
      model: resolveModel(id),
      instructions,
      prompt,
      schemaName,
      schemaDescription,
      experimental_repairText: repairText,
      experimental_telemetry: telemetry(label),
    },
  };
};

export function generate<T extends z.ZodTypeAny>(
  options: OutputOptions<T>,
): Promise<z.infer<T>>;

export function generate(
  options: GenerateTextOptions,
): ReturnType<typeof sdkGenerateText>;

export function generate<T extends z.ZodTypeAny>(
  options: OutputOptions<T> | GenerateTextOptions,
) {
  if (!options.output) {
    const {
      model: id = "gpt-4o",
      label,
      output: _output,
      experimental_telemetry,
      ...rest
    } = options as GenerateTextOptions;
    return sdkGenerateText({
      ...rest,
      model: resolveModel(id),
      experimental_telemetry: telemetry(label, experimental_telemetry),
    } as GenerateTextArgs).then(
      (result) => {
        logUsage(label, result.usage);
        return result;
      },
      (error) => {
        report(label, error);
        throw error;
      },
    );
  }

  const { label, output, settings } = outputSettings(
    options as OutputOptions<T>,
    "generate",
  );
  const generation =
    output instanceof z.ZodArray
      ? generateObject({
          ...settings,
          output: "array",
          schema: output.element as z.ZodTypeAny,
        })
      : generateObject({ ...settings, schema: output });

  return generation.then(
    (result) => {
      logUsage(label, result.usage);
      return result.object as z.infer<T>;
    },
    (error) => {
      report(label, error);
      throw error;
    },
  );
}

const BUFFER_LINE_THRESHOLD = 50;

async function* bufferTextStream(
  stream: AsyncIterable<string>,
): AsyncIterable<string> {
  let buffer = "";

  for await (const chunk of stream) {
    buffer += chunk;
    const lines = buffer.split("\n");
    const remainder = lines.pop() ?? "";
    if (lines.length > 0 || remainder.length >= BUFFER_LINE_THRESHOLD) {
      const toSend = lines.length > 0 ? `${lines.join("\n")}\n` : remainder;
      if (toSend) yield toSend;
      buffer = lines.length > 0 ? remainder : "";
    }
  }

  if (buffer) yield buffer;
}

export type StreamOutputResult<T extends z.ZodTypeAny> = {
  output: Promise<z.infer<T>>;
  textStream: AsyncIterable<string>;
  elementStream: T extends z.ZodArray<infer Element extends z.ZodTypeAny>
    ? AsyncIterable<z.infer<Element>>
    : never;
};

export function stream<T extends z.ZodTypeAny>(
  options: OutputOptions<T>,
): StreamOutputResult<T>;

export function stream(
  options: StreamTextOptions,
): ReturnType<typeof sdkStreamText>;

export function stream<T extends z.ZodTypeAny>(
  options: OutputOptions<T> | StreamTextOptions,
) {
  if (!options.output) {
    const {
      model: id = "gpt-4o",
      label,
      output: _output,
      experimental_telemetry,
      onError,
      ...rest
    } = options as StreamTextOptions;
    return sdkStreamText({
      ...rest,
      model: resolveModel(id),
      experimental_telemetry: telemetry(label, experimental_telemetry),
      onError: (event) => {
        report(label, event.error);
        onError?.(event);
      },
    } as StreamTextArgs);
  }

  const { label, output, settings } = outputSettings(
    options as OutputOptions<T>,
    "stream",
  );

  // @note: errors during streaming surface on `result.output` (which we await
  // via resultify at the call site) rather than thrown — repairText still runs
  // before that rejects, so malformed output is recovered transparently.
  const result =
    output instanceof z.ZodArray
      ? streamObject({
          ...settings,
          output: "array",
          schema: output.element as z.ZodTypeAny,
          onError: (event) => {
            report(label, event.error);
          },
        })
      : streamObject({
          ...settings,
          schema: output,
          onError: (event) => {
            report(label, event.error);
          },
        });
  result.usage.then((usage) => logUsage(label, usage)).catch(() => {});

  return {
    output: result.object as Promise<z.infer<T>>,
    textStream: bufferTextStream(result.textStream),
    // Lazy: the SDK only exposes `elementStream` in array mode; touching it
    // eagerly in object mode would throw.
    get elementStream() {
      return result.elementStream;
    },
  } as unknown as StreamOutputResult<T>;
}

export const streamable = <T>(
  callback: (update: (value: T) => void) => Promise<void>,
) => {
  const streamable = createStreamableValue<T>();

  // @note: needed like this, otherwise the streamable value is not updated correctly, do not use resultify here
  (async () => {
    try {
      await callback((value) => {
        streamable.update(value);
      });
      streamable.done();
    } catch (error) {
      report("stream", error);
      streamable.error(error);
    }
  })();
  return { output: streamable.value };
};
