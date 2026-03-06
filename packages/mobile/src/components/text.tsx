import { cn } from "@zenncore/utils";
import type { ComponentPropsWithRef, JSX } from "react";
import { Text as TextPrimitive } from "react-native";

export const Text = ({ className, ...props }: Text.Props): JSX.Element => {
  return (
    <TextPrimitive className={cn("text-foreground", className)} {...props} />
  );
};
export namespace Text {
  export type Props = ComponentPropsWithRef<typeof TextPrimitive>;
}
