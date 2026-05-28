import { createStreamableValue } from "@ai-sdk/rsc";
import { type GatewayModelId, generateText, Output, streamText } from "ai";
import type { z } from "zod";

export type ModelId = GatewayModelId;

const output = <T extends z.ZodTypeAny>(schema: T) => Output.object({ schema });

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
  } = options;

  if (!s)
    return generateText({
      model,
      system,
      prompt,
      output: output(schema),
      providerOptions: {
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
      },
    }).then((result) => result.output as z.infer<T>);

  const result = streamText({
    model,
    system,
    prompt,
    output: output(schema),
    providerOptions: {
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
    },
  });

  return {
    output: result.output as Promise<z.infer<T>>,
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
