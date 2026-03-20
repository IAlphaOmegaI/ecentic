import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import type { ComponentProps, JSX } from "react";
import { createClassName } from "../utils/helpers/class-name";

export const Tabs = ({ className, ...props }: Tabs.Props): JSX.Element => {
  return (
    <TabsPrimitive.Root className={createClassName(className)} {...props} />
  );
};
export namespace Tabs {
  export type Props = ComponentProps<typeof TabsPrimitive.Root>;
  export type State = TabsPrimitive.Root.State;
  export type ChangeEventDetails = TabsPrimitive.Root.ChangeEventDetails;
  export type ChangeEventReason = TabsPrimitive.Root.ChangeEventReason;
  export type Orientation = TabsPrimitive.Root.Orientation;
}

export const TabsList = ({
  className,
  ...props
}: TabsList.Props): JSX.Element => {
  return (
    <TabsPrimitive.List
      className={createClassName(
        "relative z-0 flex w-fit bg-white border border-accent-foreground",
        className,
      )}
      {...props}
    />
  );
};
export namespace TabsList {
  export type Props = ComponentProps<typeof TabsPrimitive.List>;
  export type State = TabsPrimitive.List.State;
}

export const Tab = ({ className, ...props }: Tab.Props): JSX.Element => {
  return (
    <TabsPrimitive.Tab
      className={createClassName(
        "flex h-9 select-none items-center justify-center border-0 px-3 font-medium last:border-r-0 border-r border-accent-foreground text-foreground-dimmed outline-0 before:inset-x-0 before:inset-y-1 before:outline-primary before:-outline-offset-1 focus-visible:relative focus-visible:before:absolute focus-visible:before:outline-2 data-selected:text-white data-[active]:text-white",
        className,
      )}
      {...props}
    />
  );
};
export namespace Tab {
  export type Props = ComponentProps<typeof TabsPrimitive.Tab>;
  export type State = TabsPrimitive.Tab.State;
  export type ActivationDirection = TabsPrimitive.Tab.ActivationDirection;
  export type Metadata = TabsPrimitive.Tab.Metadata;
  export type Position = TabsPrimitive.Tab.Position;
  export type Size = TabsPrimitive.Tab.Size;
  export type Value = TabsPrimitive.Tab.Value;
}

export const TabsIndicator = ({
  className,
  ...props
}: TabsIndicator.Props): JSX.Element => {
  return (
    <TabsPrimitive.Indicator
      className={createClassName(
        "absolute top-1/2 left-0 z-[-1] h-6 w-(--active-tab-width) translate-x-(--active-tab-left) -translate-y-1/2 bg-primary transition-all duration-200 ease-in-out",
        className,
      )}
      {...props}
    />
  );
};
export namespace TabsIndicator {
  export type Props = ComponentProps<typeof TabsPrimitive.Indicator>;
  export type State = TabsPrimitive.Indicator.State;
}

export const TabsPanel = ({
  className,
  ...props
}: TabsPanel.Props): JSX.Element => {
  return (
    <TabsPrimitive.Panel className={createClassName(className)} {...props} />
  );
};
export namespace TabsPanel {
  export type Props = ComponentProps<typeof TabsPrimitive.Panel>;
  export type State = TabsPrimitive.Panel.State;
  export type Metadata = TabsPrimitive.Panel.Metadata;
}
