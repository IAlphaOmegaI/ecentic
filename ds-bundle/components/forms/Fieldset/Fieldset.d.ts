import * as React from "react";

/**
 * Fieldset — from @zenncore/web@0.0.0.
 */
export interface FieldsetProps {
  children?: React.ReactNode;
  /** CSS class applied to the element, or a function that returns a class based on the component's state. */
  className?: string | ((state: FieldsetRootState) => string | undefined);
  /** Style applied to the element, or a function that returns a style object based on the component's state. */
  style?:
    | CSSProperties
    | ((state: FieldsetRootState) => React.CSSProperties | undefined);
  id?: string;
  /** Allows you to replace the component's HTML element with a different tag, or compose it with another component. Accepts a */
  render?:
    | ReactElement<unknown, string | JSXElementConstructor<any>>
    | ComponentRenderFn<HTMLProps, FieldsetRootState>;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}

export declare const Fieldset: React.ComponentType<FieldsetProps>;
