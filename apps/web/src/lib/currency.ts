const symbols: Record<string, string> = {
  EUR: "\u20AC",
  GBP: "\u00A3",
  USD: "$",
  CAD: "CA$",
  AUD: "A$",
  JPY: "\u00A5",
  CHF: "CHF",
  SEK: "kr",
  NOK: "kr",
  DKK: "kr",
};

export const getCurrencySymbol = (currency: string | null): string => {
  if (!currency) return "$";
  return symbols[currency.toUpperCase()] ?? currency.toUpperCase();
};

/**
 * Strips any leading currency symbols or codes from a price string,
 * returning only the numeric value (e.g. "29.99").
 */
export const normalizePrice = (price: string): string =>
  price.replace(/^[^\d]*/, "").trim();

export const formatPrice = (
  price: string | null,
  currency: string | null,
): string => {
  if (!price) return "\u2014";

  const numeric = normalizePrice(price);
  if (!numeric) return "\u2014";

  const symbol = getCurrencySymbol(currency);

  return `${symbol} ${numeric}`;
};
