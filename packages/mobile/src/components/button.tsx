import { cn } from "@zenncore/utils";
import { Button as ButtonPrimitive } from "heroui-native";
import type { ComponentProps, JSX } from "react";

export const Button = ({ className, ...props }: Button.Props): JSX.Element => {
  return (
    <ButtonPrimitive
      className={cn(
        // "flex-row justify-center rounded-2xl bg-primary py-32 transition-transform active:scale-95",
        // "bg-warning py-32",
        "bg-overlay",
        className,
      )}
      {...props}
    />
  );
};
export namespace Button {
  export type Props = ComponentProps<typeof ButtonPrimitive>;
}
