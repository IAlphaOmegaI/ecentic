import { ContextMenu as ContextMenuPrimitive } from "@base-ui/react/context-menu";
import { CheckIcon } from "@zenncore/icons";
import { type ClassList, cn } from "@zenncore/utils";
import type { DistributiveOverride, Prettify } from "@zenncore/utils/types";
import type { ComponentProps, JSX } from "react";
import { createClassName } from "../utils/helpers/class-name";

export const ContextMenu: typeof ContextMenuPrimitive.Root =
  ContextMenuPrimitive.Root;
export namespace ContextMenu {
  export type Props = ComponentProps<typeof ContextMenuPrimitive.Root>;
  export type State = ContextMenuPrimitive.Root.State;
  export type ChangeEventDetails = ContextMenuPrimitive.Root.ChangeEventDetails;
  export type ChangeEventReason = ContextMenuPrimitive.Root.ChangeEventReason;
}

export const ContextMenuTrigger = ({
  className,
  ...props
}: ContextMenuTrigger.Props): JSX.Element => {
  return (
    <ContextMenuPrimitive.Trigger
      className={createClassName(
        "flex h-[12rem] w-[15rem] select-none items-center justify-center rounded border border-gray-300 text-gray-900",
        className,
      )}
      {...props}
    />
  );
};
export namespace ContextMenuTrigger {
  export type Props = ComponentProps<typeof ContextMenuPrimitive.Trigger>;
  export type State = ContextMenuPrimitive.Trigger.State;
}

export const ContextMenuPositioner = ({
  container,
  keepMounted,
  className,
  classList,
  ...props
}: ContextMenuPositioner.Props): JSX.Element => {
  return (
    <ContextMenuPrimitive.Portal
      container={container}
      keepMounted={keepMounted}
      className={classList?.portal}
    >
      {/* <ContextMenuPrimitive.Backdrop /> */}
      <ContextMenuPrimitive.Positioner
        className={createClassName(
          "outline-0",
          className,
          classList?.positioner,
        )}
        {...props}
      />
    </ContextMenuPrimitive.Portal>
  );
};
export namespace ContextMenuPositioner {
  export type ClassListKey = "positioner" | "portal";
  export type Props = DistributiveOverride<
    ComponentProps<typeof ContextMenuPrimitive.Portal>,
    ComponentProps<typeof ContextMenuPrimitive.Positioner>
  > & {
    classList?: ClassList<ClassListKey>;
  };
  export type State = ContextMenuPrimitive.Positioner.State;
}

export const ContextMenuPopup = ({
  className,
  ...props
}: ContextMenuPopup.Props): JSX.Element => {
  return (
    <ContextMenuPrimitive.Popup
      className={createClassName(
        "origin-[var(--transform-origin)] rounded-md bg-[canvas] py-1 text-gray-900 shadow-gray-200 shadow-lg outline outline-gray-200 transition-[opacity] data-ending-style:opacity-0 dark:shadow-none dark:outline-gray-300 dark:-outline-offset-1",
        className,
      )}
      {...props}
    />
  );
};
export namespace ContextMenuPopup {
  export type Props = ComponentProps<typeof ContextMenuPrimitive.Popup>;
  export type State = ContextMenuPrimitive.Popup.State;
}

export const ContextMenuArrow = ({
  className,
  classList,
  ...props
}: ContextMenuArrow.Props): JSX.Element => {
  return (
    <ContextMenuPrimitive.Arrow
      className={createClassName(
        "data-[side=bottom]:top-[-8px] data-[side=left]:right-[-13px] data-[side=top]:bottom-[-8px] data-[side=right]:left-[-13px] data-[side=left]:rotate-90 data-[side=right]:-rotate-90 data-[side=top]:rotate-180",
        className,
        classList?.root,
      )}
      {...props}
    >
      <ContextMenuArrowSvg className={classList?.arrow} />
    </ContextMenuPrimitive.Arrow>
  );
};
export namespace ContextMenuArrow {
  export type ClassListKey = "root" | "arrow";
  export type Props = {
    classList?: ClassList<ClassListKey>;
  } & ComponentProps<typeof ContextMenuPrimitive.Arrow>;
  export type State = ContextMenuPrimitive.Arrow.State;
}

