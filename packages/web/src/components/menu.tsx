import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { Menubar as MenubarPrimitive } from "@base-ui/react/menubar";
import { CheckIcon } from "@zenncore/icons";
import { type ClassList, cn } from "@zenncore/utils";
import type { DistributiveOverride } from "@zenncore/utils/types";
import type { ComponentProps, JSX } from "react";
import { createClassName } from "../utils/helpers/class-name";

export const Menu: typeof MenuPrimitive.Root = MenuPrimitive.Root;
export namespace Menu {
  export type Props = ComponentProps<typeof MenuPrimitive.Root>;
  export type Actions = MenuPrimitive.Root.Actions;
  export type ChangeEventDetails = MenuPrimitive.Root.ChangeEventDetails;
  export type ChangeEventReason = MenuPrimitive.Root.ChangeEventReason;
  export type Orientation = MenuPrimitive.Root.Orientation;
}

export const MenuTrigger = ({
  className,
  ...props
}: MenuTrigger.Props): JSX.Element => {
  return (
    <MenuPrimitive.Trigger
      className={createClassName(
        "flex h-10 select-none items-center justify-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-3.5 font-medium text-base text-gray-900 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-blue-800 focus-visible:-outline-offset-1 active:bg-gray-100 data-popup-open:bg-gray-100",
        className,
      )}
      {...props}
    />
  );
};
export namespace MenuTrigger {
  export type Props = ComponentProps<typeof MenuPrimitive.Trigger>;
  export type State = MenuPrimitive.Trigger.State;
}

export const MenuPositioner = ({
  container,
  keepMounted,
  sideOffset = 8,
  className,
  classList,
  ...props
}: MenuPositioner.Props): JSX.Element => {
  return (
    <MenuPrimitive.Portal
      container={container}
      keepMounted={keepMounted}
      className={classList?.portal}
    >
      {/* TODO: find correct placement for backdrop */}
      {/* <MenuPrimitive.Backdrop /> */}
      <MenuPrimitive.Positioner
        sideOffset={sideOffset}
        className={createClassName(
          "outline-0",
          className,
          classList?.positioner,
        )}
        {...props}
      />
    </MenuPrimitive.Portal>
  );
};
export namespace MenuPositioner {
  export type ClassListKey = "positioner" | "portal";
  export type Props = DistributiveOverride<
    ComponentProps<typeof MenuPrimitive.Portal>,
    ComponentProps<typeof MenuPrimitive.Positioner>
  > & {
    classList?: ClassList<ClassListKey>;
  };
  export type State = MenuPrimitive.Positioner.State;
}

export const MenuPopup = ({
  className,
  ...props
}: MenuPopup.Props): JSX.Element => {
  return (
    <MenuPrimitive.Popup
      className={createClassName(
        "origin-[var(--transform-origin)] rounded-md bg-[canvas] py-1 text-gray-900 shadow-gray-200 shadow-lg outline-1 outline-gray-200 transition-[transform,scale,opacity] data-ending-style:scale-90 data-starting-style:scale-90 data-ending-style:opacity-0 data-starting-style:opacity-0 dark:shadow-none dark:outline-gray-300 dark:-outline-offset-1",
        className,
      )}
      {...props}
    />
  );
};
export namespace MenuPopup {
  export type Props = ComponentProps<typeof MenuPrimitive.Popup>;
  export type State = MenuPrimitive.Popup.State;
}

export const MenuArrow = ({
  className,
  classList,
  ...props
}: MenuArrow.Props): JSX.Element => {
  return (
    <MenuPrimitive.Arrow
      className={createClassName(
        "data-[side=bottom]:top-[-8px] data-[side=left]:right-[-13px] data-[side=top]:bottom-[-8px] data-[side=right]:left-[-13px] data-[side=left]:rotate-90 data-[side=right]:-rotate-90 data-[side=top]:rotate-180",
        className,
        classList?.root,
      )}
      {...props}
    >
      <MenuArrowSvg className={classList?.arrow} />
    </MenuPrimitive.Arrow>
  );
};
export namespace MenuArrow {
  export type ClassListKey = "root" | "arrow";
  export type Props = {
    classList?: ClassList<ClassListKey>;
  } & ComponentProps<typeof MenuPrimitive.Arrow>;
  export type State = MenuPrimitive.Arrow.State;
}

