import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";
import type { ClassList } from "@zenncore/utils";
import type { ComponentProps, JSX } from "react";
import { createClassName } from "../utils/helpers/class-name";

export const Radio = ({
  className,
  classList,
  ...props
}: Radio.Props): JSX.Element => {
  return (
    <RadioPrimitive.Root
      className={createClassName(
        "flex size-5 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-blue-800 focus-visible:outline-offset-2 data-unchecked:border data-unchecked:border-gray-300 data-checked:bg-primary",
        className,
        classList?.root,
      )}
      {...props}
    >
      <RadioPrimitive.Indicator
        className={createClassName(
          "flex before:size-2 before:rounded-full before:bg-gray-50 data-unchecked:hidden",
          classList?.indicator,
        )}
      />
    </RadioPrimitive.Root>
  );
};
export namespace Radio {
  export type ClassListKey = "root" | "indicator";
  export type Props = {
    classList?: ClassList<ClassListKey>;
  } & ComponentProps<typeof RadioPrimitive.Root>;
  export type State = RadioPrimitive.Root.State;
}

export const RadioGroup = ({
  className,
  ...props
}: RadioGroup.Props): JSX.Element => {
  return (
    <RadioGroupPrimitive
      className={createClassName("space-y-2", className)}
      {...props}
    />
  );
};
export namespace RadioGroup {
  export type Props = ComponentProps<typeof RadioGroupPrimitive>;
  export type State = RadioGroupPrimitive.State;
  export type ChangeEventDetails = RadioGroupPrimitive.ChangeEventDetails;
  export type ChangeEventReason = RadioGroupPrimitive.ChangeEventReason;
}
