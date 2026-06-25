import { formatPhone } from "./format";
import { inferPhoneCountryConfig } from "./infer";
import type { Country } from "./registry";
import { getSignificantNumber } from "./significant";

export { inferPhoneCountryConfig } from "./infer";
export { type Countries, type Country, countries } from "./registry";

export const changePhoneCountry = (
  phone: string,
  country: Country["iso"],
): string | null => {
  const countryConfig = inferPhoneCountryConfig(phone);

  if (!countryConfig) return null;

  const significantNumber = getSignificantNumber(phone, countryConfig.iso);

  if (!significantNumber) return null;

  return formatPhone(`${countryConfig.prefix}${significantNumber}`, country);
};
