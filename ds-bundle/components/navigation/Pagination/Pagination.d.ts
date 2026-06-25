import * as React from "react";

/**
 * Pagination — from @zenncore/web@0.0.0.
 */
export interface PaginationProps {
  children?: React.ReactNode;
  style?: CSSProperties;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  id?: string;
  /** Allows you to replace the component's HTML element with a different tag, or compose it with another component. Accepts a */
  render?:
    | ReactElement<unknown, string | JSXElementConstructor<any>>
    | ComponentRenderFn<HTMLProps<any>, EmptyObject>;
  className?: string;
}

export declare const Pagination: React.ComponentType<PaginationProps>;
