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
      //   const Icon = ((): React.JSX.Element => {
      //     switch (toast.type as ToastType) {
      //       case "info":
      //         return null;
      //       default:
      //         return null;
      //     }
      //   })();

      return (
        <Toast key={toast.id} toast={toast}>
          <div className="flex items-center gap-1">
            {/* {Icon && <Icon />} */}
            <ToastTitle />
          </div>
          <ToastDescription />
          <ToastClose aria-label="Close">
            <XIcon className="size-4" />
          </ToastClose>
        </Toast>
      );
    });
};
