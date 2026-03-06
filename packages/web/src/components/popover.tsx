import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import type { ClassList } from "@zenncore/utils";
import type { DistributiveOverride } from "@zenncore/utils/types";
import type { ComponentProps, JSX } from "react";
import { createClassName } from "../utils/helpers/class-name";

export const Popover: typeof PopoverPrimitive.Root = PopoverPrimitive.Root;
export namespace Popover {
  export type Props = ComponentProps<typeof PopoverPrimitive.Root>;
  export type State = PopoverPrimitive.Root.State;
  export type Actions = PopoverPrimitive.Root.Actions;
  export type ChangeEventDetails = PopoverPrimitive.Root.ChangeEventDetails;
  export type ChangeEventReason = PopoverPrimitive.Root.ChangeEventReason;
}

export const PopoverTrigger = ({
  className,
  ...props
}: PopoverTrigger.Props): JSX.Element => {
  return (
    <PopoverPrimitive.Trigger
      className={createClassName(
        "flex select-none items-center justify-center rounded-md border border-gray-200 bg-gray-50 px-2 text-gray-900 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-blue-800 focus-visible:-outline-offset-1 active:bg-gray-100 data-popup-open:bg-gray-100",
        className,
      )}
      {...props}
    />
  );
};
export namespace PopoverTrigger {
  export type Props = ComponentProps<typeof PopoverPrimitive.Trigger>;
  export type State = PopoverPrimitive.Trigger.State;
}

export const PopoverPositioner = ({
  container,
  keepMounted,
  sideOffset = 8,
  className,
  classList,
  ...props
}: PopoverPositioner.Props): JSX.Element => {
  return (
    <PopoverPrimitive.Portal
      container={container}
      keepMounted={keepMounted}
      className={classList?.portal}
    >
      {/* <PopoverPrimitive.Backdrop /> */}
      <PopoverPrimitive.Positioner
        sideOffset={sideOffset}
        className={createClassName(className, classList?.positioner)}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
};
export namespace PopoverPositioner {
  export type ClassListKey = "positioner" | "portal";
  export type Props = DistributiveOverride<
    ComponentProps<typeof PopoverPrimitive.Portal>,
    ComponentProps<typeof PopoverPrimitive.Positioner>
  > & {
    classList?: ClassList<ClassListKey>;
  };
  export type State = PopoverPrimitive.Positioner.State;
}

export const PopoverPopup = ({
  className,
  ...props
}: PopoverPopup.Props): JSX.Element => {
  return (
    <PopoverPrimitive.Popup
      className={createClassName(
        "origin-[var(--transform-origin)] rounded-lg bg-[canvas] px-6 py-4 text-gray-900 shadow-gray-200 shadow-lg outline-1 outline-gray-200 transition-[transform,scale,opacity] data-ending-style:scale-90 data-starting-style:scale-90 data-ending-style:opacity-0 data-starting-style:opacity-0 dark:shadow-none dark:outline-gray-300 dark:-outline-offset-1",
        className,
      )}
      {...props}
    />
  );
};
export namespace PopoverPopup {
  export type Props = ComponentProps<typeof PopoverPrimitive.Popup>;
  export type State = PopoverPrimitive.Popup.State;
}

export const PopoverArrow = ({
  className,
  classList,
  ...props
}: PopoverArrow.Props): JSX.Element => {
  return (
    <PopoverPrimitive.Arrow
      className={createClassName(
        "data-[side=bottom]:top-[-8px] data-[side=left]:right-[-13px] data-[side=top]:bottom-[-8px] data-[side=right]:left-[-13px] data-[side=left]:rotate-90 data-[side=right]:-rotate-90 data-[side=top]:rotate-180",
        className,
        classList?.root,
      )}
      {...props}
    >
      <PopoverArrowSvg className={classList?.arrow} />
    </PopoverPrimitive.Arrow>
  );
};
export namespace PopoverArrow {
  export type ClassListKey = "root" | "arrow";
  export type Props = {
    classList?: ClassList<ClassListKey>;
  } & ComponentProps<typeof PopoverPrimitive.Arrow>;
  export type State = PopoverPrimitive.Arrow.State;
}

const PopoverArrowSvg = (props: ComponentProps<"svg">) => {
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

export const PopoverTitle = ({
  className,
  ...props
}: PopoverTitle.Props): JSX.Element => {
  return (
    <PopoverPrimitive.Title
      className={createClassName("font-medium text-foreground", className)}
      {...props}
    />
  );
};
export namespace PopoverTitle {
  export type Props = ComponentProps<typeof PopoverPrimitive.Title>;
  export type State = PopoverPrimitive.Title.State;
}

export const PopoverDescription = ({
  className,
  ...props
}: PopoverDescription.Props): JSX.Element => {
  return (
    <PopoverPrimitive.Description
      className={createClassName("text-base text-foreground-dimmed", className)}
      {...props}
    />
  );
};
export namespace PopoverDescription {
  export type Props = ComponentProps<typeof PopoverPrimitive.Description>;
  export type State = PopoverPrimitive.Description.State;
}
