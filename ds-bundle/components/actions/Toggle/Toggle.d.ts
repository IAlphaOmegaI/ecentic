import * as React from "react";

/**
 * Toggle — from @zenncore/web@0.0.0.
 */
export interface ToggleProps {
  /** Whether the toggle button is currently pressed. This is the controlled counterpart of `defaultPressed`. */
  pressed?: boolean;
  /** Whether the toggle button is currently pressed. This is the uncontrolled counterpart of `pressed`. */
  defaultPressed?: boolean;
  /** Whether the component should ignore user interaction. */
  disabled?: boolean;
  /** A unique string that identifies the toggle when used inside a toggle group. */
  value?: string;
  /** Whether the component renders a native `<button>` element when replacing it via the `render` prop. Set to `false` if the */
  nativeButton?: boolean;
  children?: React.ReactNode;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  id?: string;
  /** CSS class applied to the element, or a function that returns a class based on the component's state. */
  className?: string | ((state: ToggleState) => string | undefined);
  /** Allows you to replace the component's HTML element with a different tag, or compose it with another component. Accepts a */
  render?:
    | ReactElement<unknown, string | JSXElementConstructor<any>>
    | ComponentRenderFn<HTMLProps, ToggleState>;
  /** Style applied to the element, or a function that returns a style object based on the component's state. */
  style?:
    | CSSProperties
    | ((state: ToggleState) => React.CSSProperties | undefined);
}

export declare const Toggle: React.ComponentType<ToggleProps>;
