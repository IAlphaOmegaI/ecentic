import { createHash } from "node:crypto";

/** A recorded absence is different from legacy jobs without a baseline. */
export const absentBlogTranslationTarget = "absent";

const canonicalSnapshot = (value: unknown): unknown => {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonicalSnapshot);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalSnapshot(entry)]),
    );
  return value;
};

export const blogTranslationTargetHash = (target: object | null) =>
  target === null
    ? absentBlogTranslationTarget
    : createHash("sha256")
        .update(JSON.stringify(canonicalSnapshot(target)))
        .digest("hex");

export const blogTranslationTargetMatches = (
  expectedHash: string | null,
  target: object | null,
) =>
  expectedHash === null || expectedHash === blogTranslationTargetHash(target);
