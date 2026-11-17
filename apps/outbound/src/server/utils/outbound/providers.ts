import { z } from "zod";
import * as Google from "./google";
import {
  configurationError,
  domainSchema,
  IntegrationError,
  identifierSchema,
  inputError,
  request,
} from "./http";

const personSchema = z.object({
  id: z.string(),
  name: z.string().nullish(),
  first_name: z.string().nullish(),
  last_name: z.string().nullish(),
  title: z.string().nullish(),
  linkedin_url: z.string().nullish(),
  email: z.string().nullish(),
  email_status: z.string().nullish(),
  match_confidence: z.string().nullish(),
  time_zone: z.string().max(100).nullish(),
  organization: z
    .object({
      name: z.string().nullish(),
      primary_domain: z.string().nullish(),
    })
    .nullish(),
});

export type Person = {
  id: string;
  name: string;
  first: string;
  title: string;
  domain: string;
  company: string;
  linkedinUrl: string;
  email: string;
  emailStatus: string;
  matchConfidence: string;
  source: "apollo";
  /** An explicit provider observation; never infer recipient zone from company headquarters. */
  timezone?: string | null;
};

const person = (value: z.infer<typeof personSchema>): Person => ({
  id: value.id,
  name:
    value.name ?? [value.first_name, value.last_name].filter(Boolean).join(" "),
  first: value.first_name ?? "",
  title: value.title ?? "",
  domain: value.organization?.primary_domain ?? "",
  company: value.organization?.name ?? "",
  linkedinUrl: value.linkedin_url ?? "",
  email: value.email ?? "",
  emailStatus: value.email_status ?? "unknown",
  matchConfidence: value.match_confidence ?? "unknown",
  source: "apollo",
  timezone: value.time_zone ?? null,
});

const apollo = async <Schema extends z.ZodType>(
  path: string,
  body: unknown,
  schema: Schema,
  method = "POST",
) => {
  const Credentials = await import(
    "@/server/app/outbound/provider-credentials"
  );
  const resolved = await Credentials.resolveKey("apollo");
  const key = resolved.success ? resolved.data : null;
  if (!key) return Promise.resolve(configurationError("apollo"));
  return request(
    "apollo",
    `https://api.apollo.io/api/v1/${path}`,
    {
      method,
      headers: { "x-api-key": key, "Content-Type": "application/json" },
      ...(method === "POST" ? { body: JSON.stringify(body) } : {}),
    },
    schema,
  );
};

export const validateApolloKey = async (apiKey: string) => {
  const response = await request(
    "apollo",
    "https://api.apollo.io/api/v1/auth/health",
    {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
    },
    z.object({ healthy: z.boolean(), is_logged_in: z.boolean() }),
  );
  if (!response.success) return response;
  if (!response.data.value.healthy || !response.data.value.is_logged_in)
    return {
      success: false as const,
      error: new IntegrationError(
        "apollo",
        "access",
        "Provider authentication failed.",
        401,
      ),
    };
  return { success: true as const, data: { valid: true as const } };
};

export const validateClayKey = async (apiKey: string) => {
  const response = await request(
    "clay",
    "https://api.clay.com/public/v0/me",
    {
      method: "GET",
      headers: { "clay-api-key": apiKey, Accept: "application/json" },
    },
    z.object({
      user: z.object({ id: z.string().min(1), name: z.string().nullable() }),
      workspace: z.object({ id: z.string().min(1) }),
    }),
  );
  if (!response.success) return response;
  return { success: true as const, data: { valid: true as const } };
};

