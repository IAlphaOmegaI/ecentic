import * as React from "react";

/**
 * Switch — from @zenncore/web@0.0.0.
 */
export interface SwitchProps {
  classList?: { root?: string; thumb?: string };
  children?: React.ReactNode;
  /** CSS class applied to the element, or a function that returns a class based on the component's state. */
  className?: string | ((state: SwitchRootState) => string | undefined);
  /** Whether the switch is initially active. To render a controlled switch, use the `checked` prop instead. */
  defaultChecked?: boolean;
  /** Style applied to the element, or a function that returns a style object based on the component's state. */
  style?:
    | CSSProperties
    | ((state: SwitchRootState) => React.CSSProperties | undefined);
  /** Identifies the form that owns the hidden input. Useful when the switch is rendered outside the form. */
  form?: string;
  /** The id of the hidden input element. When `nativeButton` is `true`, the id is applied to the root element. */
  id?: string;
  /** Identifies the field when a form is submitted. */
  name?: string;
  /** Whether the user must activate the switch before submitting a form. */
  required?: boolean;
  /** Whether the user should be unable to activate or deactivate the switch. */
  readOnly?: boolean;
  /** Whether the component should ignore user interaction. */
  disabled?: boolean;
  /** A ref to access the hidden `<input>` element. */
  inputRef?: React.Ref;
  /** The value submitted with the form when the switch is on. By default, switch submits the "on" value, matching native chec */
  value?: string;
  /** Allows you to replace the component's HTML element with a different tag, or compose it with another component. Accepts a */
  render?:
    | ReactElement<unknown, string | JSXElementConstructor<any>>
    | ComponentRenderFn<HTMLProps, SwitchRootState>;
  /** Whether the component renders a native `<button>` element when replacing it via the `render` prop. Set to `true` if the  */
  nativeButton?: boolean;
  /** Whether the switch is currently active. To render an uncontrolled switch, use the `defaultChecked` prop instead. */
  checked?: boolean;
  /** The value submitted with the form when the switch is off. By default, unchecked switches do not submit any value, matchi */
  uncheckedValue?: string;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}

export declare const Switch: React.ComponentType<SwitchProps>;
