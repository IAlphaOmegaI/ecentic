import type { FormatType } from "./config";
import { inferPhoneCountryConfig } from "./infer";
import { normalizePhone } from "./normalize";
import { type Country, countries } from "./registry";

export const formatPhone = (
  phone: string,
  country: Country["iso"] | undefined = inferPhoneCountryConfig(phone)?.iso,
  type?: FormatType,
): string => {
  const normalized = normalizePhone(phone);
  const config = countries.find(({ iso }) => iso === country);

  if (!config) return normalized;
  return config.format(normalized, type);
};
