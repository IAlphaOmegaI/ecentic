import type { Result } from "@zenncore/utils";
import { PhoneCountryConfig } from "../config";
import {
  InvalidCountryError,
  InvalidNationalCodeError,
  InvalidSignificantLengthError,
  type PhoneValidationError,
} from "../error";

class AL extends PhoneCountryConfig {
  readonly iso = "AL";
  readonly prefix = "355";
  flag = "🇦🇱";

  formatSignificantNumber(significantNumber: string): string {
    const { length } = significantNumber;

    if (length <= 2) return significantNumber;
    if (length <= 5) {
      return `${significantNumber.slice(0, 2)} ${significantNumber.slice(2)}`;
    }
    return `${significantNumber.slice(0, 2)} ${significantNumber.slice(
      2,
      5,
    )} ${significantNumber.slice(5, 9)}`;
  }

  validate(phone: string): Result<void, PhoneValidationError> {
    const normalizedPhone = this.getNormalizedPhone(phone);

    const isValidPrefix = normalizedPhone.startsWith(this.prefix);

    if (!isValidPrefix) {
      return {
        success: false,
        error: new InvalidCountryError(),
      };
    }

    const significantNumber = this.getSignificantNumber(phone);

    const nationalCode = significantNumber.slice(0, 2);
    const nationalCodes = ["66", "67", "68", "69"];

    const isValidNationalCode = nationalCodes.includes(nationalCode);

    if (!isValidNationalCode) {
      return {
        success: false,
        error: new InvalidNationalCodeError(),
      };
    }

    const isValidSignificantNumber = significantNumber.length === 9;

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

export const al: AL = new AL();
