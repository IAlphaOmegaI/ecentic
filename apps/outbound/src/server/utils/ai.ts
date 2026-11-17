import "server-only";
import { createAzure } from "@ai-sdk/azure";
import { generateObject } from "ai";
import type { z } from "zod";
import { ValidationError } from "./error";

/** Outbound needs only one bounded structured draft call, with no merchant AI runtime. */
export const generate = async <Schema extends z.ZodType>({
  output,
  instructions,
  prompt,
}: {
  output: Schema;
  instructions: string;
  prompt: string;
  model?: "gpt";
  label?: string;
}): Promise<z.infer<Schema>> => {
  const resourceName = process.env.AZURE_RESOURCE_NAME;
  const apiKey = process.env.AZURE_API_KEY;
  const deployment =
    process.env.AZURE_DEPLOYMENT_GPT ?? process.env.AZURE_DEPLOYMENT_GPT4O;
  if (!resourceName || !apiKey || !deployment)
    throw new ValidationError("Configure the Azure drafting deployment first.");
  const azure = createAzure({
    resourceName,
    apiKey,
    apiVersion: process.env.AZURE_API_VERSION,
    fetch: ((url, options) =>
      fetch(url, {
        ...options,
        redirect: "error",
        cache: "no-store",
      })) as typeof fetch,
  });
  const generated = await generateObject({
    model: azure.chat(deployment),
    schema: output,
    system: instructions,
    prompt,
    maxRetries: 0,
    maxOutputTokens: 2000,
    abortSignal: AbortSignal.timeout(60_000),
    experimental_telemetry: {
      isEnabled: false,
      recordInputs: false,
      recordOutputs: false,
    },
  });
  return output.parse(generated.object);
};
