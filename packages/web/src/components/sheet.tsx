import { mergeProps, useRender } from "@base-ui/react";
import { Dialog as SheetPrimitive } from "@base-ui/react/dialog";
import { XIcon } from "@zenncore/icons";
import { type ClassList, cn } from "@zenncore/utils";
import type { ComponentProps, JSX } from "react";
import { createClassName } from "../utils/helpers/class-name";
import type { RenderComponentProps } from "../utils/types/render-component-props";

export const Sheet: typeof SheetPrimitive.Root = SheetPrimitive.Root;
export namespace Sheet {
  export type Props = ComponentProps<typeof SheetPrimitive.Root>;
  export type Actions = SheetPrimitive.Root.Actions;
  export type ChangeEventDetails = SheetPrimitive.Root.ChangeEventDetails;
  export type ChangeEventReason = SheetPrimitive.Root.ChangeEventReason;
}

export const SheetTrigger: typeof SheetPrimitive.Trigger =
  SheetPrimitive.Trigger;
export namespace SheetTrigger {
  export type Props = ComponentProps<typeof SheetPrimitive.Trigger>;
  export type State = SheetPrimitive.Trigger.State;
}

export const SheetClose: typeof SheetPrimitive.Close = SheetPrimitive.Close;
export namespace SheetClose {
  export type Props = ComponentProps<typeof SheetPrimitive.Close>;
  export type State = SheetPrimitive.Close.State;
}

export const SheetPopup = ({
  children,
  container,
  keepMounted,
  side = "right",
  className,
  classList,
  ...props
}: SheetPopup.Props): JSX.Element => {
  return (
    <SheetPrimitive.Portal container={container} keepMounted={keepMounted}>
      <SheetPrimitive.Backdrop
        className={createClassName(
          "fixed inset-0 bg-black/50 transition-all duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0",
          classList?.backdrop,
        )}
      />
      <SheetPrimitive.Popup
        className={createClassName(
          "fixed z-50 flex max-h-screen flex-col gap-4 bg-accent text-popover-foreground shadow-lg outline-hidden transition ease-in-out data-closed:duration-300 data-open:duration-500",
          side === "right" &&
            "inset-y-0 right-0 h-full w-3/4 origin-right border-l data-ending-style:translate-x-full data-starting-style:translate-x-full sm:max-w-sm",
          side === "left" &&
            "inset-y-0 left-0 h-full w-3/4 origin-left border-r data-ending-style:-translate-x-full data-starting-style:-translate-x-full sm:max-w-sm",
          side === "top" &&
            "inset-x-0 top-0 mx-auto h-auto w-screen origin-top border-b data-ending-style:-translate-y-full data-starting-style:-translate-y-full",
          side === "bottom" &&
            "inset-x-0 bottom-0 mx-auto h-auto w-screen origin-bottom border-t data-ending-style:translate-y-full data-starting-style:translate-y-full",
          className,
          classList?.root,
          {
            "rounded-l-lg": side === "right",
          },
        )}
        {...props}
      >
        {children}
        <SheetPrimitive.Close
          className={createClassName(
            "absolute top-4 right-4 rounded-xs text-muted-foreground opacity-50 ring-offset-popover transition-opacity hover:opacity-100 focus:outline-hidden focus:ring-[3px] focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
            classList?.close?.root,
          )}
        >
          <XIcon className={cn("size-4", classList?.close?.icon)} />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Popup>
    </SheetPrimitive.Portal>
  );
};
export namespace SheetPopup {
  export type ClassListKey = "root" | "backdrop" | { close: "root" | "icon" };
  export type Props = {
    side?: "top" | "right" | "bottom" | "left";
    classList?: ClassList<ClassListKey>;
  } & ComponentProps<typeof SheetPrimitive.Popup> &
    ComponentProps<typeof SheetPrimitive.Portal>;
  export type State = SheetPrimitive.Popup.State;
}

export const SheetHeader = ({
  render,
  className,
  ...props
}: SheetHeader.Props): JSX.Element => {
  const element = useRender({
    defaultTagName: "div",
    render,
    props: mergeProps<"div">(props, {
      className: cn("flex flex-col gap-1.5 p-4", className),
    }),
  });

  return element;
};
export namespace SheetHeader {
  export type Props = RenderComponentProps<"div">;
}

export const SheetTitle = ({
  className,
  ...props
}: SheetTitle.Props): JSX.Element => {
  return (
    <SheetPrimitive.Title
      {...props}
      className={createClassName("font-semibold text-foreground", className)}
    />
  );
};
export namespace SheetTitle {
  export type Props = ComponentProps<typeof SheetPrimitive.Title>;
  export type State = SheetPrimitive.Title.State;
}

export const SheetDescription = ({
  className,
  ...props
}: SheetDescription.Props): JSX.Element => {
  return (
    <SheetPrimitive.Description
      {...props}
      className={createClassName("text-foreground-dimmed text-sm", className)}
    />
  );
};
export namespace SheetDescription {
  export type Props = ComponentProps<typeof SheetPrimitive.Description>;
  export type State = SheetPrimitive.Description.State;
}

export const SheetFooter = ({
  render,
  className,
  ...props
}: SheetFooter.Props): JSX.Element => {
  const element = useRender({
    defaultTagName: "div",
    render,
    props: mergeProps<"div">(props, {
      className: cn("mt-auto flex flex-col gap-2 p-4", className),
    }),
  });

  return element;
};
export namespace SheetFooter {
  export type Props = RenderComponentProps<"div">;
}
