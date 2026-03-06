import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import type { ComponentProps, JSX } from "react";
import { createClassName } from "../utils/helpers/class-name";

export const Toggle = ({ className, ...props }: Toggle.Props): JSX.Element => {
  return (
    <TogglePrimitive
      className={createClassName(
        "flex size-8 select-none items-center justify-center rounded-sm hover:bg-gray-100 focus-visible:bg-none focus-visible:outline-2 focus-visible:outline-blue-800 focus-visible:-outline-offset-1 active:bg-gray-200 data-pressed:bg-red-500",
        className,
      )}
      {...props}
    />
  );
};
export namespace Toggle {
  export type Props = ComponentProps<typeof TogglePrimitive>;
  export type State = TogglePrimitive.State;
  export type ChangeEventDetails = TogglePrimitive.ChangeEventDetails;
  export type ChangeEventReason = TogglePrimitive.ChangeEventReason;
}

export const ToggleGroup = ({
  className,
  ...props
}: ToggleGroup.Props): JSX.Element => {
  return (
    <ToggleGroupPrimitive
      className={createClassName(
        "flex rounded-md border border-gray-200 bg-gray-50 p-0.5",
        className,
      )}
      {...props}
    />
  );
};
export namespace ToggleGroup {
  export type Props = ComponentProps<typeof ToggleGroupPrimitive>;
  export type State = ToggleGroupPrimitive.State;
  export type ChangeEventDetails = ToggleGroupPrimitive.ChangeEventDetails;
  export type ChangeEventReason = ToggleGroupPrimitive.ChangeEventReason;
}
