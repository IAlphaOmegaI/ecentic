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
          "fixed inset-x-4 top-[max(1rem,env(safe-area-inset-top))] z-[100] mx-auto w-auto max-w-[420px] sm:top-6",
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
      swipeDirection={["up", "right", "left"]}
      className={createClassName(
        "absolute inset-x-0 top-0 z-[calc(1000-var(--toast-index))] w-full origin-top select-none rounded-xl border border-accent-foreground bg-background bg-clip-padding p-4 shadow-lg duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] [transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)+var(--toast-index)*12px))_scale(calc(1-var(--toast-index)*0.04))] [transition-property:opacity,transform] after:absolute after:top-full after:left-0 after:h-[calc(var(--gap)+1px)] after:w-full after:content-[''] data-limited:pointer-events-none data-ending-style:opacity-0 data-limited:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none data-ending-style:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))] data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))] data-ending-style:[transform:translateY(calc(-100%_-_2rem))] data-expanded:[transform:translateX(var(--toast-swipe-movement-x))_translateY(var(--offset-y))] data-starting-style:[transform:translateY(calc(-100%_-_2rem))]",
        className,
      )}
      style={{
        ...({
          "--gap": "1rem",
          "--offset-y":
            "calc(var(--toast-offset-y) + (var(--toast-index) * var(--gap)) + var(--toast-swipe-movement-y))",
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
        // Explicit color: the title used to inherit from the portal container,
        // which rendered it near-invisible against the toast's background.
        "font-medium text-foreground-rich leading-5",
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
      className={createClassName("text-foreground-dimmed leading-5", className)}
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
        "absolute top-2 right-2 flex h-5 w-5 items-center justify-center border-none bg-transparent text-foreground-dimmed hover:bg-background-dimmed",
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
