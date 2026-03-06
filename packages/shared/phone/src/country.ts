import { al } from "./countries/al";
import { de } from "./countries/de";
import { us } from "./countries/us";
import { InvalidCountryError } from "./error";
import { formatPhone } from "./format";
import { normalizePhone } from "./normalize";
import { getSignificantNumber } from "./significant";

export type Countries = [typeof al, typeof de, typeof us];
export type Country = Countries[number];

export const countries: Countries = [al, de, us] as const;

export const inferPhoneCountryConfig = (phone: string): Country | null => {
  for (const country of countries) {
    const result = country.validate(normalizePhone(phone));

    if (result.success) return country;
    // if the check failed, but it was due to some other error than `INVALID_COUNTRY`,
    // then the country was found, but the significant number itself is invalid
    if (!(result.error instanceof InvalidCountryError)) return country;
  }

  return null;
};

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
