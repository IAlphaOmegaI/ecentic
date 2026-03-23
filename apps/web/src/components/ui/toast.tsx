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

const color: Record<ToastType, string> = {
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
      const dot = color[type] ?? color.info;

      return (
        <Toast key={toast.id} toast={toast} className="p-4">
          <div className="flex items-start gap-2 pt-2 pr-4">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="relative size-4">
                  <span
                    className={`size-full rounded-full ${dot} absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse`}
                  />
                  <span
                    className={`size-3 rounded-full ${dot} absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`}
                  />
                </div>
                <ToastTitle className="text-2xl leading-4" />
              </div>
              <ToastDescription className="pl-7 text-lg leading-4" />
            </div>
          </div>
          <ToastClose aria-label="Close">
            <XIcon className="size-4" />
          </ToastClose>
        </Toast>
      );
    });
};
