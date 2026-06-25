import * as React from "react";

/**
 * Popover — from @zenncore/web@0.0.0.
 */
export interface PopoverProps {
  /** Whether the popover is initially open. To render a controlled popover, use the `open` prop instead. */
  defaultOpen?: boolean;
  /** Whether the popover is currently open. */
  open?: boolean;
  /** A ref to imperative actions. - `unmount`: Manually unmounts the popover. Call this after any externally controlled closi */
  actionsRef?: RefObject<PopoverRootActions>;
  /** Determines if the popover enters a modal state when open. - `true`: user interaction is limited to the popover: document */
  modal?: boolean | "trap-focus";
  /** ID of the trigger that the popover is associated with. This is useful in conjunction with the `open` prop to create a co */
  triggerId?: string;
  /** ID of the trigger that the popover is associated with. This is useful in conjunction with the `defaultOpen` prop to crea */
  defaultTriggerId?: string;
  /** A handle to associate the popover with a trigger. If specified, allows external triggers to control the popover's open s */
  handle?: Popover$1.Handle<Payload>;
  /** The content of the popover. This can be a regular React node or a render function that receives the `payload` of the act */
  children?: boolean | PayloadChildRenderFunction<Payload> | React.ReactNode;
}

export declare const Popover: React.ComponentType<PopoverProps>;