export const getIntegrationStatus = async () => {
  const Credentials = await import(
    "@/server/app/outbound/provider-credentials"
  );
  const [apollo, clay, google] = await Promise.all([
    Credentials.metadata("apollo"),
    Credentials.metadata("clay"),
    Google.getConfigurationStatus(),
  ]);
  if (!apollo.success) throw apollo.error;
  if (!clay.success) throw clay.error;
  return {
    apollo: {
      configured: apollo.data.configured,
      credentialStatus: apollo.data.credentialStatus,
    },
    clay: {
      configured: clay.data.configured,
      credentialStatus: clay.data.credentialStatus,
      routineConfigured: Boolean(clay.data.configuration.routineId),
      routineId: clay.data.configuration.routineId ?? "",
    },
    google,
    azure: {
      configured: Boolean(
        process.env.AZURE_RESOURCE_NAME &&
          process.env.AZURE_API_KEY &&
          (process.env.AZURE_DEPLOYMENT_GPT ||
            process.env.AZURE_DEPLOYMENT_GPT4O),
      ),
    },
  };
};

export const searchApolloPeople = async (input: {
  domain: string;
  titles: string[];
  excludedTitles?: string[];
  page?: number;
}) => {
  const parsed = z
    .object({
      domain: domainSchema,
      titles: z.array(z.string().trim().min(1).max(150)).min(1).max(50),
      excludedTitles: z
        .array(z.string().trim().min(1).max(150))
        .max(48)
        .default([]),
      page: z.number().int().min(1).max(500).default(1),
    })
    .safeParse(input);
  if (!parsed.success) return inputError("apollo");
  const response = await apollo(
    "mixed_people/api_search",
    {
      q_organization_domains_list: [parsed.data.domain],
      person_titles: parsed.data.titles,
      person_not_titles: parsed.data.excludedTitles,
      include_similar_titles: false,
      per_page: 25,
      page: parsed.data.page,
    },
    z.object({
      people: z.array(personSchema),
      total_entries: z.number().optional(),
    }),
  );
  if (!response.success) return response;
  return {
    success: true as const,
    data: {
      people: response.data.value.people.map(person),
      page: parsed.data.page,
      total: response.data.value.total_entries ?? null,
    },
  };
};

export const enrichApolloPerson = async (input: {
  id?: string;
  name?: string;
  domain?: string;
  linkedinUrl?: string;
}) => {
  const parsed = z
    .object({
      id: identifierSchema.optional(),
      name: z.string().trim().min(2).max(200).optional(),
      domain: domainSchema.optional(),
      linkedinUrl: z.url().max(500).optional(),
    })
    .refine(
      (value) => value.id || (value.name && value.domain) || value.linkedinUrl,
    )
    .safeParse(input);
  if (!parsed.success)
    return inputError(
      "apollo",
      "Provide an Apollo ID or a name and company domain.",
    );
  const response = await apollo(
    "people/match",
    {
      id: parsed.data.id,
      name: parsed.data.name,
      domain: parsed.data.domain,
      linkedin_url: parsed.data.linkedinUrl,
      reveal_personal_emails: false,
      reveal_phone_number: false,
      run_waterfall_email: false,
      run_waterfall_phone: false,
    },
    z.object({ person: personSchema.nullable() }),
  );
  if (!response.success) return response;
  return {
    success: true as const,
    data: response.data.value.person
      ? person(response.data.value.person)
      : null,
  };
};

const verificationSchema = z.object({
  request_id: z.string(),
  status: z.string().optional(),
  records: z
    .array(z.object({ record_id: z.string(), input: z.unknown().optional() }))
    .optional(),
  results: z
    .array(
      z.object({
        status: z.enum(["accepted", "rejected"]),
        record_id: z.string().nullable(),
        errors: z.array(z.string()).nullable().optional(),
      }),
    )
    .optional(),
});

