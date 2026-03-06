import type { Result } from "@zenncore/utils";
import { PhoneCountryConfig } from "../config";
import {
  InvalidCountryError,
  InvalidSignificantLengthError,
  type PhoneValidationError,
} from "../error";

class US extends PhoneCountryConfig {
  readonly iso = "US";
  readonly prefix = "1";
  flag = "🇺🇸";

  formatSignificantNumber(significantNumber: string): string {
    const { length } = significantNumber;

    if (length === 0) return "";
    if (length <= 2) return `(${significantNumber}`;
    if (length <= 3) return `(${significantNumber.slice(0, 3)})`;
    if (length <= 6) {
      return `(${significantNumber.slice(0, 3)}) ${significantNumber.slice(3)}`;
    }
    return `(${significantNumber.slice(0, 3)}) ${significantNumber.slice(3, 6)}-${significantNumber.slice(6, 10)}`;
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
    const isValidSignificantNumber = significantNumber.length === 10;

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

export const us: US = new US();
