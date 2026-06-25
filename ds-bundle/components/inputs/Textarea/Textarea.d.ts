import * as React from "react";

/**
 * Textarea — from @zenncore/web@0.0.0.
 * @replaces textarea
 */
export interface TextareaProps {
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
    | ComponentRenderFn<HTMLProps<any>, Textarea.State>;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string | ((state: Textarea.State) => string);
}

export declare const Textarea: React.ComponentType<TextareaProps>;
