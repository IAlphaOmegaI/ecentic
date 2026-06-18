import type { Result } from "@zenncore/utils";
import { PhoneCountryConfig } from "../config";
import {
  InvalidCountryError,
  InvalidSignificantLengthError,
  type PhoneValidationError,
} from "../error";

class GB extends PhoneCountryConfig {
  readonly iso = "GB";
  readonly prefix = "44";
  readonly significantLength = 10;
  flag = "🇬🇧";

  formatSignificantNumber(significantNumber: string): string {
    const { length } = significantNumber;

    if (length <= 4) return significantNumber;
    return `${significantNumber.slice(0, 4)} ${significantNumber.slice(4, this.significantLength)}`;
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
    const isValidSignificantNumber =
      significantNumber.length === this.significantLength;

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

export const gb: GB = new GB();
