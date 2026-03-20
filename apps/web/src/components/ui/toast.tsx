"use client";
import { XIcon } from "@zenncore/icons";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastTitle,
  useToastManager,
} from "@zenncore/web/components/toast";

type ToastType = "success" | "error" | "info";

const dotColor: Record<ToastType, string> = {
  success: "bg-primary",
  error: "bg-error",
  info: "bg-foreground-dimmed",
};

export namespace ToastList {
  export type Props = {
    types: ToastType[];
  };
}

export const ToastList = ({ types }: ToastList.Props) => {
  const { toasts } = useToastManager();

  return toasts
    .filter((t) => types.includes(t.type as ToastType))
    .map((toast) => {
      const type = (toast.type as ToastType) ?? "info";
      const dot = dotColor[type] ?? dotColor.info;

      return (
        <Toast key={toast.id} toast={toast} className="p-2.5">
          <div className="flex items-start gap-2 pr-4">
            <span
              className={`mt-[4px] size-1.5 shrink-0 rounded-full ${dot}`}
            />
            <div className="min-w-0 flex-1">
              <ToastTitle className="text-xs leading-4" />
              <ToastDescription className="mt-0 text-xs leading-4" />
            </div>
          </div>
          <ToastClose aria-label="Close">
            <XIcon className="size-3" />
          </ToastClose>
        </Toast>
      );
    });
};
