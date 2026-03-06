import type { Result } from "@zenncore/utils";
import {
  InvalidCountryError,
  InvalidNationalCodeError,
  InvalidSignificantError,
  InvalidSignificantLengthError,
  type PhoneValidationError,
} from "./error";
import { normalizePhone } from "./normalize";

export const FormatType = {
  NATIONAL: "national",
  INTERNATIONAL: "international",
  E164: "e164",
} as const;
export type FormatType = (typeof FormatType)[keyof typeof FormatType];

export const FORMAT_TYPES: FormatType[] = Object.values(FormatType);

export abstract class PhoneCountryConfig {
  public abstract readonly iso: string;
  public abstract readonly prefix: string;
  public abstract readonly flag: string;

  public abstract validate(phone: string): Result<void, PhoneValidationError>;
  protected abstract formatSignificantNumber(significantNumber: string): string;

  public getNormalizedPhone(phone: string): string {
    return normalizePhone(phone);
  }

  public getSignificantNumber(phone: string): string {
    return this.getNormalizedPhone(phone).replace(this.prefix, "");
  }

  public format(phone: string, type?: FormatType): string {
    const significantNumber = this.getSignificantNumber(phone);
    const formattedSignificantNumber =
      this.formatSignificantNumber(significantNumber);

    if (significantNumber.length === 0) return phone;

    // TODO: fix if formattedSignificantNumber already contain zeros
    if (type === FormatType.NATIONAL) {
      return `0${formattedSignificantNumber}`;
    }

    if (type === FormatType.INTERNATIONAL) {
      return `00${this.prefix} ${formattedSignificantNumber}`;
    }

    return `${this.prefix} ${formattedSignificantNumber}`;
  }

  isInvalidCountryError(
    error: PhoneValidationError,
  ): error is InvalidCountryError {
    return error instanceof InvalidCountryError;
  }

  isInvalidSignificantError(
    error: PhoneValidationError,
  ): error is InvalidSignificantError {
    return error instanceof InvalidSignificantError;
  }

  isInvalidNationalCodeError(
    error: PhoneValidationError,
  ): error is InvalidNationalCodeError {
    return error instanceof InvalidNationalCodeError;
  }

  isInvalidSignificantLengthError(
    error: PhoneValidationError,
  ): error is InvalidSignificantLengthError {
    return error instanceof InvalidSignificantLengthError;
  }
}
