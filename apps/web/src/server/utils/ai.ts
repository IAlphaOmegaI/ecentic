"use server";

import { createAzure } from "@ai-sdk/azure";
import { generateObject } from "ai";
import type { ZodSchema } from "zod";

const azure = createAzure({
  resourceName: process.env.AZURE_RESOURCE_NAME,
  apiKey: process.env.AZURE_API_KEY,
});

const model = azure("gpt-4o");

export const generate = async <T>(options: {
  system: string;
  prompt: string;
  schema: ZodSchema<T>;
}) => {
  const result = await generateObject({
    model,
    system: options.system,
    prompt: options.prompt,
    schema: options.schema,
  });

  return result.object;
};
