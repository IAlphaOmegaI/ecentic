import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import type { ClassList } from "@zenncore/utils";
import type { DistributiveOverride } from "@zenncore/utils/types";
import type { ComponentProps, JSX } from "react";
import { createClassName } from "../utils/helpers/class-name";

export const TooltipProvider: typeof TooltipPrimitive.Provider =
  TooltipPrimitive.Provider;
export namespace TooltipProvider {
  export type Props = ComponentProps<typeof TooltipPrimitive.Provider>;
}

export const Tooltip: typeof TooltipPrimitive.Root = TooltipPrimitive.Root;
export namespace Tooltip {
  export type Props = ComponentProps<typeof TooltipPrimitive.Root>;
  export type State = TooltipPrimitive.Root.State;
  export type Actions = TooltipPrimitive.Root.Actions;
  export type OpenChangeEventDetails = TooltipPrimitive.Root.ChangeEventDetails;
  export type ChangeEventReason = TooltipPrimitive.Root.ChangeEventReason;
}

export const TooltipTrigger = ({
  className,
  ...props
}: TooltipTrigger.Props): JSX.Element => {
  return (
    <TooltipPrimitive.Trigger
      className={createClassName(
        "flex size-8 select-none items-center justify-center rounded-sm text-gray-900 hover:bg-gray-100 focus-visible:bg-none focus-visible:outline-2 focus-visible:outline-blue-800 focus-visible:-outline-offset-1 active:bg-gray-200 data-popup-open:bg-gray-100 focus-visible:[&:not(:hover)]:bg-transparent",
        className,
      )}
      {...props}
    />
  );
};
export namespace TooltipTrigger {
  export type Props = ComponentProps<typeof TooltipPrimitive.Trigger>;
  export type State = TooltipPrimitive.Trigger.State;
}

export const TooltipPositioner = ({
  container,
  keepMounted,
  sideOffset = 10,
  className,
  classList,
  ...props
}: TooltipPositioner.Props): JSX.Element => {
  return (
    <TooltipPrimitive.Portal
      container={container}
      keepMounted={keepMounted}
      className={classList?.portal}
    >
      <TooltipPrimitive.Positioner
        sideOffset={sideOffset}
        className={createClassName(className, classList?.positioner)}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
};
export namespace TooltipPositioner {
  export type ClassListKey = "positioner" | "portal";
  export type Props = DistributiveOverride<
    ComponentProps<typeof TooltipPrimitive.Portal>,
    ComponentProps<typeof TooltipPrimitive.Positioner>
  > & {
    classList?: ClassList<ClassListKey>;
  };
  export type State = TooltipPrimitive.Positioner.State;
}

export const TooltipPopup = ({
  className,
  ...props
}: TooltipPopup.Props): JSX.Element => {
  return (
    <TooltipPrimitive.Popup
      className={createClassName(
        "flex origin-[var(--transform-origin)] flex-col rounded-md bg-[canvas] px-2 py-1 text-sm shadow-gray-200 shadow-lg outline-1 outline-gray-200 transition-[transform,scale,opacity] data-ending-style:scale-90 data-starting-style:scale-90 data-ending-style:opacity-0 data-starting-style:opacity-0 data-instant:duration-0 dark:shadow-none dark:outline-gray-300 dark:-outline-offset-1",
        className,
      )}
      {...props}
    />
  );
};
export namespace TooltipPopup {
  export type Props = ComponentProps<typeof TooltipPrimitive.Popup>;
  export type State = TooltipPrimitive.Popup.State;
}

export const TooltipArrow = ({
  className,
  classList,
  ...props
}: TooltipArrow.Props): JSX.Element => {
  return (
    <TooltipPrimitive.Arrow
      className={createClassName(
        "data-[side=bottom]:top-[-8px] data-[side=left]:right-[-13px] data-[side=top]:bottom-[-8px] data-[side=right]:left-[-13px] data-[side=left]:rotate-90 data-[side=right]:-rotate-90 data-[side=top]:rotate-180",
        className,
        classList?.root,
      )}
      {...props}
    >
      <TooltipArrowSvg className={classList?.arrow} />
    </TooltipPrimitive.Arrow>
  );
};
export namespace TooltipArrow {
  export type ClassListKey = "root" | "arrow";
  export type Props = {
    classList?: ClassList<ClassListKey>;
  } & ComponentProps<typeof TooltipPrimitive.Arrow>;
  export type State = TooltipPrimitive.Arrow.State;
}

const TooltipArrowSvg = (props: ComponentProps<"svg">) => {
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
