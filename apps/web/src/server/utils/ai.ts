import { createAzure } from "@ai-sdk/azure";
import { generateText, Output, streamText } from "ai";
import { createStreamableValue } from "@ai-sdk/rsc";
import type { z } from "zod";

const getModel = () => {
  if (!process.env.AZURE_RESOURCE_NAME)
    throw new Error("Missing AZURE_RESOURCE_NAME");

  if (!process.env.AZURE_API_KEY) throw new Error("Missing AZURE_API_KEY");

  const azure = createAzure({
    resourceName: process.env.AZURE_RESOURCE_NAME,
    apiKey: process.env.AZURE_API_KEY,
  });

  return azure("gpt-5.3-chat");
};

const outputConfig = <T extends z.ZodTypeAny>(schema: T) =>
  Output.object({ schema });

export type GenerateOptions<T extends z.ZodTypeAny> = {
  system: string;
  prompt: string;
  schema: T;
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
  const { system, prompt, schema, stream: useStream = false } = options;

  if (!useStream) {
    return generateText({
      model: getModel(),
      system,
      prompt,
      output: outputConfig(schema),
    }).then((result) => result.output as z.infer<T>);
  }

  const result = streamText({
    model: getModel(),
    system,
    prompt,
    output: outputConfig(schema),
  });

  return {
    output: result.output as Promise<z.infer<T>>,
    textStream: result.textStream,
  };
}

export const stream = <T>(
  callback: (update: (value: T) => void) => Promise<void>,
) => {
  const streamable = createStreamableValue<T>();

  (async () => {
    try {
      await callback((value) => {
        console.log(
          "[AI.stream] update →",
          JSON.stringify(value).slice(0, 120),
        );
        streamable.update(value);
      });
      console.log("[AI.stream] done");
      streamable.done();
    } catch (error) {
      console.error("[AI.stream] error →", error);
      streamable.error(error);
    }
  })();
  return { output: streamable.value };
};
