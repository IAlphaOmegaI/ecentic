import { randomUUID } from "node:crypto";
import { createAzure } from "@ai-sdk/azure";
import { resultify } from "@zenncore/utils";
import { generateObject } from "ai";
import { plugin } from "bun";
import postgres from "postgres";
import { z } from "zod";

plugin({
  name: "outbound-azure-diagnostic",
  setup(builder) {
    builder.module("server-only", () => ({ exports: {}, loader: "object" }));
  },
});

// A single explicit diagnostic, durably reserved before its one paid request.
// It never reads prospects, changes campaign work, sends mail or retries.
const id = z.uuid().parse(process.argv[2]);
const database = postgres(z.string().min(1).parse(process.env.DATABASE_URL), {
  max: 1,
});
const deployment =
  process.env.AZURE_DEPLOYMENT_GPT ?? process.env.AZURE_DEPLOYMENT_GPT4O;
const apiKey = process.env.AZURE_API_KEY;
if (!deployment || !apiKey || !process.env.AZURE_RESOURCE_NAME)
  throw new Error("Azure research is not configured.");
const input = {
  operation: "azureDiagnostic",
  purpose:
    "Check the configured Azure chat deployment and structured output contract",
  deployment,
  requestNonce: randomUUID(),
  maxOutputTokens: 1000,
  maxRetries: 0,
};
const inserted = await database`
  insert into outbound_integration_job (id,provider,status,input)
  values (${id},'automation','starting',${database.json(input)})
  on conflict (id) do nothing returning id
`;
if (!inserted.length) {
  await database.end({ timeout: 1 });
  throw new Error(
    "This diagnostic ID already exists; no request was repeated.",
  );
}
const wire: Record<string, unknown> = {};
const azure = createAzure({
  resourceName: process.env.AZURE_RESOURCE_NAME,
  apiKey,
  apiVersion: process.env.AZURE_API_VERSION,
  fetch: (async (url, options) => {
    const target = new URL(String(url));
    const body = JSON.parse(String(options?.body ?? "{}"));
    Object.assign(wire, {
      path: target.pathname,
      apiVersion: target.searchParams.get("api-version"),
      requestFields: Object.keys(body),
      maxTokens: body.max_tokens ?? null,
      maxCompletionTokens: body.max_completion_tokens ?? null,
      outputFormat: body.response_format?.type ?? null,
    });
    const response = await fetch(url, {
      ...options,
      redirect: "error",
      cache: "no-store",
    });
    Object.assign(wire, {
      status: response.status,
      requestId: response.headers.get("apim-request-id"),
    });
    return response;
  }) as typeof fetch,
});
const { assessmentOutputSchema, assessmentSchema } = await import(
  "../../src/server/utils/outbound/automation-qualification"
);
const result = await resultify(() =>
  generateObject({
    model: azure.chat(deployment),
    schema: assessmentOutputSchema,
    prompt:
      "Connection diagnostic only. There is no company or evidence to assess. Return decision hold, reason No evidence supplied, empty productCategory and criteriaEvidence, null evidence objects and productInsight, and criteriaSatisfied false.",
    maxOutputTokens: 1000,
    maxRetries: 0,
    abortSignal: AbortSignal.timeout(45000),
    experimental_telemetry: {
      isEnabled: false,
      recordInputs: false,
      recordOutputs: false,
    },
  }),
);
const output = result.success
  ? {
      ...wire,
      assessment: assessmentSchema.parse(result.data.object),
      usage: result.data.usage,
    }
  : {
      ...wire,
      error: result.error.name,
      detail: result.error.message
        .replaceAll(apiKey, "[redacted]")
        .slice(0, 1000),
      statusCode:
        (result.error as Error & { statusCode?: number }).statusCode ?? null,
    };
const definitive =
  !result.success &&
  [400, 401, 403, 404, 422, 429].includes(
    Number("statusCode" in output ? output.statusCode : null),
  );
const status = result.success
  ? "complete"
  : definitive
    ? "failed"
    : "uncertain";
await database`
  update outbound_integration_job set status=${status},output=${database.json(output)},
  error=${result.success ? null : "azure-diagnostic-failed"},updated_at=now() where id=${id}
`;
console.info(JSON.stringify({ id, status, output }, null, 2));
await database.end({ timeout: 1 });
