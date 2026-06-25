import * as React from "react";

/**
 * TextField — from @zenncore/web@0.0.0.
 * @replaces input
 */
export interface TextFieldProps {
  name?: string;
  disabled?: boolean;
  children?: React.ReactNode;
  style?: CSSProperties;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  id?: string;
  /** Allows you to replace the component's HTML element with a different tag, or compose it with another component. Accepts a */
  render?:
    | ReactElement<unknown, string | JSXElementConstructor<any>>
    | ComponentRenderFn<HTMLProps<any>, TextField.State>;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  type?: "text" | "email" | "password";
  className?: string | ((state: TextField.State) => string);
}

export declare const TextField: React.ComponentType<TextFieldProps>;
