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
  // OpenAI — `gpt` is the SEAT, not a model: it means "whichever ChatGPT model
  // this environment serves", an Azure deployment where one is named and the
  // gateway's equivalent everywhere else. It is the only ChatGPT id the product
  // names, because a versioned id served from a deployment called something else
  // is a label that lies. To pin a version deliberately, pass the provider's own
  // spelling (`openai/<model>`) — the escape hatch below still accepts it.
  | "gpt"
  // Anthropic — via gateway, using the gateway's model spellings.
  | "claude-sonnet-4"
  | "claude-sonnet-4.5"
  | "claude-sonnet-4.6"
  // Google — via gateway. 2.0-flash is absent: the gateway does not carry it.
  | "gemini-2.5-flash"
  | "gemini-3-flash"
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
// ChatGPT prefers Azure, the one provider with a first-party key here.
// Everything Azure cannot serve (Claude, Gemini, Perplexity) goes through the
// gateway, so no per-vendor key is needed. To move a vendor back onto its own
// account later, give it a key and return a provider instance for its prefix.
//
// "Cannot serve" includes ChatGPT itself wherever Azure has no deployment for
// it — the direct rail is a preference, the gateway is the floor, and no feature
// is allowed to die because one environment is missing a deployment name.
const azure = createAzure({
  resourceName: process.env.AZURE_RESOURCE_NAME,
  apiKey: process.env.AZURE_API_KEY,
  // The provider targets Azure's v1 API surface, which accepts "preview" (latest
  // features incl. structured outputs) — NOT the older date-based versions.
  apiVersion: process.env.AZURE_API_VERSION,
});

// Azure serves models under DEPLOYMENT names picked at deploy time, and those
// need not match the model's own name — an earlier resource served
// `gpt-chat-latest` under a deployment called `gpt-5.3-chat`. So a seat is
// Azure-routable only when an env var names its deployment. Guessing a name
// instead is what made every ChatGPT call 404 with "The API deployment for this
// resource does not exist" in an environment where the var was unset.
//
// Thunks, not values: read per call so the answer reflects the environment the
// runtime actually has, not whatever existed when this module was first imported.
const AZURE_DEPLOYMENTS: Record<string, () => string | undefined> = {
  // Prefer `AZURE_DEPLOYMENT_GPT`. Some local/prod env files still use the
  // older `AZURE_DEPLOYMENT_GPT4O` name for the same ChatGPT seat — without
  // this fallback every `model: "gpt"` call skips Azure and hits the gateway
  // (which fails hard when the gateway wallet is empty).
  gpt: () =>
    process.env.AZURE_DEPLOYMENT_GPT ?? process.env.AZURE_DEPLOYMENT_GPT4O,
};

// Both halves are required before Azure can serve anything — without them the
// provider builds a URL it cannot authenticate.
const azureConfigured = () =>
  Boolean(process.env.AZURE_RESOURCE_NAME && process.env.AZURE_API_KEY);

// The `gpt` seat's gateway spelling, pinned to whatever model AZURE_DEPLOYMENT_GPT
// serves so both rails judge with the SAME model — otherwise a scan that falls
// back to the gateway is scored by a different model under the same "ChatGPT"
// label, which is the drift this seat exists to prevent. Keep the two in step:
// repoint the Azure deployment, change this line in the same commit.
const GPT_GATEWAY_MODEL = "gpt-5.4";

const gatewayModel = (provider: string, name: string) =>
  `${provider}/${name === "gpt" ? GPT_GATEWAY_MODEL : name}`;

// Resolves a model id to something `generateText`/`generateObject` accepts, by
// three rules, in order:
//
//   1. `azure/<deployment>` — that prefix IS the request for the direct rail, so
//      the name is taken at face value as a deployment on the resource.
//   2. a seat with a deployment named for it (see AZURE_DEPLOYMENTS) — direct.
//   3. everything else — a `provider/model` STRING, which the AI SDK hands to
//      its global provider, the gateway. That shape difference IS the routing.
//
// No rule ever invents a deployment name, which is the whole lesson of the 404s:
// Azure only answers to names it was given.
export const model = (id: ModelId = "gpt"): LanguageModel => {
  const slash = id.indexOf("/");
  const name = slash === -1 ? id : id.slice(slash + 1);
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
              return "openai";
          }
        })();

  if (provider === "azure") return azure(name);

  const deployment = azureConfigured()
    ? AZURE_DEPLOYMENTS[name]?.()
    : undefined;
  return deployment ? azure(deployment) : gatewayModel(provider, name);
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

