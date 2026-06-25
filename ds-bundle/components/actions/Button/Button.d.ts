import * as React from "react";

/**
 * Button — from @zenncore/web@0.0.0.
 * @replaces button
 */
export interface ButtonProps {
  /** Allows you to replace the component's HTML element with a different tag, or compose it with another component. Accepts a */
  render?:
    | ReactElement<unknown, string | JSXElementConstructor<any>>
    | ComponentRenderFn<
        Omit<ButtonProps, "ref"> & RefAttributes<HTMLElement>,
        { disabled: boolean }
      >;
  children?: React.ReactNode;
  /** Style applied to the element, or a function that returns a style object based on the component's state. */
  style?:
    | CSSProperties
    | ((state: ButtonState) => React.CSSProperties | undefined);
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  id?: string;
  /** Whether the button should be focusable when disabled. */
  focusableWhenDisabled?: boolean;
  /** Whether the component renders a native `<button>` element when replacing it via the `render` prop. Set to `false` if the */
  nativeButton?: boolean;
  className?: string | ((state: { disabled: boolean }) => string);
  variant?: "flat" | "default" | "soft" | "outline" | "ghost";
  size?: "icon";
}

export declare const Button: React.ComponentType<ButtonProps>;
