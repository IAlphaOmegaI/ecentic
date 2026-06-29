"use server";

import { resultify, type UnwrapResult } from "@zenncore/utils";
import { z } from "zod";
import { schema } from "../database";
import { withContext } from "../utils/context";
import { Environment } from "../utils/environment";
import { repository } from "../utils/repository";

const answers = z.object({
  companyName: z.string().min(1, "Company name is required"),
  batch: z.string().min(1).optional(),
  contactName: z.string().min(1, "Your name is required"),
  email: z.string().email("Enter a valid email"),
  website: z.string().url("Enter a valid URL").optional(),
  platform: z.string().min(1).optional(),
  monthlyOrders: z.string().min(1).optional(),
  goal: z.string().optional(),
});

/**
 * A zod `safeParse` result is structurally a `Result`, so `withContext`
 * surfaces it directly: `.success` reflects validation, `.data` the answers.
 */
export const parse = withContext(
  async (_, { payload }: { payload: unknown }) => answers.safeParse(payload),
  "DealRedemption.parse",
);

const RATE_LIMIT_WINDOW = 3600;
const RATE_LIMIT_MAX = 20;

const isRateLimited = withContext(
  async (context, { client }: { client: string }) => {
    const key = `rate_limit:deal_redemption:${client}`;
    const count = await resultify(() => context.durable.redis.incr(key));

    // Fail open: a Redis hiccup must never drop a real redemption.
    if (!count.success) return { success: true, data: false };

    if (count.data === 1)
      await resultify(() =>
        context.durable.redis.expire(key, RATE_LIMIT_WINDOW),
      );

    return { success: true, data: count.data > RATE_LIMIT_MAX };
  },
  "DealRedemption.isRateLimited",
);

const { create } = repository(schema.dealRedemption);

export const record = withContext(
  async (
    _,
    {
      merchant,
      payload,
      client,
    }: {
      merchant: string;
      payload: UnwrapResult<Awaited<ReturnType<typeof parse>>>;
      client: string;
    },
  ) => {
    const limited = await isRateLimited(Environment.SERVER, { client });

    if (!limited.success) return limited;
    if (limited.data)
      return { success: false, error: new Error("Rate limited") };

    const creation = await create(Environment.SERVER, {
      merchant,
      companyName: payload.companyName,
      batch: payload.batch ?? null,
      contactName: payload.contactName,
      email: payload.email,
      website: payload.website || null,
      platform: payload.platform || null,
      monthlyOrders: payload.monthlyOrders || null,
      goal: payload.goal?.trim() || null,
      answers: payload,
    });

    if (!creation.success) return creation;

    return { success: true as const, data: { id: creation.data.id } };
  },
  "DealRedemption.record",
);
