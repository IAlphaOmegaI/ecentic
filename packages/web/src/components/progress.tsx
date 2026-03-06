import { Progress as ProgressPrimitive } from "@base-ui/react/progress";
import type { ClassList } from "@zenncore/utils";
import type { ComponentProps, JSX } from "react";
import { createClassName } from "../utils/helpers/class-name";

export const Progress = ({
  children,
  className,
  classList,
  ...props
}: Progress.Props): JSX.Element => {
  return (
    <ProgressPrimitive.Root
      className={createClassName(className, classList?.root)}
      {...props}
    >
      {children}
      <ProgressPrimitive.Track
        className={createClassName(
          "h-1 overflow-hidden rounded bg-gray-200 shadow-[inset_0_0_0_1px] shadow-gray-200",
          classList?.track,
        )}
      >
        <ProgressPrimitive.Indicator
          className={createClassName(
            "bg-primary transition-all duration-500",
            classList?.indicator,
          )}
        />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  );
};
export namespace Progress {
  export type ClassListKey = "root" | "track" | "indicator";
  export type Props = {
    classList?: ClassList<ClassListKey>;
  } & ComponentProps<typeof ProgressPrimitive.Root>;
  export type State = ProgressPrimitive.Root.State;
}

export const ProgressLabel = ({
  className,
  ...props
}: ProgressLabel.Props): JSX.Element => {
  return (
    <ProgressPrimitive.Label
      className={createClassName(
        "font-medium text-gray-900 text-sm",
        className,
      )}
      {...props}
    />
  );
};
export namespace ProgressLabel {
  export type Props = ComponentProps<typeof ProgressPrimitive.Label>;
}

export const ProgressValue = ({
  className,
  ...props
}: ProgressValue.Props): JSX.Element => {
  return (
    <ProgressPrimitive.Value
      className={createClassName(
        "font-medium text-gray-900 text-sm",
        className,
      )}
      {...props}
    />
  );
};
export namespace ProgressValue {
  export type Props = ComponentProps<typeof ProgressPrimitive.Value>;
}
