import { NumberField as NumberFieldPrimitive } from "@base-ui/react/number-field";
import { MinusIcon, PlusIcon } from "@zenncore/icons";
import type { ClassList } from "@zenncore/utils";
import type { ComponentProps, JSX } from "react";
import { createClassName } from "../utils/helpers/class-name";

export const NumberField = ({
  className,
  ...props
}: NumberField.Props): JSX.Element => {
  return (
    <NumberFieldPrimitive.Root
      className={createClassName("flex items-start gap-1", className)}
      {...props}
    />
  );
};
export namespace NumberField {
  export type Props = ComponentProps<typeof NumberFieldPrimitive.Root>;
  export type State = NumberFieldPrimitive.Root.State;
  export type ChangeEventDetails = NumberFieldPrimitive.Root.ChangeEventDetails;
  export type ChangeEventReason = NumberFieldPrimitive.Root.ChangeEventReason;
  export type CommitEventDetails = NumberFieldPrimitive.Root.CommitEventDetails;
  export type CommitEventReason = NumberFieldPrimitive.Root.CommitEventReason;
}

export const NumberFieldScrubArea = ({
  children,
  className,
  classList,
  ...props
}: NumberFieldScrubArea.Props): JSX.Element => {
  return (
    <NumberFieldPrimitive.ScrubArea
      className={createClassName(
        "flex h-10 w-24 select-none items-center justify-center rounded-md border border-gray-200 bg-gray-50 bg-clip-padding text-gray-900 hover:bg-gray-100 active:bg-gray-100",
        className,
        classList?.root,
      )}
      {...props}
    >
      {children}
      <NumberFieldPrimitive.ScrubAreaCursor
        className={createClassName(
          "drop-shadow-[0_1px_1px_#0008] filter",
          classList?.cursor,
        )}
      >
        <CursorGrowIcon />
      </NumberFieldPrimitive.ScrubAreaCursor>
    </NumberFieldPrimitive.ScrubArea>
  );
};
export namespace NumberFieldScrubArea {
  export type ClassListKey = "root" | "cursor";
  export type Props = {
    classList?: ClassList<ClassListKey>;
  } & ComponentProps<typeof NumberFieldPrimitive.ScrubArea>;
  export type State = NumberFieldPrimitive.ScrubArea.State;
}

const CursorGrowIcon = (props: ComponentProps<"svg">) => {
  return (
    <svg
      width="26"
      height="14"
      viewBox="0 0 24 14"
      fill="black"
      stroke="white"
      {...props}
    >
      <path d="M19.5 5.5L6.49737 5.51844V2L1 6.9999L6.5 12L6.49737 8.5L19.5 8.5V12L25 6.9999L19.5 2V5.5Z" />
    </svg>
  );
};

export const NumberFieldGroup = ({
  className,
  ...props
}: NumberFieldGroup.Props): JSX.Element => {
  return (
    <NumberFieldPrimitive.Group
      className={createClassName("flex", className)}
      {...props}
    />
  );
};
export namespace NumberFieldGroup {
  export type Props = ComponentProps<typeof NumberFieldPrimitive.Group>;
  export type State = NumberFieldPrimitive.Group.State;
}

export const NumberFieldInput = ({
  className,
  ...props
}: NumberFieldInput.Props): JSX.Element => {
  return (
    <NumberFieldPrimitive.Input
      className={createClassName(
        "h-10 w-24 border-gray-200 border-t border-b text-center text-base text-gray-900 tabular-nums focus:z-1 focus:outline-2 focus:outline-blue-800 focus:-outline-offset-1",
        className,
      )}
      {...props}
    />
  );
};
export namespace NumberFieldInput {
  export type Props = ComponentProps<typeof NumberFieldPrimitive.Input>;
  export type State = NumberFieldPrimitive.Input.State;
}

export const NumberFieldDecrement = ({
  children,
  className,
  classList,
  ...props
}: NumberFieldDecrement.Props): JSX.Element => {
  return (
    <NumberFieldPrimitive.Decrement
      className={createClassName(
        "flex select-none items-center justify-center rounded-tl-md rounded-bl-md border border-gray-200 bg-gray-50 bg-clip-padding text-gray-900 hover:bg-gray-100 active:bg-gray-100",
        className,
        classList?.root,
      )}
      {...props}
    >
      {children ?? <MinusIcon className={classList?.icon} />}
    </NumberFieldPrimitive.Decrement>
  );
};
export namespace NumberFieldDecrement {
  export type ClassListKey = "root" | "icon";
  export type Props = {
    classList?: ClassList<ClassListKey>;
  } & ComponentProps<typeof NumberFieldPrimitive.Decrement>;
  export type State = NumberFieldPrimitive.Decrement.State;
}

export const NumberFieldIncrement = ({
  children,
  className,
  classList,
  ...props
}: NumberFieldIncrement.Props): JSX.Element => {
  return (
    <NumberFieldPrimitive.Increment
      className={createClassName(
        "flex select-none items-center justify-center rounded-tr-md rounded-br-md border border-gray-200 bg-gray-50 bg-clip-padding text-gray-900 hover:bg-gray-100 active:bg-gray-100",
        className,
        classList?.root,
      )}
      {...props}
    >
      {children ?? <PlusIcon className={classList?.icon} />}
    </NumberFieldPrimitive.Increment>
  );
};
export namespace NumberFieldIncrement {
  export type ClassListKey = "root" | "icon";
  export type Props = {
    classList?: ClassList<ClassListKey>;
  } & ComponentProps<typeof NumberFieldPrimitive.Increment>;
  export type State = NumberFieldPrimitive.Increment.State;
}
