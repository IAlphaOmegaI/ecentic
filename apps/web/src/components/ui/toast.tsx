"use client";
import { XIcon } from "@zenncore/icons";
import {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastTitle,
  ToastViewport,
  useToastManager,
} from "@zenncore/web/components/toast";

type ToastType = "success" | "error" | "info";

type ToastData = {
  actionLabel?: string;
  onAction?: () => void;
};

export namespace ToastList {
  export type Props = {
    types: ToastType[];
  };
}

export const ToastList = ({ types }: ToastList.Props) => {
  const { toasts } = useToastManager();

  return (
    <ToastViewport>
      {toasts
        .filter((toast) => types.includes(toast.type as ToastType))
        .map((toast) => {
          const { actionLabel, onAction } = toast as typeof toast & ToastData;

          return (
            <Toast
              key={toast.id}
              toast={toast}
              className="rounded-none p-4 pr-8"
            >
              <ToastTitle className="font-medium text-lg" />
              <ToastDescription className="mt-1" />
              {actionLabel && onAction && (
                <ToastAction
                  className="mt-3 font-medium text-primary text-sm underline-offset-2 hover:underline"
                  onClick={onAction}
                >
                  {actionLabel}
                </ToastAction>
              )}
              <ToastClose aria-label="Close">
                <XIcon className="size-4" />
              </ToastClose>
            </Toast>
          );
        })}
    </ToastViewport>
  );
};