export const verifyApolloEmails = async ({ emails }: { emails: string[] }) => {
  const parsed = z.array(z.email()).min(1).max(10).safeParse(emails);
  if (!parsed.success)
    return inputError(
      "apollo",
      "Provide between one and ten sourced email addresses.",
    );
  const response = await apollo(
    "enrich",
    {
      action: "email_verifier",
      action_type: "tool",
      poll_only: true,
      input_attributes: parsed.data.map((email) => ({ email })),
    },
    verificationSchema,
  );
  if (!response.success) return response;
  return {
    success: true as const,
    data: {
      requestId: response.data.value.request_id,
      status: "pending" as const,
      records: response.data.value.results
        ? response.data.value.results.flatMap((record, position) =>
            record.status === "accepted" && record.record_id
              ? [
                  {
                    record_id: record.record_id,
                    input: { email: parsed.data[position] },
                  },
                ]
              : [],
          )
        : (response.data.value.records ?? []),
      requestedAt: new Date().toISOString(),
    },
  };
};

export type Verification = {
  email: string;
  status: "verified" | "unknown";
  verdict: string;
  verifiedAt: string | null;
  source: "apollo";
  recordId: string;
  timestampProof?: {
    kind: "request-completed";
    requestId: string;
    action: "email_verifier";
    initiatedAt: string;
    completedAt: string;
  };
};

/** Use an explicit record date or an exactly correlated provider verification-completion receipt, never local request time. */
export const normalizeApolloVerification = (
  value: unknown,
  expectedRequestId?: string,
): Verification[] => {
  const envelope = z.object({ webhook_result: z.unknown() }).safeParse(value);
  const recordSchema = z
    .object({
      id: z.string().min(1).optional(),
      record_id: z.string().min(1).optional(),
      email: z.string().optional(),
      input: z.object({ email: z.string() }).optional(),
      validation_status: z.string().optional(),
      verified_at: z.string().optional(),
    })
    .refine((record) => record.id || record.record_id);
  const parsed = z
    .object({
      request_id: z.string().optional(),
      action: z.string().optional(),
      status: z.string().optional(),
      request_initiated: z.string().optional(),
      request_completed: z.string().optional(),
      records: z.array(recordSchema).optional(),
      results: z.array(recordSchema).optional(),
    })
    .safeParse(envelope.success ? envelope.data.webhook_result : value);
  if (!parsed.success) return [];
  const initiated = Date.parse(parsed.data.request_initiated ?? "");
  const completed = Date.parse(parsed.data.request_completed ?? "");
  const proof: Verification["timestampProof"] =
    expectedRequestId &&
    parsed.data.request_id === expectedRequestId &&
    parsed.data.action === "email_verifier" &&
    parsed.data.status === "success" &&
    Number.isFinite(initiated) &&
    Number.isFinite(completed) &&
    initiated <= completed &&
    completed <= Date.now() &&
    parsed.data.request_initiated &&
    parsed.data.request_completed
      ? {
          kind: "request-completed",
          requestId: expectedRequestId,
          action: "email_verifier",
          initiatedAt: parsed.data.request_initiated,
          completedAt: parsed.data.request_completed,
        }
      : undefined;
  return (parsed.data.records ?? parsed.data.results ?? []).map((record) => ({
    email: record.email ?? record.input?.email ?? "",
    recordId: record.id ?? record.record_id ?? "",
    verdict: record.validation_status ?? "unknown",
    status:
      record.validation_status === "validated"
        ? ("verified" as const)
        : ("unknown" as const),
    verifiedAt:
      record.verified_at && Number.isFinite(Date.parse(record.verified_at))
        ? record.verified_at
        : (proof?.completedAt ?? null),
    source: "apollo" as const,
    ...(!(
      record.verified_at && Number.isFinite(Date.parse(record.verified_at))
    ) && proof
      ? { timestampProof: proof }
      : {}),
  }));
};