const MenuArrowSvg = (props: ComponentProps<"svg">) => {
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

export const MenuItem = ({
  className,
  ...props
}: MenuItem.Props): JSX.Element => {
  return (
    <MenuPrimitive.Item
      className={createClassName(
        "flex cursor-default select-none py-2 pr-8 pl-4 text-sm leading-4 outline-0 data-highlighted:relative data-highlighted:z-0 data-highlighted:text-gray-50 data-highlighted:before:absolute data-highlighted:before:inset-x-1 data-highlighted:before:inset-y-0 data-highlighted:before:z-[-1] data-highlighted:before:rounded-sm data-highlighted:before:bg-gray-900",
        className,
      )}
      {...props}
    />
  );
};
export namespace MenuItem {
  export type Props = ComponentProps<typeof MenuPrimitive.Item>;
  export type State = MenuPrimitive.Item.State;
}

export const MenuSeparator = ({
  className,
  ...props
}: MenuSeparator.Props): JSX.Element => {
  return (
    <MenuPrimitive.Separator
      className={createClassName("mx-4 my-1.5 h-px bg-gray-200", className)}
      {...props}
    />
  );
};
export namespace MenuSeparator {
  export type Props = ComponentProps<typeof MenuPrimitive.Separator>;
  export type State = MenuPrimitive.Separator.State;
}

export const MenuGroup: typeof MenuPrimitive.Group = MenuPrimitive.Group;
export namespace MenuGroup {
  export type Props = ComponentProps<typeof MenuPrimitive.Group>;
  export type State = MenuPrimitive.Group.State;
}

export const MenuGroupLabel = ({
  className,
  ...props
}: MenuGroupLabel.Props): JSX.Element => {
  return (
    <MenuPrimitive.GroupLabel
      className={createClassName(
        "cursor-default select-none py-2 pr-8 pl-7.5 text-gray-600 text-sm leading-4",
        className,
      )}
      {...props}
    />
  );
};
export namespace MenuGroupLabel {
  export type Props = ComponentProps<typeof MenuPrimitive.GroupLabel>;
  export type State = MenuPrimitive.GroupLabel.State;
}

export const MenuRadioGroup = ({
  className,
  ...props
}: MenuRadioGroup.Props): JSX.Element => {
  return (
    <MenuPrimitive.RadioGroup
      className={createClassName("flex flex-col gap-1.5", className)}
      {...props}
    />
  );
};
export namespace MenuRadioGroup {
  export type Props = ComponentProps<typeof MenuPrimitive.RadioGroup>;
  export type State = MenuPrimitive.RadioGroup.State;
  export type ChangeEventDetails = MenuPrimitive.RadioGroup.ChangeEventDetails;
  export type ChangeEventReason = MenuPrimitive.RadioGroup.ChangeEventReason;
}

export const MenuRadioItem = ({
  children,
  className,
  classList,
  ...props
}: MenuRadioItem.Props): JSX.Element => {
  return (
    <MenuPrimitive.RadioItem
      className={createClassName(
        "grid cursor-default select-none grid-cols-[0.75rem_1fr] items-center gap-2 py-2 pr-8 pl-2.5 text-sm leading-4 outline-0 data-highlighted:relative data-highlighted:z-0 data-highlighted:text-gray-50 data-highlighted:before:absolute data-highlighted:before:inset-x-1 data-highlighted:before:inset-y-0 data-highlighted:before:z-[-1] data-highlighted:before:rounded-sm data-highlighted:before:bg-gray-900",
        className,
        classList?.root,
      )}
      {...props}
    >
      <MenuPrimitive.RadioItemIndicator
        className={createClassName("col-start-1", classList?.indicator?.root)}
      >
        <CheckIcon
          className={cn("size-3 stroke-foreground", classList?.indicator?.icon)}
        />
      </MenuPrimitive.RadioItemIndicator>
      {children}
    </MenuPrimitive.RadioItem>
  );
};
export namespace MenuRadioItem {
  export type ClassListKey = "root" | { indicator: "root" | "icon" };
  export type Props = {
    classList?: ClassList<ClassListKey>;
  } & ComponentProps<typeof MenuPrimitive.RadioItem>;
  export type State = MenuPrimitive.RadioItem.State;
}

export const MenuCheckboxItem = ({
  children,
  className,
  classList,
  ...props
}: MenuCheckboxItem.Props): JSX.Element => {
  return (
    <MenuPrimitive.CheckboxItem
      className={createClassName(
        "grid cursor-default select-none grid-cols-[0.75rem_1fr] items-center gap-2 py-2 pr-8 pl-2.5 text-sm leading-4 outline-0 data-highlighted:relative data-highlighted:z-0 data-highlighted:text-gray-50 data-highlighted:before:absolute data-highlighted:before:inset-x-1 data-highlighted:before:inset-y-0 data-highlighted:before:z-[-1] data-highlighted:before:rounded-sm data-highlighted:before:bg-gray-900",
        className,
        classList?.root,
      )}
      {...props}
    >
      <MenuPrimitive.CheckboxItemIndicator
        className={createClassName("col-start-1", classList?.indicator)}
      >
        <CheckIcon className="size-3 stroke-foreground" />
      </MenuPrimitive.CheckboxItemIndicator>
      {children}
    </MenuPrimitive.CheckboxItem>
  );
};
export namespace MenuCheckboxItem {
  export type ClassListKey = "root" | "indicator";
  export type Props = {
    classList?: ClassList<ClassListKey>;
  } & ComponentProps<typeof MenuPrimitive.CheckboxItem>;
  export type State = MenuPrimitive.CheckboxItem.State;
  export type ChangeEventDetails =
    MenuPrimitive.CheckboxItem.ChangeEventDetails;
  export type ChangeEventReason = MenuPrimitive.CheckboxItem.ChangeEventReason;
}

export const SubMenu: typeof MenuPrimitive.SubmenuRoot =
  MenuPrimitive.SubmenuRoot;
export namespace SubMenu {
  export type Props = ComponentProps<typeof MenuPrimitive.SubmenuRoot>;
  export type State = MenuPrimitive.SubmenuRoot.State;
  export type ChangeEventDetails = MenuPrimitive.SubmenuRoot.ChangeEventDetails;
  export type ChangeEventReason = MenuPrimitive.SubmenuRoot.ChangeEventReason;
}

export const SubMenuTrigger = ({
  className,
  ...props
}: SubMenuTrigger.Props): JSX.Element => {
  return (
    <MenuPrimitive.SubmenuTrigger
      className={createClassName(
        "flex cursor-default select-none items-center justify-between gap-4 py-2 pr-4 pl-4 text-sm leading-4 outline-0 data-highlighted:relative data-popup-open:relative data-highlighted:z-0 data-popup-open:z-0 data-highlighted:text-gray-50 data-highlighted:data-popup-open:before:bg-gray-900 data-highlighted:before:absolute data-popup-open:before:absolute data-highlighted:before:inset-x-1 data-popup-open:before:inset-x-1 data-highlighted:before:inset-y-0 data-popup-open:before:inset-y-0 data-highlighted:before:z-[-1] data-popup-open:before:z-[-1] data-highlighted:before:rounded-sm data-popup-open:before:rounded-sm data-highlighted:before:bg-gray-900 data-popup-open:before:bg-gray-100",
        className,
      )}
      {...props}
    />
  );
};
export namespace SubMenuTrigger {
  export type Props = ComponentProps<typeof MenuPrimitive.SubmenuTrigger>;
  export type State = MenuPrimitive.SubmenuTrigger.State;
}

export const Menubar = ({
  className,
  ...props
}: Menubar.Props): JSX.Element => {
  return (
    <MenubarPrimitive
      className={createClassName(
        "flex rounded-md border border-gray-200 bg-gray-50 p-0.5",
        className,
      )}
      {...props}
    />
  );
};
export namespace Menubar {
  export type Props = ComponentProps<typeof MenubarPrimitive>;
  export type State = MenubarPrimitive.State;
}
