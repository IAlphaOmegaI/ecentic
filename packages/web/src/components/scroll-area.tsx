import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";
import type { ClassList } from "@zenncore/utils";
import type { ComponentProps, JSX } from "react";
import { createClassName } from "../utils/helpers/class-name";

export const ScrollArea = ({
  children,
  className,
  classList,
  ...props
}: ScrollArea.Props): JSX.Element => {
  return (
    <ScrollAreaPrimitive.Root
      className={createClassName(className, classList?.root)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        className={createClassName(
          "size-full overscroll-contain -outline-offset-1",
          classList?.viewport,
        )}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar classList={classList?.scrollBar} />
      {/* TODO: add classList for corner */}
      <ScrollAreaPrimitive.Corner className="size-8 bg-primary" />
    </ScrollAreaPrimitive.Root>
  );
};
export namespace ScrollArea {
  export type ClassListKey =
    | "root"
    | "viewport"
    | { scrollBar: ScrollBar.ClassListKey };
  export type Props = {
    classList?: ClassList<ClassListKey>;
  } & ComponentProps<typeof ScrollAreaPrimitive.Root>;
  export type State = ScrollAreaPrimitive.Root.State;
}

export const ScrollBar = ({
  className,
  classList,
  ...props
}: ScrollBar.Props): JSX.Element => {
  return (
    <ScrollAreaPrimitive.Scrollbar
      className={createClassName(
        "m-2 flex w-1 justify-center rounded bg-gray-200 opacity-0 transition-opacity delay-300 data-hovering:opacity-100 data-scrolling:opacity-100 data-hovering:delay-0 data-scrolling:delay-0 data-hovering:duration-75 data-scrolling:duration-75",
        className,
        classList?.root,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb
        className={createClassName(
          "w-full rounded bg-gray-500",
          classList?.thumb,
        )}
      />
    </ScrollAreaPrimitive.Scrollbar>
  );
};
export namespace ScrollBar {
  export type ClassListKey = "root" | "thumb";
  export type Props = {
    classList?: ClassList<ClassListKey>;
  } & ComponentProps<typeof ScrollAreaPrimitive.Scrollbar>;
  export type State = ScrollAreaPrimitive.Scrollbar.State;
}
