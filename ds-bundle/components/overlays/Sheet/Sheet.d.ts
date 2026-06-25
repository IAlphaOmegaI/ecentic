import * as React from "react";

/**
 * Sheet — from @zenncore/web@0.0.0.
 */
export interface SheetProps {
  /** Whether the dialog is currently open. */
  open?: boolean;
  /** Whether the dialog is initially open. To render a controlled dialog, use the `open` prop instead. */
  defaultOpen?: boolean;
  /** Determines if the dialog enters a modal state when open. - `true`: user interaction is limited to just the dialog: focus */
  modal?: boolean | "trap-focus";
  /** Whether to prevent the dialog from closing on outside presses. For non-modal dialogs, this also prevents the dialog from */
  disablePointerDismissal?: boolean;
  /** A ref to imperative actions. - `unmount`: Manually unmounts the dialog. Call this after any externally controlled closin */
  actionsRef?: RefObject<DialogRootActions>;
  /** A handle to associate the dialog with a trigger. If specified, allows external triggers to control the dialog's open sta */
  handle?: Dialog.Handle<Payload>;
  /** The content of the dialog. This can be a regular React node or a render function that receives the `payload` of the acti */
  children?: boolean | PayloadChildRenderFunction<Payload> | React.ReactNode;
  /** ID of the trigger that the dialog is associated with. This is useful in conjunction with the `open` prop to create a con */
  triggerId?: string;
  /** ID of the trigger that the dialog is associated with. This is useful in conjunction with the `defaultOpen` prop to creat */
  defaultTriggerId?: string;
}

export declare const Sheet: React.ComponentType<SheetProps>;
