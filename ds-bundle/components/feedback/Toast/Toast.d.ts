import * as React from "react";

/**
 * Toast — from @zenncore/web@0.0.0.
 */
export interface ToastProps {
  children?: React.ReactNode;
  /** CSS class applied to the element, or a function that returns a class based on the component's state. */
  className?: string | ((state: ToastRootState) => string | undefined);
  /** Style applied to the element, or a function that returns a style object based on the component's state. */
  style?:
    | CSSProperties
    | ((state: ToastRootState) => React.CSSProperties | undefined);
  id?: string;
  /** Allows you to replace the component's HTML element with a different tag, or compose it with another component. Accepts a */
  render?:
    | ReactElement<unknown, string | JSXElementConstructor<any>>
    | ComponentRenderFn<HTMLProps, ToastRootState>;
  /** The toast to render. */
  toast: ToastRootToastObject<any>;
  /** Direction(s) in which the toast can be swiped to dismiss. */
  swipeDirection?:
    | "left"
    | "right"
    | "up"
    | "down"
    | ("left" | "right" | "up" | "down")[];
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}

export declare const Toast: React.ComponentType<ToastProps>;
