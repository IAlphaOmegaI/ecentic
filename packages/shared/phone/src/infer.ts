import { InvalidCountryError } from "./error";
import { normalizePhone } from "./normalize";
import { type Country, countries } from "./registry";

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
