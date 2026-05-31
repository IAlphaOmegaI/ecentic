import { createStreamableValue } from "@ai-sdk/rsc";
import {
  type GatewayModelId,
  generateObject,
  type RepairTextFunction,
  streamObject,
} from "ai";
import type { z } from "zod";

export type ModelId = GatewayModelId;

// Models occasionally wrap the JSON in markdown fences or surround it with
// prose/citations (Perplexity's sonar-pro especially, and Gemini when it
// "thinks out loud"). That makes the raw output unparseable and surfaces as
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

const providerOptions = {
  gateway: {
    byok: {
      azure: [
        {
          apiKey: process.env.AZURE_API_KEY,
          resourceName: process.env.AZURE_RESOURCE_NAME,
        },
      ],
    },
  },
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
  system: string;
  prompt: string;
  schema: T;
  model?: GatewayModelId;
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
    system,
    prompt,
    schema,
    stream: s = false,
    model = "gpt-4o",
    schemaName,
    schemaDescription,
  } = options;

  const settings = {
    model,
    system,
    prompt,
    schema,
    schemaName,
    schemaDescription,
    experimental_repairText: repairText,
    providerOptions,
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
