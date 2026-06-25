import * as React from "react";

/**
 * Collapsible — from @zenncore/web@0.0.0.
 */
export interface CollapsibleProps {
  /** Whether the collapsible panel is currently open. To render an uncontrolled collapsible, use the `defaultOpen` prop inste */
  open?: boolean;
  /** Whether the collapsible panel is initially open. To render a controlled collapsible, use the `open` prop instead. */
  defaultOpen?: boolean;
  children?: React.ReactNode;
  /** CSS class applied to the element, or a function that returns a class based on the component's state. */
  className?: string | ((state: CollapsibleRootState) => string | undefined);
  /** Style applied to the element, or a function that returns a style object based on the component's state. */
  style?:
    | CSSProperties
    | ((state: CollapsibleRootState) => React.CSSProperties | undefined);
  id?: string;
  /** Whether the component should ignore user interaction. */
  disabled?: boolean;
  /** Allows you to replace the component's HTML element with a different tag, or compose it with another component. Accepts a */
  render?:
    | ReactElement<unknown, string | JSXElementConstructor<any>>
    | ComponentRenderFn<HTMLProps, CollapsibleRootState>;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}

export declare const Collapsible: React.ComponentType<CollapsibleProps>;
