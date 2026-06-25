import * as React from "react";

/**
 * NumberField — from @zenncore/web@0.0.0.
 */
export interface NumberFieldProps {
  children?: React.ReactNode;
  /** CSS class applied to the element, or a function that returns a class based on the component's state. */
  className?: string | ((state: NumberFieldRootState) => string | undefined);
  /** The uncontrolled value of the field when it's initially rendered. To render a controlled number field, use the `value` p */
  defaultValue?: number;
  /** Style applied to the element, or a function that returns a style object based on the component's state. */
  style?:
    | CSSProperties
    | ((state: NumberFieldRootState) => React.CSSProperties | undefined);
  /** Identifies the form that owns the hidden input. Useful when the number field is rendered outside the form. */
  form?: string;
  /** The id of the input element. */
  id?: string;
  /** Identifies the field when a form is submitted. */
  name?: string;
  /** Whether the user must enter a value before submitting a form. */
  required?: boolean;
  /** Whether the user should be unable to change the field value. */
  readOnly?: boolean;
  /** Whether the component should ignore user interaction. */
  disabled?: boolean;
  /** A ref to access the hidden input element. */
  inputRef?: React.Ref;
  /** The locale of the input element. Defaults to the user's runtime locale. */
  locale?: string | Intl.Locale | readonly (string | Intl.Locale)[];
  /** The raw numeric value of the field. */
  value?: number;
  /** Allows you to replace the component's HTML element with a different tag, or compose it with another component. Accepts a */
  render?:
    | ReactElement<unknown, string | JSXElementConstructor<any>>
    | ComponentRenderFn<HTMLProps, NumberFieldRootState>;
  /** The maximum value of the input element. */
  max?: number;
  /** Amount to increment and decrement with the buttons and arrow keys, or to scrub with pointer movement in the scrub area.  */
  step?: number | "any";
  /** The minimum value of the input element. */
  min?: number;
  /** Options to format the input value. */
  format?: Intl.NumberFormatOptions;
  /** When true, direct text entry may be outside the `min`/`max` range without clamping, so native range underflow/overflow v */
  allowOutOfRange?: boolean;
  /** The small step value of the input element when incrementing while the alt key is held. Snaps to multiples of this value  */
  smallStep?: number;
  /** The large step value of the input element when incrementing while the shift key is held. Snaps to multiples of this valu */
  largeStep?: number;
  /** Whether to allow the user to scrub the input value with the mouse wheel while focused and hovering over the input. */
  allowWheelScrub?: boolean;
  /** Whether the value should snap to the nearest step when incrementing or decrementing. */
  snapOnStep?: boolean;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}

export declare const NumberField: React.ComponentType<NumberFieldProps>;
