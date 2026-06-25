import * as React from "react";

/**
 * PhoneField — from @zenncore/web@0.0.0.
 */
export interface PhoneFieldProps {
  children?: React.ReactNode;
  style?: CSSProperties;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  id?: string;
  /** Allows you to replace the component's HTML element with a different tag, or compose it with another component. Accepts a */
  render?:
    | ReactElement<unknown, string | JSXElementConstructor<any>>
    | ComponentRenderFn<HTMLProps<any>, PhoneField.State>;
  defaultValue?: string;
  name?: string;
  disabled?: boolean;
  value?: string;
  onValueChange?: (value: string) => void;
  defaultCountry?: "AL" | "DE" | "GB" | "US";
  onCountryChange?: (country: ISO) => void;
  className?: string | ((state: PhoneField.State) => string);
}

export declare const PhoneField: React.ComponentType<PhoneFieldProps>;
