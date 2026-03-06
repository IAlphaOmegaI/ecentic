export class PhoneValidationError extends Error {
  static override name = "PhoneValidationError";
}
export class InvalidCountryError extends PhoneValidationError {
  static override name = "InvalidCountryError";
}
export class InvalidSignificantError extends PhoneValidationError {
  static override name = "InvalidSignificantError";
}

export class InvalidNationalCodeError extends InvalidSignificantError {
  static override name = "InvalidNationalCodeError";
}
export class InvalidSignificantLengthError extends InvalidSignificantError {
  static override name = "InvalidSignificantLengthError";
}
