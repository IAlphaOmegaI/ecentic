import { type Country, countries, inferPhoneCountryConfig } from "./country";
import { normalizePhone } from "./normalize";

export const formatPhone = (
  phone: string,
  country: Country["iso"] | undefined = inferPhoneCountryConfig(phone)?.iso,
): string => {
  const normalized = normalizePhone(phone);
  const config = countries.find(({ iso }) => iso === country);

  if (!config) return normalized;
  return config.format(normalized);
};
