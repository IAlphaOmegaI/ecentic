import { Toast as ToastPrimitive } from "@base-ui/react/toast";
import type { ComponentProps, CSSProperties, JSX } from "react";
import { createClassName } from "../utils/helpers/class-name";

export const ToastProvider: typeof ToastPrimitive.Provider =
  ToastPrimitive.Provider;
export namespace ToastProvider {
  export type Props = ComponentProps<typeof ToastPrimitive.Provider>;
}

export const ToastViewport = ({
  container,
  className,
  ...props
}: ToastViewport.Props): JSX.Element => {
  return (
    <ToastPrimitive.Portal container={container}>
      <ToastPrimitive.Viewport
        className={createClassName(
          "fixed top-auto right-[1rem] bottom-[1rem] mx-auto flex w-[250px] sm:right-[2rem] sm:bottom-[2rem] sm:w-[300px]",
          className,
        )}
        {...props}
      />
    </ToastPrimitive.Portal>
  );
};
export namespace ToastViewport {
  export type Props = ComponentProps<typeof ToastPrimitive.Viewport> &
    ComponentProps<typeof ToastPrimitive.Portal>;
  export type State = ToastPrimitive.Viewport.State;
}

export const Toast = ({
  className,
  style,
  ...props
}: Toast.Props): JSX.Element => {
  return (
    <ToastPrimitive.Root
      className={createClassName(
        "absolute right-0 bottom-0 left-auto z-[calc(1000-var(--toast-index))] mr-0 w-full select-none rounded-lg border border-gray-200 bg-gray-50 bg-clip-padding p-4 shadow-lg transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] [transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)+calc(var(--toast-index)*-15px)))_scale(calc(1-(var(--toast-index)*0.1)))] [transition-property:opacity,transform] after:absolute after:bottom-full after:left-0 after:h-[calc(var(--gap)+1px)] after:w-full after:content-[''] data-ending-style:opacity-0 data-limited:opacity-0 data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))] data-ending-style:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))] data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))] data-ending-style:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))] data-expanded:[transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-offset-y)*-1+calc(var(--toast-index)*var(--gap)*-1)+var(--toast-swipe-movement-y)))] data-expanded:data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))] data-expanded:data-ending-style:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))] data-expanded:data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))] data-expanded:data-ending-style:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))] data-starting-style:[transform:translateY(150%)] data-ending-style:[&:not([data-limited])]:[transform:translateY(150%)]",
        className,
      )}
      style={{
        ...({
          "--gap": "1rem",
          "--offset-y":
            "calc(var(--toast-offset-y) * -1 + (var(--toast-index) * var(--gap) * -1) + var(--toast-swipe-movement-y))",
        } as CSSProperties),
        ...style,
      }}
      {...props}
    />
  );
};
export namespace Toast {
  export type Props = ComponentProps<typeof ToastPrimitive.Root>;
  export type State = ToastPrimitive.Root.State;
  export type ToastObject = ToastPrimitive.Root.ToastObject;
}

export const ToastTitle = ({
  className,
  ...props
}: ToastTitle.Props): JSX.Element => {
  return (
    <ToastPrimitive.Title
      className={createClassName(
        "font-medium text-[0.975rem] leading-5",
        className,
      )}
      {...props}
    />
  );
};
export namespace ToastTitle {
  export type Props = ComponentProps<typeof ToastPrimitive.Title>;
  export type State = ToastPrimitive.Title.State;
}

export const ToastDescription = ({
  className,
  ...props
}: ToastDescription.Props): JSX.Element => {
  return (
    <ToastPrimitive.Description
      className={createClassName(
        "text-[0.925rem] text-gray-700 leading-5",
        className,
      )}
      {...props}
    />
  );
};
export namespace ToastDescription {
  export type Props = ComponentProps<typeof ToastPrimitive.Description>;
  export type State = ToastPrimitive.Description.State;
}

export const ToastAction: typeof ToastPrimitive.Action = ToastPrimitive.Action;
export namespace ToastAction {
  export type Props = ComponentProps<typeof ToastPrimitive.Action>;
  export type State = ToastPrimitive.Action.State;
}

export const ToastClose = ({
  className,
  ...props
}: ToastClose.Props): JSX.Element => {
  return (
    <ToastPrimitive.Close
      className={createClassName(
        "absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded border-none bg-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-700",
        className,
      )}
      {...props}
    />
  );
};
export namespace ToastClose {
  export type Props = ComponentProps<typeof ToastPrimitive.Close>;
  export type State = ToastPrimitive.Close.State;
}

export const useToastManager: typeof ToastPrimitive.useToastManager =
  ToastPrimitive.useToastManager;
export const createToastManager: typeof ToastPrimitive.createToastManager =
  ToastPrimitive.createToastManager;
