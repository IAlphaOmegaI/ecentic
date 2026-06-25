import * as React from "react";

/**
 * Checkbox — from @zenncore/web@0.0.0.
 * @replaces input[type=checkbox]
 */
export interface CheckboxProps {
  classList?: { root?: string; indicator?: { root?: string; icon?: string } };
  children?: React.ReactNode;
  /** CSS class applied to the element, or a function that returns a class based on the component's state. */
  className?: string | ((state: CheckboxRootState) => string | undefined);
  /** Whether the checkbox is initially ticked. To render a controlled checkbox, use the `checked` prop instead. */
  defaultChecked?: boolean;
  /** Style applied to the element, or a function that returns a style object based on the component's state. */
  style?:
    | CSSProperties
    | ((state: CheckboxRootState) => React.CSSProperties | undefined);
  /** Identifies the form that owns the hidden input. Useful when the checkbox is rendered outside the form. */
  form?: string;
  /** The id of the input element. */
  id?: string;
  /** Identifies the field when a form is submitted. */
  name?: string;
  /** Whether the user must tick the checkbox before submitting a form. */
  required?: boolean;
  /** Whether the user should be unable to tick or untick the checkbox. */
  readOnly?: boolean;
  /** Whether the component should ignore user interaction. */
  disabled?: boolean;
  /** A ref to access the hidden `<input>` element. */
  inputRef?: React.Ref;
  /** The value of the selected checkbox. */
  value?: string;
  /** Allows you to replace the component's HTML element with a different tag, or compose it with another component. Accepts a */
  render?:
    | ReactElement<unknown, string | JSXElementConstructor<any>>
    | ComponentRenderFn<HTMLProps, CheckboxRootState>;
  /** Whether the component renders a native `<button>` element when replacing it via the `render` prop. Set to `true` if the  */
  nativeButton?: boolean;
  /** Whether the checkbox is currently ticked. To render an uncontrolled checkbox, use the `defaultChecked` prop instead. */
  checked?: boolean;
  /** Whether the checkbox is in a mixed state: neither ticked, nor unticked. */
  indeterminate?: boolean;
  /** Whether the checkbox controls a group of child checkboxes. Must be used in a [Checkbox Group](https://base-ui.com/react/ */
  parent?: boolean;
  /** The value submitted with the form when the checkbox is unchecked. By default, unchecked checkboxes do not submit any val */
  uncheckedValue?: string;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}

export declare const Checkbox: React.ComponentType<CheckboxProps>;
