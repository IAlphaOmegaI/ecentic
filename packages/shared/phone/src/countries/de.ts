import type { Result } from "@zenncore/utils";
import { PhoneCountryConfig } from "../config";
import {
  InvalidCountryError,
  InvalidNationalCodeError,
  InvalidSignificantLengthError,
  type PhoneValidationError,
} from "../error";

class DE extends PhoneCountryConfig {
  readonly iso = "DE";
  readonly prefix = "49";
  flag = "🇩🇪";

  formatSignificantNumber(significantNumber: string): string {
    const { length } = significantNumber;

    if (length <= 2) return significantNumber;
    if (length <= 6) {
      return `${significantNumber.slice(0, 2)} ${significantNumber.slice(2)}`;
    }
    return `${significantNumber.slice(0, 2)} ${significantNumber.slice(2, 6)} ${significantNumber.slice(6, 10)}`;
  }

  validate(phone: string): Result<void, PhoneValidationError> {
    const normalizedPhone = this.getNormalizedPhone(phone);

    const isValidCountry = normalizedPhone.startsWith(this.prefix);

    if (!isValidCountry) {
      return {
        success: false,
        error: new InvalidCountryError(),
      };
    }

    const significantNumber = this.getSignificantNumber(phone);

    const nationalCode = significantNumber.slice(0, 2);
    const nationalCodes = ["15", "16", "17"];

    const isValidNationalCode = nationalCodes.includes(nationalCode);

    if (!isValidNationalCode) {
      return {
        success: false,
        error: new InvalidNationalCodeError(),
      };
    }

    const isValidSignificantNumber =
      significantNumber.length === 10 || significantNumber.length === 11;

    if (!isValidSignificantNumber) {
      return {
        success: false,
        error: new InvalidSignificantLengthError(),
      };
    }

    return {
      success: true,
    };
  }
}

export const de: DE = new DE();
