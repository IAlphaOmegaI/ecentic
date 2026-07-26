"use server";

import * as Sentry from "@sentry/nextjs";
import { resultify, type UnwrapResult } from "@zenncore/utils";
import { eq, sql } from "drizzle-orm";
import { schema } from "../database";
import { withContext, withDurable } from "../utils/context";
import { Environment } from "../utils/environment";
import { ValidationError } from "../utils/error";
import { repository } from "../utils/repository";
import * as DealAllowlist from "./deal-allowlist";

/**
 * This webhook receives redemptions from two producers with different payload
 * shapes: our own on-site forms (flat keys — companyName, contactName, email…)
 * and partner deal programs like YC Bookface, whose payload carries the deal's
 * custom-question answers and keys company/contact fields its own way. Rather
 * than reject a foreign shape with a 422, we extract what we can, always keep
 * the full raw payload in `answers`, and record everything as "pending" for
 * manual review — a redemption is never dropped over shape. When the essentials
 * can't be read, Sentry is notified with the payload's keys so the mapping below
 * can be tightened to the real shape.
 */

/** Comparison key: lowercased, stripped of every non-alphanumeric character. */
const canonical = (key: string): string =>
  key.toLowerCase().replace(/[^a-z0-9]/g, "");

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Merge one level of nested objects up so `pick` sees them: `{ company: { name } }`
 * exposes both `company name` (prefixed) and `name` (bare). Precedence, lowest to
 * highest: bare nested, listed, prefixed nested, then top-level keys — so an
 * explicit top-level field always wins over a value lifted out of a nested object.
 */
const flatten = (source: Record<string, unknown>): Record<string, unknown> => {
  const bare = Object.values(source)
    .filter(isRecord)
    .flatMap((value) => Object.entries(value));

  // Arrays of objects (YC sends `companies: [{ name, url… }]`) contribute their
  // first entry prefixed only, never bare: a bare lift would expose the company's
  // `name` where `contactName` looks for the founder's, and win by alias order.
  const listed = Object.entries(source)
    .filter(([, value]) => Array.isArray(value))
    .flatMap(([key, value]) => {
      const first = (value as unknown[]).find(isRecord);

      return first
        ? Object.entries(first).map(
            ([child, inner]) => [`${key} ${child}`, inner] as const,
          )
        : [];
    });

  const prefixed = Object.entries(source)
    .filter(([, value]) => isRecord(value))
    .flatMap(([key, value]) =>
      Object.entries(value as Record<string, unknown>).map(
        ([child, inner]) => [`${key} ${child}`, inner] as const,
      ),
    );

  return {
    ...Object.fromEntries(bare),
    ...Object.fromEntries(listed),
    ...Object.fromEntries(prefixed),
    ...source,
  };
};

/** First non-empty string value among candidate keys, matched loosely. */
const pick = (
  source: Record<string, unknown>,
  keys: readonly string[],
): string | null => {
  const index = Object.fromEntries(
    Object.entries(source).map(([key, value]) => [canonical(key), value]),
  );

  const match = keys
    .map((key) => index[canonical(key)])
    .find(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    );

  return match?.trim() ?? null;
};

/**
 * Candidate keys per field, most specific first. Matching is punctuation- and
 * case-insensitive, so the YC custom-question text doubles as an alias. These
 * are best-effort — the raw payload is the source of truth in `answers`.
 */
const ALIASES = {
  companyName: [
    "companyName",
    "companies name",
    "company",
    "startup",
    "startupName",
    "organization",
    "org",
  ],
  contactName: [
    "contactName",
    "userName",
    "fullName",
    "founderName",
    "name",
    "founder",
  ],
  email: ["email", "workEmail", "contactEmail", "userEmail"],
  website: [
    "website",
    "companyWebsite",
    "companyUrl",
    "companies url",
    "companies website",
    "storeUrl",
    "siteUrl",
    "url",
    "site",
  ],
  batch: ["batch", "ycBatch", "companies batch", "cohort"],
  platform: [
    "platform",
    "commercePlatform",
    "What platform are you selling on?",
  ],
  monthlyOrders: ["monthlyOrders", "orders", "monthlyGmv", "gmv"],
  goal: ["goal", "goals", "notes", "message", "objective"],
} as const;

/** Halves of a split name, for producers that never send it whole (YC). */
const NAME_PARTS = {
  first: ["firstName", "givenName"],
  last: ["lastName", "familyName", "surname"],
} as const;

