import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";
import type { ClassList } from "@zenncore/utils";
import type { ComponentProps, FC, JSX } from "react";
import { createClassName } from "../utils/helpers/class-name";

export const AlertDialog: FC<AlertDialog.Props> = AlertDialogPrimitive.Root;
export namespace AlertDialog {
  export type Props = ComponentProps<typeof AlertDialogPrimitive.Root>;
  export type Actions = AlertDialogPrimitive.Root.Actions;
  export type ChangeEventDetails = AlertDialogPrimitive.Root.ChangeEventDetails;
  export type ChangeEventReason = AlertDialogPrimitive.Root.ChangeEventReason;
}

export const AlertDialogBackdrop: FC<AlertDialogBackdrop.Props> =
  AlertDialogPrimitive.Backdrop;
export namespace AlertDialogBackdrop {
  export type Props = ComponentProps<typeof AlertDialogPrimitive.Backdrop>;
  export type State = AlertDialogPrimitive.Backdrop.State;
}

export const AlertDialogTrigger = ({
  className,
  ...props
}: AlertDialogTrigger.Props): JSX.Element => {
  return (
    <AlertDialogPrimitive.Trigger
      className={createClassName(
        "flex h-10 select-none items-center justify-center rounded-md border border-gray-200 bg-gray-50 px-3.5 font-medium text-base text-red-800 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-blue-800 focus-visible:-outline-offset-1 active:bg-gray-100",
        className,
      )}
      {...props}
    />
  );
};
export namespace AlertDialogTrigger {
  export type Props = ComponentProps<typeof AlertDialogPrimitive.Trigger>;
  export type State = AlertDialogPrimitive.Trigger.State;
}

export const AlertDialogPopup = ({
  container,
  keepMounted,
  className,
  classList,
  ...props
}: AlertDialogPopup.Props): JSX.Element => {
  return (
    <AlertDialogPrimitive.Portal
      container={container}
      keepMounted={keepMounted}
    >
      <AlertDialogPrimitive.Backdrop
        className={createClassName(
          "fixed inset-0 bg-black opacity-20 transition-all duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 dark:opacity-70",
          classList?.backdrop,
        )}
      />
      <AlertDialogPrimitive.Popup
        className={createClassName(
          "fixed top-1/2 left-1/2 -mt-8 w-96 max-w-[calc(100vw-3rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-gray-50 p-6 text-gray-900 outline-1 outline-gray-200 transition-all duration-150 data-ending-style:scale-90 data-starting-style:scale-90 data-ending-style:opacity-0 data-starting-style:opacity-0 dark:outline-gray-300",
          className,
          classList?.root,
        )}
        {...props}
      />
    </AlertDialogPrimitive.Portal>
  );
};
export namespace AlertDialogPopup {
  export type ClassListKey = "root" | "backdrop";
  export type Props = {
    classList?: ClassList<ClassListKey>;
  } & ComponentProps<typeof AlertDialogPrimitive.Popup> &
    ComponentProps<typeof AlertDialogPrimitive.Portal>;
  export type State = AlertDialogPrimitive.Popup.State;
}

export const AlertDialogTitle = ({
  className,
  ...props
}: AlertDialogTitle.Props): JSX.Element => {
  return (
    <AlertDialogPrimitive.Title
      className={createClassName("-mt-1.5 mb-1 font-medium text-lg", className)}
      {...props}
    />
  );
};
export namespace AlertDialogTitle {
  export type Props = ComponentProps<typeof AlertDialogPrimitive.Title>;
  export type State = AlertDialogPrimitive.Title.State;
}

export const AlertDialogDescription = ({
  className,
  ...props
}: AlertDialogDescription.Props): JSX.Element => {
  return (
    <AlertDialogPrimitive.Description
      className={createClassName(
        "mb-6 text-base text-foreground-dimmed",
        className,
      )}
      {...props}
    />
  );
};
export namespace AlertDialogDescription {
  export type Props = ComponentProps<typeof AlertDialogPrimitive.Description>;
  export type State = AlertDialogPrimitive.Description.State;
}

export const AlertDialogClose = ({
  className,
  ...props
}: AlertDialogClose.Props): JSX.Element => {
  return (
    <AlertDialogPrimitive.Close
      className={createClassName(
        "flex h-10 select-none items-center justify-center rounded-md border border-gray-200 bg-gray-50 px-3.5 font-medium text-base text-gray-900 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-blue-800 focus-visible:-outline-offset-1 active:bg-gray-100",
        className,
      )}
      {...props}
    />
  );
};
export namespace AlertDialogClose {
  export type Props = ComponentProps<typeof AlertDialogPrimitive.Close>;
  export type State = AlertDialogPrimitive.Close.State;
}
