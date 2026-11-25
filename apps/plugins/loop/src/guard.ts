export class LoopError extends Error {
  constructor(
    message: string,
    readonly status: number | null = null,
  ) {
    super(message);
    this.name = "LoopError";
  }
}

/** Loop data belongs to exactly one opted-in merchant, never a merchant pool. */
export const assertMerchant: (store: unknown) => asserts store is string = (
  store,
) => {
  if (
    typeof store !== "string" ||
    !store.trim() ||
    store.length > 256 ||
    [...store].some((character) => character.charCodeAt(0) < 32)
  )
    throw new LoopError("A single merchant identifier is required.");
};

export const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export const identifier = (value: unknown): string | null => {
  if (typeof value === "string" && /^\d{1,30}$/.test(value)) return value;
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0)
    return String(value);
  return null;
};

export const text = (value: unknown, maximum = 1000): string =>
  typeof value === "string"
    ? value.slice(0, maximum).replaceAll(String.fromCharCode(0), "")
    : "";

export const timestamp = (value: unknown): string | null => {
  if (typeof value !== "string" || value.length > 64) return null;
  const normalized = /^\d{4}-\d\d-\d\d[ T]\d\d:\d\d:\d\d(?:\.\d+)?$/.test(value)
    ? `${value.replace(" ", "T")}Z`
    : value;
  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
};
