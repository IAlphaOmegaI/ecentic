import * as React from "react";

/**
 * Toolbar — from @zenncore/web@0.0.0.
 */
export interface ToolbarProps {
  children?: React.ReactNode;
  /** CSS class applied to the element, or a function that returns a class based on the component's state. */
  className?: string | ((state: ToolbarRootState) => string | undefined);
  /** Style applied to the element, or a function that returns a style object based on the component's state. */
  style?:
    | CSSProperties
    | ((state: ToolbarRootState) => React.CSSProperties | undefined);
  id?: string;
  disabled?: boolean;
  /** If `true`, using keyboard navigation will wrap focus to the other end of the toolbar once the end is reached. */
  loopFocus?: boolean;
  /** Allows you to replace the component's HTML element with a different tag, or compose it with another component. Accepts a */
  render?:
    | ReactElement<unknown, string | JSXElementConstructor<any>>
    | ComponentRenderFn<HTMLProps, ToolbarRootState>;
  /** The orientation of the toolbar. */
  orientation?: "horizontal" | "vertical";
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}

export declare const Toolbar: React.ComponentType<ToolbarProps>;
