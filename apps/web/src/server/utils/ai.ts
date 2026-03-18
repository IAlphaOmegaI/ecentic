"use server";

import { createAzure } from "@ai-sdk/azure";
import { generateText, Output } from "ai";
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

export const generate = async <T extends z.ZodTypeAny>(options: {
  system: string;
  prompt: string;
  schema: T;
}): Promise<z.infer<T>> => {
  const result = await generateText({
    model: getModel(),
    system: options.system,
    prompt: options.prompt,
    output: Output.object({
      schema: options.schema,
    }),

    // tools: {
    //   google_search: google.tools.googleSearch({}),
    // },
  });

  return result.output as z.infer<T>;
};

export const stream = async <T>(
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