const ContextMenuArrowSvg = (props: ComponentProps<"svg">) => {
  return (
    <svg width="20" height="10" viewBox="0 0 20 10" fill="none" {...props}>
      <path
        d="M9.66437 2.60207L4.80758 6.97318C4.07308 7.63423 3.11989 8 2.13172 8H0V10H20V8H18.5349C17.5468 8 16.5936 7.63423 15.8591 6.97318L11.0023 2.60207C10.622 2.2598 10.0447 2.25979 9.66437 2.60207Z"
        className="fill-[canvas]"
      />
      <path
        d="M8.99542 1.85876C9.75604 1.17425 10.9106 1.17422 11.6713 1.85878L16.5281 6.22989C17.0789 6.72568 17.7938 7.00001 18.5349 7.00001L15.89 7L11.0023 2.60207C10.622 2.2598 10.0447 2.2598 9.66436 2.60207L4.77734 7L2.13171 7.00001C2.87284 7.00001 3.58774 6.72568 4.13861 6.22989L8.99542 1.85876Z"
        className="fill-gray-200 dark:fill-none"
      />
      <path
        d="M10.3333 3.34539L5.47654 7.71648C4.55842 8.54279 3.36693 9 2.13172 9H0V8H2.13172C3.11989 8 4.07308 7.63423 4.80758 6.97318L9.66437 2.60207C10.0447 2.25979 10.622 2.2598 11.0023 2.60207L15.8591 6.97318C16.5936 7.63423 17.5468 8 18.5349 8H20V9H18.5349C17.2998 9 16.1083 8.54278 15.1901 7.71648L10.3333 3.34539Z"
        className="dark:fill-gray-300"
      />
    </svg>
  );
};

export const ContextMenuItem = ({
  className,
  ...props
}: ContextMenuItem.Props): JSX.Element => {
  return (
    <ContextMenuPrimitive.Item
      className={createClassName(
        "flex cursor-default select-none py-2 pr-8 pl-4 text-sm leading-4 outline-none data-highlighted:relative data-highlighted:z-0 data-highlighted:text-gray-50 data-highlighted:before:absolute data-highlighted:before:inset-x-1 data-highlighted:before:inset-y-0 data-highlighted:before:z-[-1] data-highlighted:before:rounded-sm data-highlighted:before:bg-gray-900",
        className,
      )}
      {...props}
    />
  );
};
export namespace ContextMenuItem {
  export type Props = ComponentProps<typeof ContextMenuPrimitive.Item>;
  export type State = ContextMenuPrimitive.Item.State;
}

export const ContextMenuSeparator = ({
  className,
  ...props
}: ContextMenuSeparator.Props): JSX.Element => {
  return (
    <ContextMenuPrimitive.Separator
      className={createClassName("mx-4 my-1.5 h-px bg-gray-200", className)}
      {...props}
    />
  );
};
export namespace ContextMenuSeparator {
  export type Props = ComponentProps<typeof ContextMenuPrimitive.Separator>;
  export type State = ContextMenuPrimitive.Separator.State;
}

export const ContextMenuGroup: typeof ContextMenuPrimitive.Group =
  ContextMenuPrimitive.Group;
export namespace ContextMenuGroup {
  export type Props = ComponentProps<typeof ContextMenuPrimitive.Group>;
  export type State = Prettify<ContextMenuPrimitive.Group.State>;
}

export const ContextMenuGroupLabel: typeof ContextMenuPrimitive.GroupLabel =
  ContextMenuPrimitive.GroupLabel;
export namespace ContextMenuGroupLabel {
  export type Props = ComponentProps<typeof ContextMenuPrimitive.GroupLabel>;
  export type State = ContextMenuPrimitive.GroupLabel.State;
}

export const ContextMenuRadioGroup = ({
  className,
  ...props
}: ContextMenuRadioGroup.Props): JSX.Element => {
  return (
    <ContextMenuPrimitive.RadioGroup
      className={createClassName("flex flex-col gap-1.5", className)}
      {...props}
    />
  );
};
export namespace ContextMenuRadioGroup {
  export type Props = ComponentProps<typeof ContextMenuPrimitive.RadioGroup>;
  export type State = ContextMenuPrimitive.RadioGroup.State;
  export type ChangeEventDetails =
    ContextMenuPrimitive.RadioGroup.ChangeEventDetails;
  export type ChangeEventReason =
    ContextMenuPrimitive.RadioGroup.ChangeEventReason;
}

