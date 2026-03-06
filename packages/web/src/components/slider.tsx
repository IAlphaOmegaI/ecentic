import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import type { ClassList } from "@zenncore/utils";
import type { ComponentProps, JSX } from "react";
import { createClassName } from "../utils/helpers/class-name";

export const Slider = ({
  inputRef,
  className,
  classList,
  onThumbBlur,
  ...props
}: Slider.Props): JSX.Element => {
  const thumbCount = Array.isArray(props.value)
    ? props.value.length
    : Array.isArray(props.defaultValue)
      ? props.defaultValue.length
      : 1;

  return (
    <SliderPrimitive.Root
      className={createClassName(className, classList?.root)}
      {...props}
    >
      <SliderPrimitive.Control
        className={createClassName(
          "flex touch-none select-none items-center py-3",
          classList?.control,
        )}
      >
        <SliderPrimitive.Track
          className={createClassName(
            "h-2 w-full select-none rounded bg-background-rich shadow-[inset_0_0_0_1px] shadow-background-dimmed",
            classList?.track,
          )}
        >
          <SliderPrimitive.Indicator
            className={createClassName(
              "select-none rounded bg-primary",
              classList?.indicator,
            )}
          />
          {Array.from({ length: thumbCount }).map((_, index) => (
            <SliderPrimitive.Thumb
              // biome-ignore lint/suspicious/noArrayIndexKey: false positive
              key={index}
              index={index}
              inputRef={index === 0 ? inputRef : undefined}
              className={createClassName(
                "h-[calc(var(--spacing)*6-2px)] w-8 select-none rounded-full bg-background-rich outline-1 outline-accent-foreground focus-visible:outline-2 focus-visible:outline-primary",
                classList?.thumb,
              )}
              onBlur={onThumbBlur}
            />
          ))}
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
};

export namespace Slider {
  export type ClassListKey =
    | "root"
    | "control"
    | "track"
    | "indicator"
    | "thumb";
  export type Props = {
    classList?: ClassList<ClassListKey>;
    inputRef?: SliderPrimitive.Thumb.Props["inputRef"];
    onThumbBlur?: SliderPrimitive.Thumb.Props["onBlur"];
  } & ComponentProps<typeof SliderPrimitive.Root>;
  export type State = SliderPrimitive.Root.State;
  export type ChangeEventDetails = SliderPrimitive.Root.ChangeEventDetails;
  export type ChangeEventReason = SliderPrimitive.Root.ChangeEventReason;
  export type CommitEventDetails = SliderPrimitive.Root.CommitEventDetails;
  export type CommitEventReason = SliderPrimitive.Root.CommitEventReason;
}
