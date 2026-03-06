import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";
import { ChevronDownIcon } from "@zenncore/icons";
import { type ClassList, cn } from "@zenncore/utils";
import type { ComponentProps, JSX } from "react";
import { createClassName } from "../utils/helpers/class-name";

export const Accordion = ({
  className,
  ...props
}: Accordion.Props): JSX.Element => {
  return (
    <AccordionPrimitive.Root
      className={createClassName(
        "flex flex-col justify-center text-foreground-dimmed",
        className,
      )}
      {...props}
    />
  );
};
export namespace Accordion {
  export type Props = ComponentProps<typeof AccordionPrimitive.Root>;
  export type State = AccordionPrimitive.Root.State;
  export type ChangeEventDetails = AccordionPrimitive.Root.ChangeEventDetails;
  export type ChangeEventReason = AccordionPrimitive.Root.ChangeEventReason;
}

export const AccordionItem = ({
  className,
  ...props
}: AccordionItem.Props): JSX.Element => {
  return (
    <AccordionPrimitive.Item
      {...props}
      className={createClassName("border-accent-dimmed border-b", className)}
    />
  );
};
export namespace AccordionItem {
  export type Props = ComponentProps<typeof AccordionPrimitive.Item>;
  export type State = AccordionPrimitive.Item.State;
  export type ChangeEventDetails = AccordionPrimitive.Item.ChangeEventDetails;
  export type ChangeEventReason = AccordionPrimitive.Item.ChangeEventReason;
}

export const AccordionTrigger = ({
  className,
  children,
  classList,
  ...props
}: AccordionTrigger.Props): JSX.Element => {
  return (
    <AccordionPrimitive.Header
      className={createClassName("m-0", classList?.root)}
    >
      <AccordionPrimitive.Trigger
        className={createClassName(
          "group box-border flex w-full cursor-pointer items-baseline justify-between gap-4 border-0 px-0 py-2 text-left font-medium text-base text-foreground leading-6 outline-0 focus-visible:outline-1",
          className,
          classList?.trigger?.root,
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon
          className={cn(
            "mr-2 size-3 transition-all ease-out group-data-panel-open:rotate-90",
            classList?.trigger?.icon,
          )}
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
};
export namespace AccordionTrigger {
  export type ClassListKey = "root" | { trigger: "root" | "icon" };
  export type Props = {
    classList?: ClassList<ClassListKey>;
  } & ComponentProps<typeof AccordionPrimitive.Trigger>;
}

export const AccordionPanel = ({
  className,
  ...props
}: AccordionPanel.Props): JSX.Element => {
  return (
    <AccordionPrimitive.Panel
      className={createClassName(
        "h-[var(--accordion-panel-height)] overflow-hidden text-base text-foreground-dimmed transition-[height] ease-out data-ending-style:h-0 data-starting-style:h-0",
        className,
      )}
      {...props}
    />
  );
};
export namespace AccordionPanel {
  export type Props = ComponentProps<typeof AccordionPrimitive.Panel>;
  export type State = AccordionPrimitive.Panel.State;
}
