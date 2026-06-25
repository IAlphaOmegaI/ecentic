import * as React from "react";

/**
 * AlertDialog — from @zenncore/web@0.0.0.
 */
export interface AlertDialogProps {
  /** A ref to imperative actions. - `unmount`: Manually unmounts the alert dialog. Call this after any externally controlled  */
  actionsRef?: RefObject<DialogRootActions>;
  /** A handle to associate the alert dialog with a trigger. If specified, allows external triggers to control the alert dialo */
  handle?: AlertDialog$1.Handle<unknown>;
  /** Whether the dialog is currently open. */
  open?: boolean;
  /** Whether the dialog is initially open. To render a controlled dialog, use the `open` prop instead. */
  defaultOpen?: boolean;
  /** The content of the dialog. This can be a regular React node or a render function that receives the `payload` of the acti */
  children?: boolean | PayloadChildRenderFunction<unknown> | React.ReactNode;
  /** ID of the trigger that the dialog is associated with. This is useful in conjunction with the `open` prop to create a con */
  triggerId?: string;
  /** ID of the trigger that the dialog is associated with. This is useful in conjunction with the `defaultOpen` prop to creat */
  defaultTriggerId?: string;
}

export declare const AlertDialog: React.ComponentType<AlertDialogProps>;
