import * as React from "react";

/**
 * Accordion — from @zenncore/web@0.0.0.
 */
export interface AccordionProps {
  /** The controlled value of the item(s) that should be expanded. To render an uncontrolled accordion, use the `defaultValue` */
  value?: AccordionValue<unknown>;
  /** The uncontrolled value of the item(s) that should be initially expanded. To render a controlled accordion, use the `valu */
  defaultValue?: AccordionValue<unknown>;
  /** Whether the component should ignore user interaction. */
  disabled?: boolean;
  /** Allows the browser's built-in page search to find and expand the panel contents. Overrides the `keepMounted` prop and us */
  hiddenUntilFound?: boolean;
  /** Whether to keep the element in the DOM while the panel is closed. This prop is ignored when `hiddenUntilFound` is used. */
  keepMounted?: boolean;
  /** Deprecated following the [APG guidance update](https://github.com/w3c/aria-practices/pull/3434) to remove roving focus.  */
  loopFocus?: boolean;
  /** Whether multiple items can be open at the same time. */
  multiple?: boolean;
  /** Deprecated following the [APG guidance update](https://github.com/w3c/aria-practices/pull/3434) to remove roving focus.  */
  orientation?: "horizontal" | "vertical";
  children?: React.ReactNode;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  id?: string;
  /** CSS class applied to the element, or a function that returns a class based on the component's state. */
  className?:
    | string
    | ((state: Accordion$1.Root.State<unknown>) => string | undefined);
  /** Allows you to replace the component's HTML element with a different tag, or compose it with another component. Accepts a */
  render?:
    | ReactElement<unknown, string | JSXElementConstructor<any>>
    | ComponentRenderFn<HTMLProps, Accordion$1.Root.State<unknown>>;
  /** Style applied to the element, or a function that returns a style object based on the component's state. */
  style?:
    | CSSProperties
    | ((
        state: Accordion$1.Root.State<unknown>,
      ) => React.CSSProperties | undefined);
}

export declare const Accordion: React.ComponentType<AccordionProps>;
