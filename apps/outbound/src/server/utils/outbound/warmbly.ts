import { z } from "zod";
import { type WarmupPlan, warmupPlanSchema } from "@/lib/outbound-warmup";
import { configurationError, inputError, request } from "./http";

const BASE = "https://api.warmbly.com/v1";
const mailboxSchema = z.object({
  id: z.string().uuid(),
  email: z.email().nullish(),
  status: z.string().nullish(),
  warmup: z.string().nullish(),
  warmup_paused_at: z.string().nullish(),
  warmup_stopped_at: z.string().nullish(),
  warmup_base: z.number().int().nonnegative().nullish(),
  warmup_max: z.number().int().nonnegative().nullish(),
  warmup_increase: z.number().int().nonnegative().nullish(),
  warmup_pool_type: z.string().nullish(),
  auth_state: z.string().nullish(),
});
const pageSchema = z.object({
  data: z.array(mailboxSchema),
  pagination: z.object({
    has_more: z.boolean(),
    next_cursor: z.string().nullable(),
  }),
});
const mailbox = (value: z.infer<typeof mailboxSchema>) => ({
  id: value.id,
  email: value.email?.toLowerCase() ?? null,
  status: value.status ?? "unknown",
  warmupStartedAt: value.warmup ?? null,
  pausedAt: value.warmup_paused_at ?? null,
  state: value.warmup_stopped_at
    ? ("off" as const)
    : value.warmup_paused_at
      ? ("paused" as const)
      : value.warmup
        ? ("running" as const)
        : value.warmup === null
          ? ("off" as const)
          : ("unknown" as const),
  initialDailyCap: value.warmup_base ?? null,
  maximumDailyCap: value.warmup_max ?? null,
  dailyIncrease: value.warmup_increase ?? null,
  poolType: value.warmup_pool_type ?? null,
  authState: value.auth_state ?? "unknown",
});
export type WarmblyMailbox = ReturnType<typeof mailbox>;

const api = async <Schema extends z.ZodType>(
  path: string,
  schema: Schema,
  method = "GET",
  body?: unknown,
) => {
  const Credentials = await import(
    "@/server/app/outbound/provider-credentials"
  );
  const credential = await Credentials.resolveKey("warmbly");
  if (!credential.success) return credential;
  if (!credential.data) return configurationError("warmbly");
  return request(
    "warmbly",
    `${BASE}${path}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${credential.data}`,
        "Content-Type": "application/json",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
    schema,
  );
};

export const validateWarmblyKey = async (apiKey: string) => {
  if (!/^wmbly_[A-Za-z0-9_-]{43}$/.test(apiKey))
    return inputError("warmbly", "Enter a Warmbly workspace API key.");
  const response = await request(
    "warmbly",
    `${BASE}/emails?limit=1`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    },
    pageSchema,
  );
  if (!response.success) return response;
  return { success: true as const, data: { valid: true as const } };
};

export const getMailboxes = async (
  input: { cursor?: string; limit?: number } = {},
) => {
  const parsed = z
    .object({
      cursor: z.string().min(1).max(2000).optional(),
      limit: z.number().int().min(1).max(100).default(50),
    })
    .strict()
    .safeParse(input);
  if (!parsed.success)
    return inputError("warmbly", "Choose a valid mailbox page.");
  const parameters = new URLSearchParams({ limit: String(parsed.data.limit) });
  if (parsed.data.cursor) parameters.set("cursor", parsed.data.cursor);
  const response = await api(`/emails?${parameters}`, pageSchema);
  if (!response.success) return response;
  return {
    success: true as const,
    data: {
      mailboxes: response.data.value.data.map(mailbox),
      hasMore: response.data.value.pagination.has_more,
      nextCursor: response.data.value.pagination.next_cursor,
    },
  };
};

export const getMailboxWarmup = async (input: { id: string }) => {
  const parsed = z.object({ id: z.string().uuid() }).strict().safeParse(input);
  if (!parsed.success)
    return inputError("warmbly", "Choose a Warmbly mailbox.");
  const response = await api(`/emails/${parsed.data.id}`, mailboxSchema);
  if (!response.success) return response;
  return { success: true as const, data: mailbox(response.data.value) };
};

export const configureMailboxWarmup = async (input: {
  id: string;
  plan: WarmupPlan;
}) => {
  const parsed = z
    .object({ id: z.string().uuid(), plan: warmupPlanSchema })
    .strict()
    .safeParse(input);
  if (!parsed.success)
    return inputError("warmbly", "Review the mailbox ramp settings.");
  const response = await api(
    `/emails/${parsed.data.id}`,
    mailboxSchema,
    "PATCH",
    {
      warmup_base: parsed.data.plan.initialDailyCap,
      warmup_max: parsed.data.plan.maximumDailyCap,
      warmup_increase: parsed.data.plan.dailyIncrease,
    },
  );
  if (!response.success) return response;
  return { success: true as const, data: mailbox(response.data.value) };
};

export const changeMailboxWarmup = async (input: {
  id: string;
  action: "start" | "pause" | "resume" | "stop";
}) => {
  const parsed = z
    .object({
      id: z.string().uuid(),
      action: z.enum(["start", "pause", "resume", "stop"]),
    })
    .strict()
    .safeParse(input);
  if (!parsed.success) return inputError("warmbly", "Choose a warmup action.");
  const response = await api(
    `/emails/${parsed.data.id}/warmup/${parsed.data.action}`,
    mailboxSchema,
    "POST",
  );
  if (!response.success) return response;
  return { success: true as const, data: mailbox(response.data.value) };
};
