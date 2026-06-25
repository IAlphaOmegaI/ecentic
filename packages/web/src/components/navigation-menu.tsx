import { NavigationMenu as NavigationMenuPrimitive } from "@base-ui/react/navigation-menu";
import { ChevronDownIcon } from "@zenncore/icons";
import { type ClassList, cn } from "@zenncore/utils";
import type { DistributiveOverride } from "@zenncore/utils/types";
import type { ComponentProps, CSSProperties, JSX } from "react";
import { createClassName } from "../utils/helpers/class-name";

export const NavigationMenu = ({
  className,
  ...props
}: NavigationMenu.Props): JSX.Element => {
  return (
    <NavigationMenuPrimitive.Root
      className={createClassName(
        "min-w-max bg-background p-1 text-foreground",
        className,
      )}
      {...props}
    />
  );
};
export namespace NavigationMenu {
  export type Props = ComponentProps<typeof NavigationMenuPrimitive.Root>;
  export type State = NavigationMenuPrimitive.Root.State;
  export type Action = NavigationMenuPrimitive.Root.Actions;
  export type ChangeEventDetails =
    NavigationMenuPrimitive.Root.ChangeEventDetails;
  export type ChangeEventReason =
    NavigationMenuPrimitive.Root.ChangeEventReason;
}

export const NavigationMenuList = ({
  className,
  ...props
}: NavigationMenuList.Props): JSX.Element => {
  return (
    <NavigationMenuPrimitive.List
      className={createClassName("relative flex", className)}
      {...props}
    />
  );
};
export namespace NavigationMenuList {
  export type Props = ComponentProps<typeof NavigationMenuPrimitive.List>;
  export type State = NavigationMenuPrimitive.List.State;
}

export const NavigationMenuItem: typeof NavigationMenuPrimitive.Item =
  NavigationMenuPrimitive.Item;
export namespace NavigationMenuItem {
  export type Props = ComponentProps<typeof NavigationMenuPrimitive.Item>;
  export type State = NavigationMenuPrimitive.Item.State;
}

export const NavigationMenuTrigger = ({
  className,
  ...props
}: NavigationMenuTrigger.Props): JSX.Element => {
  return (
    <NavigationMenuPrimitive.Trigger
      className={createClassName(triggerClassName, className)}
      {...props}
    />
  );
};
export namespace NavigationMenuTrigger {
  export type Props = ComponentProps<typeof NavigationMenuPrimitive.Trigger>;
  export type State = NavigationMenuPrimitive.Trigger.State;
}

export const NavigationMenuIcon = ({
  className,
  classList,
  ...props
}: NavigationMenuIcon.Props): JSX.Element => {
  return (
    <NavigationMenuPrimitive.Icon
      className={createClassName(
        "transition-transform duration-200 ease-in-out data-popup-open:rotate-180",
        className,
        classList?.root,
      )}
      {...props}
    >
      <ChevronDownIcon className={cn("stroke-foreground", classList?.icon)} />
    </NavigationMenuPrimitive.Icon>
  );
};
export namespace NavigationMenuIcon {
  export type ClassListKey = "root" | "icon";
  export type Props = {
    classList?: ClassList<ClassListKey>;
  } & ComponentProps<typeof NavigationMenuPrimitive.Icon>;
  export type State = NavigationMenuPrimitive.Icon.State;
}

export const NavigationMenuContent = ({
  className,
  ...props
}: NavigationMenuContent.Props): JSX.Element => {
  return (
    <NavigationMenuPrimitive.Content
      className={createClassName(contentClassName, className)}
      {...props}
    />
  );
};
export namespace NavigationMenuContent {
  export type Props = ComponentProps<typeof NavigationMenuPrimitive.Content>;
  export type State = NavigationMenuPrimitive.Content.State;
}

export const NavigationMenuLink = ({
  className,
  ...props
}: NavigationMenuLink.Props): JSX.Element => {
  return (
    <NavigationMenuPrimitive.Link
      className={createClassName(linkCardClassName, className)}
      {...props}
    />
  );
};
export namespace NavigationMenuLink {
  export type Props = ComponentProps<typeof NavigationMenuPrimitive.Link>;
  export type State = NavigationMenuPrimitive.Link.State;
}

