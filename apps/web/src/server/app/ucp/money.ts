/**
 * UCP money handling. Wire amounts are integer minor units (cents for most
 * currencies); the synced `product` table stores decimal major-unit strings,
 * so conversion needs the currency's exponent.
 */

/** ISO 4217 currencies whose exponent is not 2. */
const CURRENCY_EXPONENTS: Record<string, number> = {
  BIF: 0,
  CLP: 0,
  DJF: 0,
  GNF: 0,
  ISK: 0,
  JPY: 0,
  KMF: 0,
  KRW: 0,
  PYG: 0,
  RWF: 0,
  UGX: 0,
  UYI: 0,
  VND: 0,
  VUV: 0,
  XAF: 0,
  XOF: 0,
  XPF: 0,
  BHD: 3,
  IQD: 3,
  JOD: 3,
  KWD: 3,
  LYD: 3,
  OMR: 3,
  TND: 3,
};

export const currencyExponent = (currency: string): number =>
  CURRENCY_EXPONENTS[currency.toUpperCase()] ?? 2;

/**
 * Converts a decimal major-unit amount string (e.g. "19.99") to integer minor
 * units. Returns null for missing/unparsable values so callers can omit the
 * price rather than serve a wrong one.
 */
export const toMinorUnits = (
  amount: string | null | undefined,
  currency: string,
): number | null => {
  if (amount === null || amount === undefined || amount.trim() === "") {
    return null;
  }
  const parsed = Number.parseFloat(amount);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed * 10 ** currencyExponent(currency));
};

/** Formats integer minor units as a display string, e.g. 1999 → "19.99 USD". */
export const displayAmount = (minorUnits: number, currency: string): string => {
  const exponent = currencyExponent(currency);
  const major = minorUnits / 10 ** exponent;
  return `${major.toFixed(exponent)} ${currency.toUpperCase()}`;
};

export type UcpAmount = { amount: number; currency: string };

export const ucpAmount = (amount: number, currency: string): UcpAmount => ({
  amount,
  currency: currency.toUpperCase(),
});