/** Best-effort structured fields lifted out of an arbitrary redemption payload. */
const normalize = (payload: Record<string, unknown>) => {
  const source = flatten(payload);

  const email = (() => {
    const explicit = pick(source, ALIASES.email);
    if (explicit && EMAIL.test(explicit)) return explicit;

    // Fall back to the first email-looking value anywhere in the payload.
    const scanned = Object.values(source).find(
      (value): value is string =>
        typeof value === "string" && EMAIL.test(value.trim()),
    );
    return scanned?.trim() ?? null;
  })();

  const contactName = (() => {
    // A split name is authoritative when present: the bare `name` alias below
    // can otherwise resolve to a *company's* name lifted out of a nested object.
    const parts = [
      pick(source, NAME_PARTS.first),
      pick(source, NAME_PARTS.last),
    ].filter((part) => part !== null);

    if (parts.length > 0) return parts.join(" ");

    return pick(source, ALIASES.contactName);
  })();

  return {
    companyName: pick(source, ALIASES.companyName),
    contactName,
    email,
    website: pick(source, ALIASES.website),
    batch: pick(source, ALIASES.batch),
    platform: pick(source, ALIASES.platform),
    monthlyOrders: pick(source, ALIASES.monthlyOrders),
    goal: pick(source, ALIASES.goal),
  };
};

/**
 * The payload is any JSON object; foreign shapes are normalized on the way in,
 * so `parse` only guards against a body that carries no object at all. A body
 * that is *malformed* is the caller's doing, not a defect of ours, so it fails
 * as a `ValidationError` — expected, and therefore never reported to Sentry.
 */
export const parse = withContext(
  async (_, { payload }: { payload: unknown }) => {
    // A producer may wrap the redemption in an array (`[{…}]`) or post a batch.
    // Take the first object rather than rejecting: never drop one over shape.
    const body = Array.isArray(payload) ? payload.find(isRecord) : payload;

    if (!isRecord(body))
      return {
        success: false as const,
        error: new ValidationError("Payload must be a JSON object"),
      };

    return { success: true as const, data: body };
  },
  "DealRedemption.parse",
);

const RATE_LIMIT_WINDOW = 3600;
const RATE_LIMIT_MAX = 20;

const isRateLimited = withContext.append(withDurable)(
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

const { create, find } = repository(schema.dealRedemption);

/** Most recent redemption recorded for an email, case-insensitive. */
export const findByEmail = withContext(
  async (_, { email }: { email: string }) => {
    const rows = await find(Environment.SERVER, {
      where: eq(
        sql`lower(${schema.dealRedemption.email})`,
        email.toLowerCase(),
      ),
      // Without an explicit order a bare `limit: 1` returns whichever row
      // Postgres reaches first, so a founder who redeems twice could resolve to
      // the stale row — and status is what gates the coupon at checkout.
      orderBy: [{ column: schema.dealRedemption.createdAt, direction: "desc" }],
      limit: 1,
    });

    if (!rows.success) return rows;
    return { success: true as const, data: rows.data[0] ?? null };
  },
  "DealRedemption.findByEmail",
);

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

    const fields = normalize(payload);

    // Flag shapes we couldn't fully read so the mapping can be tightened. The
    // raw payload is stored regardless, so this is a diagnostic, not a failure.
    // Only an unreadable email or contact name signals drift — a company name is
    // legitimately absent whenever a founder redeems before registering one, so
    // gating on it would fire on every such redemption.
    if (!fields.email || !fields.contactName)
      Sentry.captureMessage("Deal redemption with unrecognized payload shape", {
        level: "warning",
        tags: { merchant },
        extra: { keys: Object.keys(payload), extracted: fields },
      });

    // Auto-approve when the company's domain is on the merchant's directory
    // allowlist; otherwise leave pending for manual batch verification.
    const status = DealAllowlist.matches({
      merchant,
      email: fields.email ?? "",
      website: fields.website,
    })
      ? "approved"
      : "pending";

    const creation = await create(Environment.SERVER, {
      merchant,
      companyName: fields.companyName ?? "Unknown",
      batch: fields.batch,
      contactName: fields.contactName ?? "Unknown",
      email: fields.email ?? "unknown@redemption.invalid",
      website: fields.website,
      platform: fields.platform,
      monthlyOrders: fields.monthlyOrders,
      goal: fields.goal,
      answers: payload,
      status,
    });

    if (!creation.success) return creation;

    return { success: true as const, data: { id: creation.data.id } };
  },
  "DealRedemption.record",
);
