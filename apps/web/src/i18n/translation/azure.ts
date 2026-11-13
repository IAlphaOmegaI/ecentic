import { createAzure } from "@ai-sdk/azure";
import { generateObject, NoObjectGeneratedError } from "ai";
import {
  createTranslationCapacity,
  withTranslationOutputBudget,
} from "./capacity";
import type { TranslationGenerator } from "./runner";
import { compactTranslationTransport } from "./transport";

export type TranslationRequestUsage = {
  phase: Parameters<TranslationGenerator>[0]["phase"];
  waitMs: number;
  modelMs: number;
  reservedTokens: number;
  maxOutputTokens: number;
  inputTokens: number | undefined;
  outputTokens: number | undefined;
};

/** The same direct Azure rail as the app, without importing Next's RSC runtime. */
export const createAzureTranslationGenerator = ({
  timeoutMs = 120_000,
  maxRetries = 3,
  tokensPerMinute = 180_000,
  onUsage,
}: {
  timeoutMs?: number;
  maxRetries?: number;
  tokensPerMinute?: number;
  /** Operational counts only; prompts, translations and credentials stay private. */
  onUsage?: (usage: TranslationRequestUsage) => void;
} = {}): TranslationGenerator => {
  const deployment =
    process.env.AZURE_DEPLOYMENT_GPT ?? process.env.AZURE_DEPLOYMENT_GPT4O;
  if (
    !deployment ||
    !process.env.AZURE_RESOURCE_NAME ||
    !process.env.AZURE_API_KEY
  ) {
    throw new Error(
      "The configured Azure translation deployment is unavailable.",
    );
  }
  const azure = createAzure({
    resourceName: process.env.AZURE_RESOURCE_NAME,
    apiKey: process.env.AZURE_API_KEY,
    apiVersion: process.env.AZURE_API_VERSION,
  });
  const reserve = createTranslationCapacity({ tokensPerMinute });
  return async (request) => {
    const transport = compactTranslationTransport(request);
    const { system, prompt, schema, schemaName } = transport.request;
    return withTranslationOutputBudget(
      transport.request,
      async (maxOutputTokens) => {
        const signal = AbortSignal.timeout(timeoutMs);
        const requestedAt = performance.now();
        const reservedTokens =
          Math.ceil((system.length + prompt.length) / 2.5) + maxOutputTokens;
        // Include the output reservation: Azure throttles against the requested
        // maximum, even when a small review eventually emits far fewer tokens.
        await reserve(reservedTokens, signal).catch((error: unknown) => {
          if (signal.aborted)
            throw new Error(
              "Translation token rate limit: waiting for local capacity; retry after 60 seconds.",
            );
          throw error;
        });
        const acquiredAt = performance.now();
        const result = await generateObject({
          model: azure(deployment),
          schema,
          schemaName,
          system,
          prompt,
          maxRetries,
          abortSignal: signal,
          maxOutputTokens,
        });
        onUsage?.({
          phase: request.phase,
          waitMs: Math.round(acquiredAt - requestedAt),
          modelMs: Math.round(performance.now() - acquiredAt),
          reservedTokens,
          maxOutputTokens,
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
        });
        return transport.decode(result.object);
      },
      (error) =>
        NoObjectGeneratedError.isInstance(error) &&
        error.finishReason === "length",
    );
  };
};