export const pollApolloVerification = async ({
  requestId,
}: {
  requestId: string;
}) => {
  if (!identifierSchema.safeParse(requestId).success)
    return inputError("apollo");
  const response = await apollo(
    `webhook_result/${encodeURIComponent(requestId)}`,
    undefined,
    z.record(z.string(), z.unknown()),
    "GET",
  );
  if (!response.success) {
    // A generic 404 can also be an unknown/expired request, never assume pending.
    if (
      response.error.statusCode === 404 &&
      response.error.providerCode === "result_pending"
    )
      return {
        success: true as const,
        data: {
          requestId,
          status: "pending" as const,
          results: [] as Verification[],
          retryAfterSeconds: response.error.retryAfterSeconds ?? 30,
        },
      };
    return response;
  }
  const results = normalizeApolloVerification(response.data.value, requestId);
  return {
    success: true as const,
    data: {
      requestId,
      status:
        response.data.status === 202
          ? ("pending" as const)
          : ("complete" as const),
      results,
      retryAfterSeconds: response.data.retryAfterSeconds ?? 30,
    },
  };
};

const clay = async <Schema extends z.ZodType>(
  path: string,
  schema: Schema,
  body?: unknown,
  suppliedKey?: string,
) => {
  const Credentials = await import(
    "@/server/app/outbound/provider-credentials"
  );
  const resolved = suppliedKey
    ? { success: true as const, data: suppliedKey }
    : await Credentials.resolveKey("clay");
  const key = resolved.success ? resolved.data : null;
  if (!key) return Promise.resolve(configurationError("clay"));
  return request(
    "clay",
    `https://api.clay.com/public/v0/${path}`,
    {
      method: body === undefined ? "GET" : "POST",
      headers: { "clay-api-key": key, "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
    schema,
  );
};

export const startClayEnrichment = async ({
  items,
}: {
  items: { id: string; inputs: Record<string, string> }[];
}) => {
  const Credentials = await import(
    "@/server/app/outbound/provider-credentials"
  );
  const resolved = await Credentials.resolve("clay");
  if (!resolved.success || !resolved.data.apiKey)
    return configurationError("clay");
  const routine = resolved.data.configuration.routineId;
  if (!routine) return configurationError("clay");
  const parsed = z
    .array(
      z.object({
        id: identifierSchema.max(64),
        inputs: z.record(z.string().max(100), z.string().max(2000)),
      }),
    )
    .min(1)
    .max(100)
    .safeParse(items);
  if (!parsed.success || !identifierSchema.max(64).safeParse(routine).success)
    return inputError("clay");
  const response = await clay(
    `routines/${encodeURIComponent(routine)}/run`,
    z.object({ routine_run_id: z.string() }),
    { items: parsed.data },
    resolved.data.apiKey,
  );
  if (!response.success) return response;
  return {
    success: true as const,
    data: {
      runId: response.data.value.routine_run_id,
      status: "pending" as const,
      requestedAt: new Date().toISOString(),
    },
  };
};

export const pollClayEnrichment = async ({
  runId,
  cursor,
}: {
  runId: string;
  cursor?: string;
}) => {
  if (
    !identifierSchema.safeParse(runId).success ||
    (cursor?.length ?? 0) > 2000
  )
    return inputError("clay");
  const query = cursor ? `?${new URLSearchParams({ cursor })}` : "";
  const response = await clay(
    `routines/run/${encodeURIComponent(runId)}/results${query}`,
    z.object({
      routine_run_id: z.string(),
      status: z.enum(["in_progress", "complete"]),
      total: z.number(),
      finished: z.number(),
      cursor: z.string().optional(),
      data: z
        .array(
          z.object({
            id: z.string(),
            status: z.enum(["complete", "failed"]),
            result: z.record(z.string(), z.unknown()).optional(),
            error: z.object({ message: z.string() }).optional(),
          }),
        )
        .optional(),
    }),
  );
  if (!response.success) return response;
  // Function outputs are workspace-defined. The action layer records this job
  // result for review; it cannot mark a person verified from arbitrary columns.
  return {
    success: true as const,
    data: {
      runId,
      status:
        response.data.value.status === "in_progress"
          ? ("pending" as const)
          : ("complete" as const),
      results: response.data.value.data ?? [],
      cursor: response.data.value.cursor ?? null,
      total: response.data.value.total,
      finished: response.data.value.finished,
      retryAfterSeconds: response.data.retryAfterSeconds ?? 30,
    },
  };
};
