import * as React from "react";

/**
 * Tabs — from @zenncore/web@0.0.0.
 */
export interface TabsProps {
  children?: React.ReactNode;
  /** CSS class applied to the element, or a function that returns a class based on the component's state. */
  className?: string | ((state: TabsRootState) => string | undefined);
  /** The default value. Use when the component is not controlled. When the value is `null`, no Tab will be active. */
  defaultValue?: any;
  /** Style applied to the element, or a function that returns a style object based on the component's state. */
  style?:
    | CSSProperties
    | ((state: TabsRootState) => React.CSSProperties | undefined);
  id?: string;
  /** The value of the currently active `Tab`. Use when the component is controlled. When the value is `null`, no Tab will be  */
  value?: any;
  /** Allows you to replace the component's HTML element with a different tag, or compose it with another component. Accepts a */
  render?:
    | ReactElement<unknown, string | JSXElementConstructor<any>>
    | ComponentRenderFn<HTMLProps, TabsRootState>;
  /** The component orientation (layout flow direction). */
  orientation?: "horizontal" | "vertical";
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}

export declare const Tabs: React.ComponentType<TabsProps>;
