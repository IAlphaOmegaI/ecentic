import { createAnthropic } from "@ai-sdk/anthropic";
import { createAzure } from "@ai-sdk/azure";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createPerplexity } from "@ai-sdk/perplexity";
import { createStreamableValue } from "@ai-sdk/rsc";
import {
  generateObject,
  type LanguageModel,
  type RepairTextFunction,
  streamObject,
} from "ai";
import type { z } from "zod";

// Curated union of the model ids this app routes, per provider, with a
// `(string & {})` escape hatch. Restores autocomplete + typo-catching (the old
// GatewayModelId perk) while still accepting any string the resolver can route.
export type ModelId =
  // Azure OpenAI (ChatGPT) — logical id; the real deployment resolves via env.
  | "gpt-4o"
  | "gpt-4"
  // Anthropic (native)
  | "claude-sonnet-4-20250514"
  | "claude-sonnet-4-5"
  | "claude-sonnet-4-6"
  // Google (native)
  | "gemini-2.5-flash"
  | "gemini-2.0-flash"
  | "gemini-3-flash-preview"
  // Perplexity (native)
  | "sonar"
  | "sonar-pro"
  // Preserves literal autocomplete while still accepting any provider/deployment id.
  | (string & Record<never, never>);

// Models occasionally wrap the JSON in markdown fences or surround it with
// prose/citations (Perplexity's sonar-pro especially, and Gemini when it
// "thinks out loud"). That makes the raw output unparsable and surfaces as
// NoObjectGeneratedError. Strip fences and extract the outermost `{ ... }` so
// the SDK can parse and validate instead of throwing.
const repairText: RepairTextFunction = async ({ text }) => {
  const stripped = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return stripped.slice(start, end + 1);
};

// Every AI call goes DIRECT to the owning provider — never through the Vercel AI
// Gateway. In the AI SDK a bare string model id is billed through the gateway; a
// provider instance (below) is billed on that provider's own account: your Azure
// subscription for ChatGPT, your Anthropic/Google/Perplexity keys for the rest.
const azure = createAzure({
  resourceName: process.env.AZURE_RESOURCE_NAME,
  apiKey: process.env.AZURE_API_KEY,
  // The provider targets Azure's v1 API surface, which accepts "preview" (latest
  // features incl. structured outputs) — NOT the older date-based versions.
  apiVersion: process.env.AZURE_API_VERSION ?? "preview",
});
const anthropic = createAnthropic(); // reads ANTHROPIC_API_KEY at call time
const google = createGoogleGenerativeAI(); // reads GOOGLE_GENERATIVE_AI_API_KEY
const perplexity = createPerplexity(); // reads PERPLEXITY_API_KEY

// Azure serves models under DEPLOYMENT names, which differ from the base model
// name. Override via env when your deployment is named something other than the
// base id.
const deployment = (name: string) =>
  (name === "gpt-4o" && process.env.AZURE_DEPLOYMENT_GPT4O) || name;

// Resolves a logical model id to a provider instance. ChatGPT on Azure is the
// default; anything without a known provider prefix resolves there. Ids prefixed
// or starting with claude*/gemini*/sonar* route to their native providers.
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
      return anthropic(name);
    case "google":
      return google(name);
    case "perplexity":
      return perplexity(name);
    default:
      return azure(deployment(name));
  }
};

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

export type GenerateOptions<T extends z.ZodTypeAny> = {
  instructions: string;
  prompt: string;
  schema: T;
  model?: ModelId;
  schemaName?: string;
  schemaDescription?: string;
};

export type GenerateStreamResult<T> = {
  output: Promise<T>;
  textStream: AsyncIterable<string>;
};

export function generate<T extends z.ZodTypeAny>(
  options: GenerateOptions<T> & { stream?: false },
): Promise<z.infer<T>>;

export function generate<T extends z.ZodTypeAny>(
  options: GenerateOptions<T> & { stream: true },
): GenerateStreamResult<z.infer<T>>;

export function generate<T extends z.ZodTypeAny>(
  options: GenerateOptions<T> & { stream?: boolean },
): Promise<z.infer<T>> | GenerateStreamResult<z.infer<T>> {
  const {
    instructions,
    prompt,
    schema,
    stream: s = false,
    model: id = "gpt-4o",
    schemaName,
    schemaDescription,
  } = options;

  const settings = {
    model: model(id),
    instructions,
    prompt,
    schema,
    schemaName,
    schemaDescription,
    experimental_repairText: repairText,
  };

  if (!s)
    return generateObject(settings).then(
      (result) => result.object as z.infer<T>,
    );

  // @note: errors during streaming surface on `result.object` (which we await
  // via resultify at the call site) rather than thrown — repairText still runs
  // before that rejects, so malformed output is recovered transparently.
  const result = streamObject({ ...settings, onError: () => {} });

  return {
    output: result.object as Promise<z.infer<T>>,
    textStream: bufferTextStream(result.textStream),
  };
}

export const stream = <T>(
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
      streamable.error(error);
    }
  })();
  return { output: streamable.value };
};
