/**
 * Approximate FX for relevance gating — not for billing or display.
 *
 * Measured offer discovery compares a merchant list price to Google Shopping
 * hits that often arrive in a different presentment currency (MKD catalog vs
 * US Shopping USD). Without a conversion the ±40% band is meaningless; a
 * static table is enough to keep peers that are actually in-band after FX and
 * to reject only real outliers.
 *
 * Rates are units of USD per 1 unit of the named currency. Refresh occasionally;
 * a few percent of drift does not matter for a ±40% gate.
 */
const USD_PER_UNIT: Record<string, number> = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
  CAD: 0.72,
  AUD: 0.65,
  NZD: 0.6,
  CHF: 1.12,
  JPY: 0.0067,
  CNY: 0.14,
  INR: 0.012,
  MXN: 0.05,
  BRL: 0.18,
  SEK: 0.095,
  NOK: 0.092,
  DKK: 0.145,
  PLN: 0.25,
  CZK: 0.043,
  HUF: 0.0027,
  RON: 0.22,
  TRY: 0.029,
  ZAR: 0.055,
  AED: 0.27,
  SAR: 0.27,
  ILS: 0.27,
  SGD: 0.75,
  HKD: 0.13,
  KRW: 0.00072,
  TWD: 0.031,
  THB: 0.029,
  MYR: 0.22,
  PHP: 0.017,
  IDR: 0.000062,
  VND: 0.00004,
  /** Macedonian denar — MIJA and similar catalogs. ~56 MKD ≈ $1. */
  MKD: 0.018,
  RSD: 0.0093,
  BAM: 0.55,
  ALL: 0.011,
  UAH: 0.024,
  RUB: 0.011,
};

const code = (value: string | null | undefined) => {
  const trimmed = value?.trim().toUpperCase() ?? "";
  return trimmed.length === 3 ? trimmed : null;
};

/**
 * Convert an amount to USD. Returns null when the currency is unknown so the
 * caller can skip the price band rather than invent a rate.
 */
export const toUsd = (
  amount: number,
  currency: string | null | undefined,
): number | null => {
  if (!Number.isFinite(amount)) return null;
  const resolved = code(currency);
  if (!resolved) return null;
  const rate = USD_PER_UNIT[resolved];
  if (rate === undefined) return null;
  return amount * rate;
};

export const knownCurrency = (currency: string | null | undefined) =>
  code(currency) !== null &&
  USD_PER_UNIT[code(currency) as string] !== undefined;
