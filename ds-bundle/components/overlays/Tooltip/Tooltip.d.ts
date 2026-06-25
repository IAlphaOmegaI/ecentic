import * as React from "react";

/**
 * Tooltip — from @zenncore/web@0.0.0.
 */
export interface TooltipProps {
  /** Whether the tooltip is initially open. To render a controlled tooltip, use the `open` prop instead. */
  defaultOpen?: boolean;
  /** Whether the tooltip is currently open. */
  open?: boolean;
  /** Whether the tooltip contents can be hovered without closing the tooltip. */
  disableHoverablePopup?: boolean;
  /** Determines which axis the tooltip should track the cursor on. */
  trackCursorAxis?: "none" | "both" | "x" | "y";
  /** A ref to imperative actions. - `unmount`: Unmounts the tooltip popup. - `close`: Closes the tooltip imperatively when ca */
  actionsRef?: RefObject<TooltipRootActions>;
  /** Whether the tooltip is disabled. */
  disabled?: boolean;
  /** A handle to associate the tooltip with a trigger. If specified, allows external triggers to control the tooltip's open s */
  handle?: Tooltip$1.Handle<Payload>;
  /** The content of the tooltip. This can be a regular React node or a render function that receives the `payload` of the act */
  children?: boolean | PayloadChildRenderFunction<Payload> | React.ReactNode;
  /** ID of the trigger that the tooltip is associated with. This is useful in conjunction with the `open` prop to create a co */
  triggerId?: string;
  /** ID of the trigger that the tooltip is associated with. This is useful in conjunction with the `defaultOpen` prop to crea */
  defaultTriggerId?: string;
}

export declare const Tooltip: React.ComponentType<TooltipProps>;
