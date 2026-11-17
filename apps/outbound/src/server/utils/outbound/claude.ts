import "server-only";

import { createAnthropic } from "@ai-sdk/anthropic";
import { type Result, resultify } from "@zenncore/utils";
import { APICallError, generateObject, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import type { Playbook } from "@/lib/outbound";
import { type Campaign, campaignAnswersSchema } from "@/lib/outbound-campaigns";
import {
  buildClaudeCriteriaPrompt,
  claudeConfigurationSchema,
} from "@/lib/outbound-claude";
import { IntegrationError, request } from "./http";

const BASE = "https://api.anthropic.com/v1";
const modelsSchema = z.object({
  data: z.array(z.object({ id: z.string() })),
  has_more: z.boolean(),
});
const identifier = (value: unknown) =>
  typeof value === "string" && /^[A-Za-z0-9_.:-]{1,200}$/.test(value)
    ? value
    : null;
const count = (value: unknown) =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
const receipt = (value?: {
  usage?: { inputTokens?: number; outputTokens?: number };
  response?: { id?: string; headers?: Record<string, string> };
}) => ({
  usage: {
    inputTokens: count(value?.usage?.inputTokens),
    outputTokens: count(value?.usage?.outputTokens),
  },
  providerMessageId: identifier(value?.response?.id),
  providerRequestId: identifier(value?.response?.headers?.["request-id"]),
});
const failure = (error: unknown) => {
  if (NoObjectGeneratedError.isInstance(error))
    return new IntegrationError(
      "claude",
      "contract",
      "claude-generation-failed",
      502,
      null,
      null,
      receipt(error),
    );
  if (APICallError.isInstance(error)) {
    const status = error.statusCode ?? 502;
    const creditRequired =
      status === 400 &&
      /credit balance|insufficient credits/i.test(error.responseBody ?? "");
    const code =
      status === 401 || status === 403
        ? "access"
        : status === 402 || creditRequired
          ? "quota"
          : status === 429
            ? "rate-limit"
            : status >= 500
              ? "uncertain"
              : "input";
    const message =
      code === "access"
        ? "claude-access-denied"
        : code === "quota"
          ? "claude-credit-required"
          : code === "rate-limit"
            ? "claude-rate-limited"
            : code === "input"
              ? "claude-request-invalid"
              : "claude-generation-uncertain";
    return new IntegrationError("claude", code, message, status, null, null, {
      providerRequestId: identifier(error.responseHeaders?.["request-id"]),
    });
  }
  // A timeout may still have consumed tokens. Never retry it automatically.
  return new IntegrationError(
    "claude",
    "uncertain",
    "claude-generation-uncertain",
  );
};

/** Model listing checks a Console key without generating text or importing Claude app sessions. */
export const validateKey = async (
  apiKey: string,
  configuration: unknown = {},
) => {
  const parsed = claudeConfigurationSchema.safeParse(configuration);
  if (
    !parsed.success ||
    !/^sk-ant-[A-Za-z0-9_-]{20,}$/.test(apiKey) ||
    apiKey.startsWith("sk-ant-oat")
  )
    return {
      success: false as const,
      error: new IntegrationError(
        "claude",
        "input",
        "claude-request-invalid",
        422,
      ),
    };
  const response = await request(
    "claude",
    `${BASE}/models?limit=100`,
    {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        ...(parsed.data.workspaceId
          ? { "anthropic-workspace-id": parsed.data.workspaceId }
          : {}),
      },
    },
    modelsSchema,
  );
  if (!response.success) return response;
  if (!response.data.value.data.some((model) => model.id === parsed.data.model))
    return {
      success: false as const,
      error: new IntegrationError(
        "claude",
        "configuration",
        "claude-model-unavailable",
        409,
      ),
    };
  return { success: true as const, data: { valid: true as const } };
};

export const generateCriteria = async (input: {
  campaign: Pick<Campaign, "name" | "criteria">;
  playbook: Playbook;
  context: string;
}) => {
  const Credentials = await import(
    "@/server/app/outbound/provider-credentials"
  );
  const loaded = await Credentials.resolve("claude");
  if (!loaded.success) return loaded;
  if (!loaded.data.apiKey)
    return {
      success: false as const,
      error: new IntegrationError(
        "claude",
        "configuration",
        "claude-not-configured",
        409,
      ),
    };
  const configuration = claudeConfigurationSchema.safeParse(
    loaded.data.configuration,
  );
  if (!configuration.success)
    return {
      success: false as const,
      error: new IntegrationError(
        "claude",
        "configuration",
        "claude-request-invalid",
        422,
      ),
    };
  const provider = createAnthropic({
    apiKey: loaded.data.apiKey,
    headers: configuration.data.workspaceId
      ? { "anthropic-workspace-id": configuration.data.workspaceId }
      : undefined,
    fetch: ((input, options) =>
      fetch(input, {
        ...options,
        redirect: "error",
        cache: "no-store",
      })) as typeof fetch,
  });
  const generated = await resultify(() =>
    generateObject({
      model: provider(configuration.data.model),
      schema: campaignAnswersSchema,
      ...buildClaudeCriteriaPrompt(
        input.campaign,
        input.playbook,
        input.context,
      ),
      maxOutputTokens: 5000,
      maxRetries: 0,
      abortSignal: AbortSignal.timeout(60_000),
      experimental_telemetry: {
        isEnabled: false,
        recordInputs: false,
        recordOutputs: false,
      },
    }),
  );
  if (!generated.success)
    return { success: false as const, error: failure(generated.error) };
  const checked = campaignAnswersSchema.safeParse(generated.data.object);
  if (!checked.success)
    return {
      success: false as const,
      error: new IntegrationError(
        "claude",
        "contract",
        "claude-generation-failed",
        502,
        null,
        null,
        receipt(generated.data),
      ),
    };
  return {
    success: true as const,
    data: {
      criteria: checked.data.criteria,
      model: configuration.data.model,
      ...receipt(generated.data),
    },
  } satisfies Result<unknown>;
};