// A configured deployment can still vanish — renamed, deleted, or moved to
// another resource — and the env var cannot prove otherwise until a call goes
// out. Only Azure phrases a failure this way, so the message alone identifies a
// call that went direct and can be retried on the other rail.
const AZURE_MISSING_DEPLOYMENT = /deployment for this resource does not exist/i;

const gatewayFallback = (
  id: ModelId | LanguageModel,
  error: unknown,
): LanguageModel | null => {
  if (typeof id !== "string") return null;
  if (
    !(error instanceof Error) ||
    !AZURE_MISSING_DEPLOYMENT.test(error.message)
  )
    return null;
  // Only OpenAI models ever reach Azure, so the equivalent is that provider's
  // spelling of the same id — the `gpt` seat included, via GPT_GATEWAY_MODEL.
  const slash = id.indexOf("/");
  return gatewayModel("openai", slash === -1 ? id : id.slice(slash + 1));
};

// One retry, on the gateway. Re-running the whole attempt is safe: the call
// failed before generating anything, so there is no partial output to resume.
// Awaited calls only — a stream has already been handed to its consumer by the
// time the request fails, and swapping its source mid-flight is not worth it;
// those surface the error to a user who can retry, unlike a background scan.
const withAzureFallback = <T>(
  id: ModelId | LanguageModel,
  label: string,
  attempt: (model: LanguageModel) => Promise<T>,
): Promise<T> =>
  attempt(resolveModel(id)).catch((error: unknown) => {
    const fallback = gatewayFallback(id, error);
    if (!fallback) throw error;

    // Not an exception — the call is about to succeed — but the deployment is
    // misconfigured and the spend moved rails, so it must stay visible.
    Sentry.logger?.warn?.("ai.azure_deployment_missing", {
      feature: label,
      model: id,
      fallback,
    });
    return attempt(fallback);
  });

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
    model: id = "gpt",
    schemaName,
    schemaDescription,
    label = schemaName ?? fallback,
  } = options;
  // `id` travels beside the settings rather than resolved into them: each
  // attempt supplies its own model so a retry can pick a different rail.
  return {
    label,
    output,
    id,
    settings: {
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
      model: id = "gpt",
      label,
      output: _output,
      experimental_telemetry,
      ...rest
    } = options as GenerateTextOptions;
    return withAzureFallback(id, label, (model) =>
      sdkGenerateText({
        ...rest,
        model,
        experimental_telemetry: telemetry(label, experimental_telemetry),
      } as GenerateTextArgs),
    ).then(
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

  const { label, output, id, settings } = outputSettings(
    options as OutputOptions<T>,
    "generate",
  );
  // `async` so the two generateObject shapes collapse into one awaited union
  // instead of inferring the fallback's generic from whichever branch is first.
  const generation = withAzureFallback(id, label, async (model) =>
    output instanceof z.ZodArray
      ? generateObject({
          ...settings,
          model,
          output: "array",
          schema: output.element as z.ZodTypeAny,
        })
      : generateObject({ ...settings, model, schema: output }),
  );

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
      model: id = "gpt",
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

  const { label, output, id, settings } = outputSettings(
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
          model: resolveModel(id),
          output: "array",
          schema: output.element as z.ZodTypeAny,
          onError: (event) => {
            report(label, event.error);
          },
        })
      : streamObject({
          ...settings,
          model: resolveModel(id),
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
  const value = createStreamableValue<T>();

  // @note: needed like this, otherwise the streamable value is not updated correctly, do not use resultify here
  (async () => {
    try {
      await callback((next) => {
        value.update(next);
      });
      value.done();
    } catch (error) {
      report("stream", error);
      value.error(error);
    }
  })();
  return { output: value.value };
};
