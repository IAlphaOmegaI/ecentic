"use server";

import { resultify } from "@zenncore/utils";
import { eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { db, schema } from "../database";
import { withContext, withDurable } from "../utils/context";
import { Environment } from "../utils/environment";
import { DatabaseError, ValidationError } from "../utils/error";
import { type Document, repository } from "../utils/repository";
import { isPromoKey } from "../utils/stripe";

/**
 * A launch promo is a single seat: the first email to claim it takes it, and no
 * one else ever can.
 *
 * The guarantee is the unique index on `promo`, not this file — two claims
 * racing each other both reach Postgres, one inserts and the other conflicts
 * and does nothing. No application code decides the winner, so there is no
 * window where two requests both read "unclaimed" and both write.
 *
 * Claiming is deliberately unauthenticated: the offer is meant to be won with
 * nothing but an email, before the winner has an account. The claim alone is
 * not the discount — `Subscription.createCheckoutSessionForUser` only applies
 * the coupon to an account whose (verified) email matches the claim, so
 * claiming an address you don't control wins nothing but denies the seat.
 */

export const { get, find, update } = repository(schema.promoClaim);

export type Type = Document<typeof schema.promoClaim>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalize = (email: string): string => email.trim().toLowerCase();

/** Claims are public writes, so they are rate limited per client like the deal webhook. */
const RATE_LIMIT_WINDOW = 3600;
const RATE_LIMIT_MAX = 30;

const isRateLimited = withContext.append(withDurable)(
  async (context, { client }: { client: string }) => {
    const key = `rate_limit:promo_claim:${client}`;
    const count = await resultify(() => context.durable.redis.incr(key));

    // Fail open: a Redis hiccup must never cost someone the seat.
    if (!count.success) return { success: true as const, data: false };

    if (count.data === 1)
      await resultify(() =>
        context.durable.redis.expire(key, RATE_LIMIT_WINDOW),
      );

    return { success: true as const, data: count.data > RATE_LIMIT_MAX };
  },
  "PromoClaim.isRateLimited",
);

/** The claim holding a promo, if the seat has been taken. */
export const findByPromo = withContext(
  async (_, { promo }: { promo: string }) => {
    const rows = await find(Environment.SERVER, {
      where: eq(schema.promoClaim.promo, promo),
      limit: 1,
    });

    if (!rows.success) return rows;
    return { success: true as const, data: rows.data[0] ?? null };
  },
  "PromoClaim.findByPromo",
);

/** The promo an email holds, if any — case-insensitive. */
export const findByEmail = withContext(
  async (_, { email }: { email: string }) => {
    const rows = await find(Environment.SERVER, {
      where: eq(sql`lower(${schema.promoClaim.email})`, normalize(email)),
      limit: 1,
    });

    if (!rows.success) return rows;
    return { success: true as const, data: rows.data[0] ?? null };
  },
  "PromoClaim.findByEmail",
);

/**
 * Whether the seat is still open. The holder's email is deliberately not
 * returned — the claim page is public, and who took it is nobody else's
 * business.
 */
export const isOpen = withContext(async (_, { promo }: { promo: string }) => {
  const holder = await findByPromo(Environment.SERVER, { promo });
  if (!holder.success) return holder;

  return { success: true as const, data: holder.data === null };
}, "PromoClaim.isOpen");

export type Outcome =
  | { status: "claimed"; email: string }
  | { status: "taken" };

export const claim = withContext(
  async (
    context,
    { promo, email: address }: { promo: string; email: string },
  ) => {
    if (!isPromoKey(promo))
      return {
        success: false as const,
        error: new ValidationError(`Unknown promo: ${promo}`),
      };

    const email = normalize(address);

    if (!EMAIL.test(email))
      return {
        success: false as const,
        error: new ValidationError("Enter a valid email address"),
      };

    const client = await (async () => {
      const list = await headers();
      const forwarded = list.get("x-forwarded-for");
      return forwarded?.split(",")[0]?.trim() ?? "unknown";
    })();

    const limited = await isRateLimited(Environment.SERVER, { client });
    if (!limited.success) return limited;
    if (limited.data)
      return {
        success: false as const,
        error: new ValidationError("Too many attempts — try again later"),
      };

    // The whole race guard: the insert either wins the seat and returns the
    // row, or conflicts on the unique promo index and returns nothing.
    const insertion = await resultify(() =>
      db
        .insert(schema.promoClaim)
        .values({ promo, email })
        .onConflictDoNothing({ target: schema.promoClaim.promo })
        .returning(),
    );

    if (!insertion.success)
      return {
        success: false as const,
        error: new DatabaseError("Failed to claim promo", {
          cause: insertion.error,
        }),
      };

    if (insertion.data[0]) {
      context.span.addBreadcrumb({
        category: "promo.claimed",
        data: { promo, email },
      });

      return {
        success: true as const,
        data: { status: "claimed" as const, email },
      };
    }

    // Someone holds it. The holder resubmitting their own address is not a
    // failure — they still have the seat, so report it as claimed rather than
    // telling the winner they lost.
    const holder = await findByPromo(Environment.SERVER, { promo });
    if (!holder.success) return holder;

    if (holder.data && normalize(holder.data.email) === email)
      return {
        success: true as const,
        data: { status: "claimed" as const, email },
      };

    return { success: true as const, data: { status: "taken" as const } };
  },
  "PromoClaim.claim",
);

/**
 * Records that the claimed seat converted. Called from the Stripe webhook, so
 * it must stay idempotent — the same checkout can be delivered more than once.
 */
export const markRedeemed = withContext(
  async (_, { promo, at }: { promo: string; at: Date }) => {
    const holder = await findByPromo(Environment.SERVER, { promo });
    if (!holder.success) return holder;
    if (!holder.data) return { success: true as const, data: null };
    if (holder.data.redeemedAt)
      return { success: true as const, data: holder.data };

    return update(Environment.SERVER, holder.data.id, {
      redeemedAt: at,
      updatedAt: new Date(),
    });
  },
  "PromoClaim.markRedeemed",
);
