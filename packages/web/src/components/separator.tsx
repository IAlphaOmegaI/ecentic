import { Separator as SeparatorPrimitive } from "@base-ui/react/separator";
import type { ComponentProps, JSX } from "react";
import { createClassName } from "../utils/helpers/class-name";

export const Separator = ({
  className,
  ...props
}: Separator.Props): JSX.Element => {
  return (
    <SeparatorPrimitive
      className={createClassName("shrink-0", className)}
      {...props}
    />
  );
};
export namespace Separator {
  export type Props = ComponentProps<typeof SeparatorPrimitive>;
  export type State = SeparatorPrimitive.State;
}
