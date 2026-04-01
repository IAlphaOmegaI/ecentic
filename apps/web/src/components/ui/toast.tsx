"use client";
import { XIcon } from "@zenncore/icons";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastTitle,
  ToastViewport,
  useToastManager,
} from "@zenncore/web/components/toast";

type ToastType = "success" | "error" | "info";

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
        .map((toast) => (
          <Toast key={toast.id} toast={toast} className="rounded-none p-4 pr-8">
            <ToastTitle className="font-medium text-sm" />
            <ToastDescription className="mt-0.5 text-xs" />
            <ToastClose aria-label="Close">
              <XIcon className="size-3.5" />
            </ToastClose>
          </Toast>
        ))}
    </ToastViewport>
  );
};
