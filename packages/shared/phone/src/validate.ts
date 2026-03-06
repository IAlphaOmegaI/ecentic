import type { Result } from "@zenncore/utils";
import { type Country, countries } from "./country";
import { InvalidCountryError, type PhoneValidationError } from "./error";

export const validatePhone = (
  phone: string,
  country?: Country["iso"],
): Result<void, PhoneValidationError> => {
  if (country) {
    const config = countries.find(({ iso }) => iso === country);

    if (!config) {
      return {
        success: false,
        error: new InvalidCountryError(),
      };
    }

    return config.validate(phone);
  }

  for (const country of countries) {
    const result = country.validate(phone);

    if (result.success) return result;
    // if the check failed, but it was due to some other error than `INVALID_COUNTRY`,
    // then the country was found, but the significant number itself is invalid
    if (result.error instanceof InvalidCountryError) return result;
  }

  return {
    success: false,
    error: new InvalidCountryError(),
  };
};

export const isValidPhone = (
  phone: string,
  country?: Country["iso"],
): boolean => {
  return validatePhone(phone, country).success;
};
