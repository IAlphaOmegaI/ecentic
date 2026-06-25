import * as React from "react";

/**
 * Radio — from @zenncore/web@0.0.0.
 * @replaces input[type=radio]
 */
export interface RadioProps {
  classList?: { root?: string; indicator?: string };
  /** The unique identifying value of the radio in a group. */
  value: unknown;
  /** Whether the component should ignore user interaction. */
  disabled?: boolean;
  /** Whether the user must choose a value before submitting a form. */
  required?: boolean;
  /** Whether the user should be unable to select the radio button. */
  readOnly?: boolean;
  /** A ref to access the hidden input element. */
  inputRef?: React.Ref;
  /** Whether the component renders a native `<button>` element when replacing it via the `render` prop. Set to `true` if the  */
  nativeButton?: boolean;
  children?: React.ReactNode;
  /** CSS class applied to the element, or a function that returns a class based on the component's state. */
  className?: string | ((state: RadioRootState) => string | undefined);
  /** Style applied to the element, or a function that returns a style object based on the component's state. */
  style?:
    | CSSProperties
    | ((state: RadioRootState) => React.CSSProperties | undefined);
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  id?: string;
  /** Allows you to replace the component's HTML element with a different tag, or compose it with another component. Accepts a */
  render?:
    | ReactElement<unknown, string | JSXElementConstructor<any>>
    | ComponentRenderFn<HTMLProps, RadioRootState>;
}

export declare const Radio: React.ComponentType<RadioProps>;
