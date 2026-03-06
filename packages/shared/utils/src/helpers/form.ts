import type { FieldErrors } from "react-hook-form";

export type FieldError = FieldErrors[keyof FieldErrors];

export const getErrorMessage = (value: FieldError): string | undefined => {
  if (typeof value?.message === "string") return value.message;

  if (typeof value === "object") {
    for (const key in value) {
      const message = getErrorMessage(
        value[key as keyof typeof value] as FieldError,
      );
      if (message) return message;
    }
  }
};
