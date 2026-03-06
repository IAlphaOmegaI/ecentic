import { Fieldset as FieldsetPrimitive } from "@base-ui/react/fieldset";
import type { ComponentProps, JSX } from "react";
import { createClassName } from "../utils/helpers/class-name";

export const Fieldset = ({
  className,
  ...props
}: Fieldset.Props): JSX.Element => {
  return (
    <FieldsetPrimitive.Root
      className={createClassName("space-y-2", className)}
      {...props}
    />
  );
};
export namespace Fieldset {
  export type Props = ComponentProps<typeof FieldsetPrimitive.Root>;
  export type State = FieldsetPrimitive.Root.State;
}

export const FieldsetLegend = ({
  className,
  ...props
}: FieldsetLegend.Props): JSX.Element => {
  return (
    <FieldsetPrimitive.Legend
      className={createClassName(
        "border-gray-200 border-b pb-3 font-medium text-gray-900 text-lg",
        className,
      )}
      {...props}
    />
  );
};
export namespace FieldsetLegend {
  export type Props = ComponentProps<typeof FieldsetPrimitive.Legend>;
  export type State = FieldsetPrimitive.Legend.State;
}
