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
        "relative flex h-6 w-14 bg-background-dimmed p-px shadow-[inset_0_1.5px_2px] shadow-accent-foreground outline-1 outline-accent-foreground -outline-offset-1 transition-[box-shadow,background] duration-125 ease-[cubic-bezier(0.26,0.75,0.38,0.45)] before:absolute before:outline-primary before:outline-offset-2 focus-visible:before:inset-0 focus-visible:before:outline-2 active:bg-background-dimmed data-checked:bg-primary data-checked:active:bg-primary-rich",
        className,
        classList?.root,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={createClassName(
          "h-full w-8 bg-background-rich shadow-[0_0_1px_1px,0_1px_1px,1px_2px_4px_-1px] shadow-accent-foreground transition-transform duration-150 data-checked:translate-x-6",
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
