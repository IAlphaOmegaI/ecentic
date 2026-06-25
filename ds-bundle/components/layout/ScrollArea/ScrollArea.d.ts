import * as React from "react";

/**
 * ScrollArea — from @zenncore/web@0.0.0.
 */
export interface ScrollAreaProps {
  classList?: {
    root?: string;
    viewport?: string;
    scrollBar?: { root?: string; thumb?: string };
  };
  children?: React.ReactNode;
  /** CSS class applied to the element, or a function that returns a class based on the component's state. */
  className?: string | ((state: ScrollAreaRootState) => string | undefined);
  /** Style applied to the element, or a function that returns a style object based on the component's state. */
  style?:
    | CSSProperties
    | ((state: ScrollAreaRootState) => React.CSSProperties | undefined);
  id?: string;
  /** Allows you to replace the component's HTML element with a different tag, or compose it with another component. Accepts a */
  render?:
    | ReactElement<unknown, string | JSXElementConstructor<any>>
    | ComponentRenderFn<HTMLProps, ScrollAreaRootState>;
  /** The threshold in pixels that must be passed before the overflow edge attributes are applied. Accepts a single number for */
  overflowEdgeThreshold?:
    | number
    | Partial<{ xStart: number; xEnd: number; yStart: number; yEnd: number }>;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}

export declare const ScrollArea: React.ComponentType<ScrollAreaProps>;
