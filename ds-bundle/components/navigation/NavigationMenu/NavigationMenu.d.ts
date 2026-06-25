import * as React from "react";

/**
 * NavigationMenu — from @zenncore/web@0.0.0.
 */
export interface NavigationMenuProps {
  /** A ref to imperative actions. */
  actionsRef?: RefObject<NavigationMenuRootActions>;
  /** The controlled value of the navigation menu item that should be currently open. When non-nullish, the menu will be open. */
  value?: unknown;
  /** The uncontrolled value of the item that should be initially selected. To render a controlled navigation menu, use the `v */
  defaultValue?: unknown;
  /** How long to wait before opening the navigation popup. Specified in milliseconds. */
  delay?: number;
  /** How long to wait before closing the navigation popup. Specified in milliseconds. */
  closeDelay?: number;
  /** The orientation of the navigation menu. */
  orientation?: "horizontal" | "vertical";
  children?: React.ReactNode;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  id?: string;
  /** CSS class applied to the element, or a function that returns a class based on the component's state. */
  className?: string | ((state: NavigationMenuRootState) => string | undefined);
  /** Allows you to replace the component's HTML element with a different tag, or compose it with another component. Accepts a */
  render?:
    | ReactElement<unknown, string | JSXElementConstructor<any>>
    | ComponentRenderFn<HTMLProps, NavigationMenuRootState>;
  /** Style applied to the element, or a function that returns a style object based on the component's state. */
  style?:
    | CSSProperties
    | ((state: NavigationMenuRootState) => React.CSSProperties | undefined);
}

export declare const NavigationMenu: React.ComponentType<NavigationMenuProps>;
