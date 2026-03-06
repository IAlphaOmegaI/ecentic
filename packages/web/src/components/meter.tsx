import { Meter as MeterPrimitive } from "@base-ui/react/meter";
import type { ClassList } from "@zenncore/utils";
import type { ComponentProps, JSX } from "react";
import { createClassName } from "../utils/helpers/class-name";

export const Meter = ({
  children,
  className,
  classList,
  ...props
}: Meter.Props): JSX.Element => {
  return (
    <MeterPrimitive.Root
      className={createClassName(className, classList?.root)}
      {...props}
    >
      {children}
      <MeterPrimitive.Track
        className={createClassName(
          "h-1 overflow-hidden rounded bg-gray-200 shadow-[inset_0_0_0_1px] shadow-gray-200",
          classList?.track,
        )}
      >
        <MeterPrimitive.Indicator
          className={createClassName(
            "bg-primary transition-all duration-500",
            classList?.indicator,
          )}
        />
      </MeterPrimitive.Track>
    </MeterPrimitive.Root>
  );
};
export namespace Meter {
  export type ClassListKey = "root" | "track" | "indicator";
  export type Props = {
    classList?: ClassList<ClassListKey>;
  } & ComponentProps<typeof MeterPrimitive.Root>;
  export type State = MeterPrimitive.Root.State;
}

export const MeterLabel = ({
  className,
  ...props
}: MeterLabel.Props): JSX.Element => {
  return (
    <MeterPrimitive.Label
      className={createClassName(
        "font-medium text-foreground-dimmed text-sm",
        className,
      )}
      {...props}
    />
  );
};
export namespace MeterLabel {
  export type Props = ComponentProps<typeof MeterPrimitive.Label>;
}

export const MeterValue = ({
  className,
  ...props
}: MeterValue.Props): JSX.Element => {
  return (
    <MeterPrimitive.Value
      className={createClassName(
        "font-medium text-foreground-dimmed text-sm",
        className,
      )}
      {...props}
    />
  );
};
export namespace MeterValue {
  export type Props = ComponentProps<typeof MeterPrimitive.Value>;
}