export const NavigationMenuPositioner = ({
  container,
  keepMounted,
  sideOffset = 10,
  collisionPadding = { top: 5, bottom: 5, left: 20, right: 20 },
  className,
  classList,
  style,
  ...props
}: NavigationMenuPositioner.Props): JSX.Element => {
  return (
    <NavigationMenuPrimitive.Portal
      container={container}
      keepMounted={keepMounted}
      className={classList?.portal}
    >
      {/* <NavigationMenuPrimitive.Backdrop /> */}
      <NavigationMenuPrimitive.Positioner
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={createClassName(
          "box-border h-[var(--positioner-height)] w-[var(--positioner-width)] max-w-[var(--available-width)] transition-[top,left,right,bottom] duration-[var(--duration)] ease-[var(--easing)] before:absolute before:content-[''] data-[instant]:transition-none data-[side=bottom]:before:top-[-10px] data-[side=left]:before:top-0 data-[side=right]:before:top-0 data-[side=bottom]:before:right-0 data-[side=left]:before:right-[-10px] data-[side=top]:before:right-0 data-[side=left]:before:bottom-0 data-[side=right]:before:bottom-0 data-[side=top]:before:bottom-[-10px] data-[side=bottom]:before:left-0 data-[side=right]:before:left-[-10px] data-[side=top]:before:left-0 data-[side=bottom]:before:h-2.5 data-[side=top]:before:h-2.5 data-[side=left]:before:w-2.5 data-[side=right]:before:w-2.5",
          className,
          classList?.positioner,
        )}
        style={{
          ...({
            "--duration": "0.35s",
            "--easing": "cubic-bezier(0.22, 1, 0.36, 1)",
          } as CSSProperties),
          ...style,
        }}
        {...props}
      />
    </NavigationMenuPrimitive.Portal>
  );
};
export namespace NavigationMenuPositioner {
  export type ClassListKey = "positioner" | "portal";
  export type Props = DistributiveOverride<
    ComponentProps<typeof NavigationMenuPrimitive.Portal>,
    ComponentProps<typeof NavigationMenuPrimitive.Positioner>
  > & {
    classList?: ClassList<ClassListKey>;
  };
  export type State = NavigationMenuPrimitive.Positioner.State;
}

export const NavigationMenuPopup = ({
  className,
  ...props
}: NavigationMenuPopup.Props): JSX.Element => {
  return (
    <NavigationMenuPrimitive.Popup
      className={createClassName(
        "data-ending-style:easing-[ease] relative h-(--popup-height) w-full xs:w-(--popup-width) origin-(--transform-origin) overflow-hidden rounded-lg border border-accent-foreground bg-background text-foreground transition-[opacity,transform,width,height,scale,translate] duration-(--duration) ease-(--easing) data-ending-style:scale-90 data-starting-style:scale-90 data-ending-style:opacity-0 data-starting-style:opacity-0 data-ending-style:duration-150 min-[500px]:w-(--popup-width)",
        className,
      )}
      {...props}
    />
  );
};
export namespace NavigationMenuPopup {
  export type Props = ComponentProps<typeof NavigationMenuPrimitive.Popup>;
  export type State = NavigationMenuPrimitive.Popup.State;
}

export const NavigationMenuArrow = ({
  className,
  classList,
  ...props
}: NavigationMenuArrow.Props): JSX.Element => {
  return (
    <NavigationMenuPrimitive.Arrow
      className={createClassName(
        "flex transition-[left] duration-[var(--duration)] ease-[var(--easing)] data-[side=bottom]:top-[-8px] data-[side=left]:right-[-13px] data-[side=top]:bottom-[-8px] data-[side=right]:left-[-13px] data-[side=left]:rotate-90 data-[side=right]:-rotate-90 data-[side=top]:rotate-180",
        className,
        classList?.root,
      )}
      {...props}
    >
      <NavigationMenuArrowSvg className={classList?.arrow} />
    </NavigationMenuPrimitive.Arrow>
  );
};
export namespace NavigationMenuArrow {
  export type ClassListKey = "root" | "arrow";
  export type Props = {
    classList?: ClassList<ClassListKey>;
  } & ComponentProps<typeof NavigationMenuPrimitive.Arrow>;
  export type State = NavigationMenuPrimitive.Arrow.State;
}

const NavigationMenuArrowSvg = (props: ComponentProps<"svg">) => {
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

export const NavigationMenuViewport = ({
  className,
  ...props
}: NavigationMenuViewport.Props): JSX.Element => {
  return (
    <NavigationMenuPrimitive.Viewport
      className={createClassName(
        "relative h-full w-full overflow-hidden",
        className,
      )}
      {...props}
    />
  );
};
export namespace NavigationMenuViewport {
  export type Props = ComponentProps<typeof NavigationMenuPrimitive.Viewport>;
  export type State = NavigationMenuPrimitive.Viewport.State;
}

const triggerClassName =
  "box-border flex items-center justify-center gap-1.5 h-10 " +
  "px-2 xs:px-3.5 m-0 bg-background text-foreground font-medium " +
  "text-[0.925rem] xs:text-base leading-6 select-none no-underline " +
  "hover:bg-background-dimmed active:bg-background-dimmed data-popup-open:bg-background-dimmed " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-primary focus-visible:relative";

const contentClassName =
  "w-[calc(100vw_-_40px)] h-full p-4 xs:w-max xs:min-w-[400px] xs:w-max " +
  "transition-[opacity,transform,translate] duration-[var(--duration)] ease-[var(--easing)] " +
  "data-starting-style:opacity-0 data-ending-style:opacity-0 " +
  "data-starting-style:data-[activation-direction=left]:translate-x-[-50%] " +
  "data-starting-style:data-[activation-direction=right]:translate-x-[50%] " +
  "data-ending-style:data-[activation-direction=left]:translate-x-[50%] " +
  "data-ending-style:data-[activation-direction=right]:translate-x-[-50%]";

const linkCardClassName =
  "block p-2 xs:p-3 no-underline text-inherit " +
  "hover:bg-background-dimmed focus-visible:relative focus-visible:outline focus-visible:outline-2 " +
  "focus-visible:-outline-offset-1 focus-visible:outline-primary";
