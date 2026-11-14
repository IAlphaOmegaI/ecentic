"use client";

import type { RefinedProps } from "@zenncore/web/components/inferred-form";
import { TextField, TextFieldInput } from "@zenncore/web/components/text-field";
import type { FocusEventHandler, HTMLAttributes, Ref } from "react";

/** Explicit native input composition for string-backed URL and numeric form fields. */
export const InteractiveInput = ({
  value,
  onValueChange,
  label,
  name,
  inputMode,
  onBlur,
  ref,
  disabled,
}: InteractiveInput.Props) => (
  <TextField
    value={value ?? ""}
    onValueChange={onValueChange}
    disabled={disabled}
    className="h-12 bg-background-dimmed"
  >
    <TextFieldInput
      ref={ref}
      name={name}
      onBlur={onBlur}
      inputMode={inputMode}
      aria-label={label}
      autoComplete="off"
      autoCapitalize="off"
      spellCheck={false}
      maxLength={250}
      className="text-base"
    />
  </TextField>
);
export namespace InteractiveInput {
  export type Props = RefinedProps<string> & {
    label?: string;
    name?: string;
    inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
    onBlur?: FocusEventHandler<HTMLInputElement>;
    ref?: Ref<HTMLInputElement>;
    disabled?: boolean;
  };
}
