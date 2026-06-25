import * as React from "react";

/**
 * PreviewCard — from @zenncore/web@0.0.0.
 */
export interface PreviewCardProps {
  /** Whether the preview card is initially open. To render a controlled preview card, use the `open` prop instead. */
  defaultOpen?: boolean;
  /** Whether the preview card is currently open. */
  open?: boolean;
  /** A ref to imperative actions. - `unmount`: Unmounts the preview card popup. - `close`: Closes the preview card imperative */
  actionsRef?: RefObject<PreviewCardRootActions>;
  /** A handle to associate the preview card with a trigger. If specified, allows external triggers to control the card's open */
  handle?: PreviewCard$1.Handle<Payload>;
  /** The content of the preview card. This can be a regular React node or a render function that receives the `payload` of th */
  children?: boolean | PayloadChildRenderFunction<Payload> | React.ReactNode;
  /** ID of the trigger that the preview card is associated with. This is useful in conjunction with the `open` prop to create */
  triggerId?: string;
  /** ID of the trigger that the preview card is associated with. This is useful in conjunction with the `defaultOpen` prop to */
  defaultTriggerId?: string;
}

export declare const PreviewCard: React.ComponentType<PreviewCardProps>;
