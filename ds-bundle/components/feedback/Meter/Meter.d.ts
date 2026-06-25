import * as React from "react";

/**
 * Meter — from @zenncore/web@0.0.0.
 */
export interface MeterProps {
  classList?: { root?: string; track?: string; indicator?: string };
  children?: React.ReactNode;
  /** CSS class applied to the element, or a function that returns a class based on the component's state. */
  className?: string | ((state: MeterRootState) => string | undefined);
  /** Style applied to the element, or a function that returns a style object based on the component's state. */
  style?:
    | CSSProperties
    | ((state: MeterRootState) => React.CSSProperties | undefined);
  id?: string;
  /** The locale used by `Intl.NumberFormat` when formatting the value. Defaults to the user's runtime locale. */
  locale?: string | Intl.Locale | readonly (string | Intl.Locale)[];
  /** The current value. */
  value: number;
  /** Allows you to replace the component's HTML element with a different tag, or compose it with another component. Accepts a */
  render?:
    | ReactElement<unknown, string | JSXElementConstructor<any>>
    | ComponentRenderFn<HTMLProps, MeterRootState>;
  /** The maximum value */
  max?: number;
  /** The minimum value */
  min?: number;
  /** Options to format the value. */
  format?: Intl.NumberFormatOptions;
  /** A function that returns a string value that provides a human-readable text alternative for `aria-valuenow`, the current  */
  getAriaValueText?: (formattedValue: string, value: number) => string;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}

export declare const Meter: React.ComponentType<MeterProps>;
