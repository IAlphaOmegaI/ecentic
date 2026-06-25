import * as React from "react";

/**
 * Form — from @zenncore/web@0.0.0.
 * @replaces form
 */
export interface FormProps {
  form: UseFormReturn<T>;
  /** Determines when the form should be validated. The `validationMode` prop on `<Field.Root>` takes precedence over this. -  */
  validationMode?: "onBlur" | "onChange" | "onSubmit";
  /** Validation errors returned externally, typically after submission by a server or a form action. This should be an object */
  errors?: Errors;
  /** A ref to imperative actions. - `validate`: Validates all fields when called. Optionally pass a field name to validate a  */
  actionsRef?: RefObject<FormActions>;
  children?: React.ReactNode;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  id?: string;
  /** CSS class applied to the element, or a function that returns a class based on the component's state. */
  className?: string | ((state: FormState) => string | undefined);
  /** Allows you to replace the component's HTML element with a different tag, or compose it with another component. Accepts a */
  render?:
    | ReactElement<unknown, string | JSXElementConstructor<any>>
    | ComponentRenderFn<HTMLProps, FormState>;
  /** Style applied to the element, or a function that returns a style object based on the component's state. */
  style?:
    | CSSProperties
    | ((state: FormState) => React.CSSProperties | undefined);
}

export declare const Form: React.ComponentType<FormProps>;
