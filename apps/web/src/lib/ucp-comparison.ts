import { resultify } from "@zenncore/utils";

/** UCP discovery starts at an origin, including when a user pastes a product URL. */
export const comparisonOrigin = (input: string) => {
  const value = input.trim();
  if (!value) return null;
  const parsed = resultify(
    () => new URL(value.includes("://") ? value : `https://${value}`),
  );
  if (!parsed.success) return null;
  const address = parsed.data;
  if (
    !["https:", "http:"].includes(address.protocol) ||
    address.username ||
    address.password ||
    (!address.hostname.includes(".") && address.hostname !== "localhost")
  )
    return null;
  return address.origin;
};

/** Return the visible roster entries that repeat the source or an earlier store. */
export const duplicateComparisonIndexes = (
  source: string,
  competitors: string[],
) => {
  const origins = new Set([comparisonOrigin(source)]);
  return competitors.flatMap((value, index) => {
    const origin = comparisonOrigin(value);
    if (!origin) return [];
    if (origins.has(origin)) return [index];
    origins.add(origin);
    return [];
  });
};
