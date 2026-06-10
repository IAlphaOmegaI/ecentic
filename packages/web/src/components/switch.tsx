import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import type { ClassList } from "@zenncore/utils";
import type { ComponentProps, JSX } from "react";
import { createClassName } from "../utils/helpers/class-name";

export const Switch = ({
  className,
  classList,
  ...props
}: Switch.Props): JSX.Element => {
  return (
    <SwitchPrimitive.Root
      defaultChecked
      className={createClassName(
        "relative flex h-6 w-11 items-center rounded-full bg-accent-foreground p-0.5 transition-colors duration-150 ease-out before:absolute before:rounded-full before:outline-primary before:outline-offset-2 focus-visible:before:inset-0 focus-visible:before:outline-2 data-checked:bg-primary",
        className,
        classList?.root,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={createClassName(
          "size-5 rounded-full bg-background-rich shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-transform duration-150 ease-out data-checked:translate-x-5",
          classList?.thumb,
        )}
      />
    </SwitchPrimitive.Root>
  );
};

export namespace Switch {
  export type ClassListKey = "root" | "thumb";
  export type Props = {
    classList?: ClassList<ClassListKey>;
  } & ComponentProps<typeof SwitchPrimitive.Root>;
  export type State = SwitchPrimitive.Root.State;
  export type ChangeEventDetails = SwitchPrimitive.Root.ChangeEventDetails;
  export type ChangeEventReason = SwitchPrimitive.Root.ChangeEventReason;
}
