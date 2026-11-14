"use client";
import {
  BellIcon,
  CheckCircleIcon,
  LoaderIcon,
  XCircleIcon,
  XIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastTitle,
  ToastViewport,
  useToastManager,
} from "@zenncore/web/components/toast";
import { useTranslations } from "next-intl";

type ToastType = "success" | "error" | "info" | "loading";

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
  const dismiss = useTranslations("general.dismiss");
  const notifications = useTranslations("general.notifications");

  return (
    <ToastViewport aria-label={notifications("label")}>
      {toasts
        .filter((toast) => types.includes(toast.type as ToastType))
        .map((toast) => {
          const { actionLabel, onAction } = toast as typeof toast & ToastData;

          return (
            <Toast
              key={toast.id}
              toast={toast}
              className={cn(
                "border-background-rich/20 border-l-4 bg-emphasis p-4 pr-12 text-background-rich shadow-2xl shadow-emphasis/30",
                toast.type === "error"
                  ? "border-l-error-foreground"
                  : toast.type === "success"
                    ? "border-l-success-rich"
                    : "border-l-primary-rich",
              )}
            >
              <div className="flex items-start gap-4">
                <span aria-hidden="true" className="mt-0.5 shrink-0">
                  <ToastStatus type={toast.type} />
                </span>
                <div className="min-w-0 flex-1">
                  <ToastTitle className="font-semibold text-background-rich text-base leading-6 [overflow-wrap:anywhere]" />
                  <ToastDescription className="mt-1 text-background-rich/80 text-sm leading-6 [overflow-wrap:anywhere]" />
                  {actionLabel && onAction && (
                    <div className="mt-3">
                      <ToastAction
                        render={<Button color="accent" />}
                        onClick={onAction}
                      >
                        {actionLabel}
                      </ToastAction>
                    </div>
                  )}
                </div>
              </div>
              <ToastClose
                aria-label={dismiss("label")}
                className="top-3 right-3 size-8 rounded-sm text-background-rich/70 hover:bg-background-rich/10 hover:text-background-rich focus-visible:outline-2 focus-visible:outline-primary-rich focus-visible:outline-offset-2"
              >
                <XIcon className="size-4" />
              </ToastClose>
            </Toast>
          );
        })}
    </ToastViewport>
  );
};

const ToastStatus = ({ type }: { type: string | undefined }) => {
  switch (type) {
    case "success":
      return <CheckCircleIcon className="size-6 text-success-rich" />;
    case "error":
      return <XCircleIcon className="size-6 text-error-foreground" />;
    case "loading":
      return (
        <LoaderIcon className="size-6 animate-spin text-primary-rich motion-reduce:animate-none" />
      );
    default:
      return <BellIcon className="size-6 text-primary-rich" />;
  }
};
