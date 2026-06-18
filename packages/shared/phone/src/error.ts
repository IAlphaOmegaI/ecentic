export class PhoneValidationError extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class InvalidCountryError extends PhoneValidationError {}
export class InvalidSignificantError extends PhoneValidationError {}

export class InvalidNationalCodeError extends InvalidSignificantError {}
export class InvalidSignificantLengthError extends InvalidSignificantError {}
