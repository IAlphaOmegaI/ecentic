import { Select as SelectPrimitive } from "@base-ui/react/select";
import { CheckIcon, ChevronYIcon } from "@zenncore/icons";
import { type ClassList, cn } from "@zenncore/utils";
import type { DistributiveOverride } from "@zenncore/utils/types";
import type { ComponentProps, JSX } from "react";
import { createClassName } from "../utils/helpers/class-name";

export const Select: typeof SelectPrimitive.Root = SelectPrimitive.Root;
export namespace Select {
  export type Props<
    Value,
    Multiple extends boolean | undefined = false,
  > = ComponentProps<typeof SelectPrimitive.Root<Value, Multiple>>;
  export type State = SelectPrimitive.Root.State;
  export type Actions = SelectPrimitive.Root.Actions;
  export type ChangeEventDetails = SelectPrimitive.Root.ChangeEventDetails;
  export type ChangeEventReason = SelectPrimitive.Root.ChangeEventReason;
}

export const SelectTrigger = ({
  children,
  className,
  classList,
  ...props
}: SelectTrigger.Props): JSX.Element => {
  return (
    <SelectPrimitive.Trigger
      className={createClassName(
        "flex h-10 min-w-36 select-none items-center justify-between gap-3 border border-accent-foreground pr-3 pl-3.5 text-base text-foreground transition-colors duration-200 hover:bg-background-dimmed focus-visible:border-primary focus-visible:outline-0 active:bg-background-dimmed data-popup-open:bg-background-dimmed data-popup-open:border-primary",
        className,
        classList?.trigger,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon
        className={createClassName("flex", classList?.icon?.root)}
      >
        <ChevronYIcon
          className={cn("stroke-foreground", classList?.icon?.icon)}
        />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
};
export namespace SelectTrigger {
  export type ClassListKey = "trigger" | { icon: "root" | "icon" };
  export type Props = {
    classList?: ClassList<ClassListKey>;
  } & ComponentProps<typeof SelectPrimitive.Trigger>;
  export type State = SelectPrimitive.Trigger.State;
}

export const SelectValue: typeof SelectPrimitive.Value = SelectPrimitive.Value;
export namespace SelectValue {
  export type Props = ComponentProps<typeof SelectPrimitive.Value>;
  export type State = SelectPrimitive.Value.State;
}

export const SelectPositioner = ({
  container,
  sideOffset = 8,
  className,
  classList,
  ...props
}: SelectPositioner.Props): JSX.Element => {
  return (
    <SelectPrimitive.Portal container={container} className={classList?.portal}>
      {/* <SelectPrimitive.Backdrop /> */}
      <SelectPrimitive.Positioner
        sideOffset={sideOffset}
        className={createClassName(
          "outline-0",
          className,
          classList?.positioner,
        )}
        {...props}
      />
    </SelectPrimitive.Portal>
  );
};
export namespace SelectPositioner {
  export type ClassListKey = "positioner" | "portal";
  export type Props = DistributiveOverride<
    ComponentProps<typeof SelectPrimitive.Portal>,
    ComponentProps<typeof SelectPrimitive.Positioner>
  > & {
    classList?: ClassList<ClassListKey>;
  };
  export type State = SelectPrimitive.Positioner.State;
}

export const SelectPopup = ({
  children,
  className,
  classList,
  ...props
}: SelectPopup.Props): JSX.Element => {
  return (
    <>
      <SelectPrimitive.ScrollUpArrow
        className={createClassName(
          "top-0 z-1 flex h-4 w-full cursor-default items-center justify-center border border-accent-foreground border-b-0 bg-background text-center text-xs before:absolute before:top-[-100%] before:left-0 before:h-full before:w-full before:content-[''] data-[direction=down]:bottom-0 data-[direction=down]:before:bottom-[-100%]",
          classList?.arrow?.arrow,
          classList?.arrow?.up,
        )}
      />
      <SelectPrimitive.Popup
        className={createClassName(
          "group max-h-(--available-height) origin-(--transform-origin) overflow-y-auto border border-accent-foreground bg-background py-1 text-foreground transition-[transform,scale,opacity] data-[side=none]:data-starting-style:scale-100 data-[side=none]:data-starting-style:opacity-100 data-[side=none]:data-starting-style:transition-none data-ending-style:scale-90 data-starting-style:scale-90 data-ending-style:opacity-0 data-starting-style:opacity-0 data-ending-style:transition-none",
          className,
          classList?.root,
        )}
        {...props}
      >
        {children}
      </SelectPrimitive.Popup>
      <SelectPrimitive.ScrollDownArrow
        className={createClassName(
          "bottom-0 z-[1] flex h-4 w-full cursor-default items-center justify-center border border-accent-foreground border-t-0 bg-background text-center text-xs before:absolute before:top-[-100%] before:left-0 before:h-full before:w-full before:content-[''] data-[direction=down]:bottom-0 data-[direction=down]:before:bottom-[-100%]",
          classList?.arrow?.arrow,
          classList?.arrow?.down,
        )}
      />
    </>
  );
};
export namespace SelectPopup {
  export type ClassListKey = "root" | { arrow: "arrow" | "up" | "down" };
  export type Props = {
    classList?: ClassList<ClassListKey>;
  } & ComponentProps<typeof SelectPrimitive.Popup>;
  export type State = SelectPrimitive.Popup.State;
}

export const SelectArrow: typeof SelectPrimitive.Arrow = SelectPrimitive.Arrow;
export namespace SelectArrow {
  export type Props = ComponentProps<typeof SelectPrimitive.Arrow>;
  export type State = SelectPrimitive.Arrow.State;
}

export const SelectItem = ({
  children,
  className,
  classList,
  ...props
}: SelectItem.Props): JSX.Element => {
  return (
    <SelectPrimitive.Item
      className={createClassName(
        "grid min-w-[var(--anchor-width)] cursor-default select-none grid-cols-[0.75rem_1fr] items-center gap-2 py-2 pr-4 pl-2.5 text-sm leading-4 outline-0 data-[selected]:not-data-highlighted:text-primary data-highlighted:relative data-highlighted:z-0 data-highlighted:text-white data-highlighted:before:absolute data-highlighted:before:inset-x-1 data-highlighted:before:inset-y-0 data-highlighted:before:z-[-1] data-highlighted:before:bg-primary group-data-[side=none]:min-w-[calc(var(--anchor-width)+1rem)] group-data-[side=none]:pr-12 group-data-[side=none]:text-base group-data-[side=none]:leading-4",
        className,
        classList?.item,
      )}
      {...props}
    >
      <SelectPrimitive.ItemIndicator
        className={createClassName("col-start-1", classList?.indicator?.root)}
      >
        <CheckIcon className={cn("size-3", classList?.indicator?.icon)} />
      </SelectPrimitive.ItemIndicator>
      <SelectPrimitive.ItemText
        className={createClassName("col-start-2", classList?.text)}
      >
        {children}
      </SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
};
export namespace SelectItem {
  export type ClassListKey = "item" | { indicator: "root" | "icon" } | "text";
  export type Props = {
    classList?: ClassList<ClassListKey>;
  } & ComponentProps<typeof SelectPrimitive.Item>;
  export type State = SelectPrimitive.Item.State;
}

export const SelectSeparator: typeof SelectPrimitive.Separator =
  SelectPrimitive.Separator;
export namespace SelectSeparator {
  export type Props = ComponentProps<typeof SelectPrimitive.Separator>;
  export type State = SelectPrimitive.Separator.State;
}

export const SelectGroup: typeof SelectPrimitive.Group = SelectPrimitive.Group;
export namespace SelectGroup {
  export type Props = ComponentProps<typeof SelectPrimitive.Group>;
  export type State = SelectPrimitive.Group.State;
}

export const SelectGroupLabel: typeof SelectPrimitive.GroupLabel =
  SelectPrimitive.GroupLabel;
export namespace SelectGroupLabel {
  export type Props = ComponentProps<typeof SelectPrimitive.GroupLabel>;
  export type State = SelectPrimitive.GroupLabel.State;
}
