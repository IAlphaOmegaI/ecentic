import { cn } from "@zenncore/utils";
import type { ComponentPropsWithRef, JSX } from "react";
import { TextInput as InputPrimitive } from "react-native";

export const Input = ({ className, ...props }: Input.Props): JSX.Element => {
  return (
    <InputPrimitive
      className={cn(
        "text-foreground placeholder:text-foreground-dimmed",
        className,
      )}
      {...props}
    />
  );
};
export namespace Input {
  export type Props = ComponentPropsWithRef<typeof InputPrimitive>;
}