export const ContextMenuRadioItem = ({
  children,
  className,
  classList,
  ...props
}: ContextMenuRadioItem.Props): JSX.Element => {
  return (
    <ContextMenuPrimitive.RadioItem
      className={createClassName(
        "grid cursor-default select-none grid-cols-[0.75rem_1fr] items-center gap-2 py-2 pr-8 pl-2.5 text-sm leading-4 outline-0 data-highlighted:relative data-highlighted:z-0 data-highlighted:text-gray-50 data-highlighted:before:absolute data-highlighted:before:inset-x-1 data-highlighted:before:inset-y-0 data-highlighted:before:z-[-1] data-highlighted:before:rounded-sm data-highlighted:before:bg-gray-900",
        className,
        classList?.root,
      )}
      {...props}
    >
      <ContextMenuPrimitive.RadioItemIndicator
        className={createClassName("col-start-1", classList?.indicator?.root)}
      >
        <CheckIcon
          className={cn("size-3 stroke-foreground", classList?.indicator?.icon)}
        />
      </ContextMenuPrimitive.RadioItemIndicator>
      {children}
    </ContextMenuPrimitive.RadioItem>
  );
};
export namespace ContextMenuRadioItem {
  export type ClassListKey = "root" | { indicator: "root" | "icon" };
  export type Props = {
    classList?: ClassList<ClassListKey>;
  } & ComponentProps<typeof ContextMenuPrimitive.RadioItem>;
  export type State = ContextMenuPrimitive.RadioItem.State;
}

export const ContextMenuCheckboxItem = ({
  children,
  className,
  classList,
  ...props
}: ContextMenuCheckboxItem.Props): JSX.Element => {
  return (
    <ContextMenuPrimitive.CheckboxItem
      className={createClassName(
        "grid cursor-default select-none grid-cols-[0.75rem_1fr] items-center gap-2 py-2 pr-8 pl-2.5 text-sm leading-4 outline-0 data-highlighted:relative data-highlighted:z-0 data-highlighted:text-gray-50 data-highlighted:before:absolute data-highlighted:before:inset-x-1 data-highlighted:before:inset-y-0 data-highlighted:before:z-[-1] data-highlighted:before:rounded-sm data-highlighted:before:bg-gray-900",
        className,
        classList?.root,
      )}
      {...props}
    >
      <ContextMenuPrimitive.CheckboxItemIndicator
        className={createClassName("col-start-1", classList?.indicator)}
      >
        <CheckIcon className="size-3 stroke-foreground" />
      </ContextMenuPrimitive.CheckboxItemIndicator>
      {children}
    </ContextMenuPrimitive.CheckboxItem>
  );
};
export namespace ContextMenuCheckboxItem {
  export type ClassListKey = "root" | "indicator";
  export type Props = {
    classList?: ClassList<ClassListKey>;
  } & ComponentProps<typeof ContextMenuPrimitive.CheckboxItem>;
  export type State = ContextMenuPrimitive.CheckboxItem.State;
  export type ChangeEventDetails =
    ContextMenuPrimitive.CheckboxItem.ChangeEventDetails;
  export type ChangeEventReason =
    ContextMenuPrimitive.CheckboxItem.ChangeEventReason;
}

export const ContextMenuSubmenuRoot: typeof ContextMenuPrimitive.SubmenuRoot =
  ContextMenuPrimitive.SubmenuRoot;
export namespace ContextMenuSubmenuRoot {
  export type Props = ComponentProps<typeof ContextMenuPrimitive.SubmenuRoot>;
  export type State = ContextMenuPrimitive.SubmenuRoot.State;
  export type ChangeEventDetails =
    ContextMenuPrimitive.SubmenuRoot.ChangeEventDetails;
  export type ChangeEventReason =
    ContextMenuPrimitive.SubmenuRoot.ChangeEventReason;
}

export const ContextMenuSubmenuTrigger = ({
  className,
  ...props
}: ContextMenuSubmenuTrigger.Props): JSX.Element => {
  return (
    <ContextMenuPrimitive.SubmenuTrigger
      className={createClassName(
        "flex cursor-default select-none items-center justify-between gap-4 py-2 pr-4 pl-4 text-sm leading-4 outline-none data-highlighted:relative data-popup-open:relative data-highlighted:z-0 data-popup-open:z-0 data-highlighted:text-gray-50 data-highlighted:data-popup-open:before:bg-gray-900 data-highlighted:before:absolute data-popup-open:before:absolute data-highlighted:before:inset-x-1 data-popup-open:before:inset-x-1 data-highlighted:before:inset-y-0 data-popup-open:before:inset-y-0 data-highlighted:before:z-[-1] data-popup-open:before:z-[-1] data-highlighted:before:rounded-sm data-popup-open:before:rounded-sm data-highlighted:before:bg-gray-900 data-popup-open:before:bg-gray-100",
        className,
      )}
      {...props}
    />
  );
};
export namespace ContextMenuSubmenuTrigger {
  export type Props = ComponentProps<
    typeof ContextMenuPrimitive.SubmenuTrigger
  >;
  export type State = ContextMenuPrimitive.SubmenuTrigger.State;
}
