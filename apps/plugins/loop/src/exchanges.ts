import { assertMerchant, LoopError } from "./guard";
import type { LoopVariant } from "./types";

const apparel = [
  "xxs",
  "xs",
  "s",
  "m",
  "l",
  "xl",
  "xxl",
  "xxxl",
  "4xl",
  "5xl",
  "6xl",
];
const aliases: Record<string, string> = {
  small: "s",
  medium: "m",
  large: "l",
  "extra small": "xs",
  "extra large": "xl",
  "2xl": "xxl",
  "3xl": "xxxl",
};
const normalize = (value: string) =>
  value.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
const size = (value: string) => {
  const normalized = normalize(value);
  const index = apparel.indexOf(aliases[normalized] ?? normalized);
  if (index >= 0) return { scale: "apparel", value: index };
  const numeric =
    /^(?:(us|uk|eu|waist|inch|in|cm)\s*)?(\d{1,3}(?:\.\d+)?)\s*(us|uk|eu|inches|inch|in|cm)?$/.exec(
      normalized,
    );
  if (!numeric) return null;
  const prefix = numeric[1] ?? numeric[3] ?? "numeric";
  return {
    scale: prefix === "inches" || prefix === "inch" ? "in" : prefix,
    value: Number(numeric[2]),
  };
};

/** Variant evidence is directional only when both records belong to this store and product. */
export const exchangeDirection = (
  store: string,
  { from, to }: { from: LoopVariant; to: LoopVariant },
): {
  attribute: "size";
  direction: "up" | "down" | "same";
  steps: number;
} | null => {
  assertMerchant(store);
  if (from.store !== store || to.store !== store)
    throw new LoopError("Loop exchange variants belong to another merchant.");
  if (!from.productId || from.productId !== to.productId) return null;
  const source = Object.fromEntries(
    Object.entries(from.options).map(([key, value]) => [
      normalize(key),
      normalize(value),
    ]),
  );
  const destination = Object.fromEntries(
    Object.entries(to.options).map(([key, value]) => [
      normalize(key),
      normalize(value),
    ]),
  );
  const attribute = Object.keys(source).find((key) =>
    /^(size|shoe size|clothing size|waist size)$/.test(key),
  );
  if (!attribute || !destination[attribute]) return null;
  if (
    Object.keys(source).length !== Object.keys(destination).length ||
    Object.keys(source).some(
      (key) => key !== attribute && source[key] !== destination[key],
    )
  )
    return null;
  const current = size(source[attribute] ?? "");
  const replacement = size(destination[attribute] ?? "");
  if (!current || !replacement || current.scale !== replacement.scale)
    return null;
  const difference = replacement.value - current.value;
  return {
    attribute: "size",
    direction: difference === 0 ? "same" : difference > 0 ? "up" : "down",
    steps: Math.abs(difference),
  };
};
