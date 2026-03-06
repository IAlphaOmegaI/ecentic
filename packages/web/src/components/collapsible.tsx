import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible";
import type { ComponentProps, JSX } from "react";
import { createClassName } from "../utils/helpers/class-name";

export const Collapsible = ({
  className,
  ...props
}: Collapsible.Props): JSX.Element => {
  return (
    <CollapsiblePrimitive.Root
      className={createClassName(
        "flex w-56 flex-col justify-center",
        className,
      )}
      {...props}
    />
  );
};
export namespace Collapsible {
  export type Props = ComponentProps<typeof CollapsiblePrimitive.Root>;
  export type State = CollapsiblePrimitive.Root.State;
  export type ChangeEventDetails = CollapsiblePrimitive.Root.ChangeEventDetails;
  export type ChangeEventReason = CollapsiblePrimitive.Root.ChangeEventReason;
}

export const CollapsibleTrigger = ({
  className,
  ...props
}: CollapsibleTrigger.Props): JSX.Element => {
  return (
    <CollapsiblePrimitive.Trigger
      className={createClassName("flex w-56 items-center gap-2", className)}
      {...props}
    />
  );
};
export namespace CollapsibleTrigger {
  export type Props = ComponentProps<typeof CollapsiblePrimitive.Trigger>;
}

export const CollapsiblePanel = ({
  className,
  ...props
}: CollapsiblePanel.Props): JSX.Element => {
  return (
    <CollapsiblePrimitive.Panel
      className={createClassName(
        "flex h-[var(--collapsible-panel-height)] flex-col justify-end overflow-hidden bg-accent transition-all ease-out data-ending-style:h-0 data-starting-style:h-0",
        className,
      )}
      {...props}
    />
  );
};
export namespace CollapsiblePanel {
  export type Props = ComponentProps<typeof CollapsiblePrimitive.Panel>;
  export type State = CollapsiblePrimitive.Panel.State;
}
