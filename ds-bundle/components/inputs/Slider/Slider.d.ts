import * as React from "react";

/**
 * Slider — from @zenncore/web@0.0.0.
 * @replaces input[type=range]
 */
export interface SliderProps {
  classList?: {
    root?: string;
    track?: string;
    indicator?: string;
    thumb?: string;
    control?: string;
  };
  inputRef?: React.Ref;
  onThumbBlur?: FocusEventHandler<HTMLInputElement>;
  /** The uncontrolled value of the slider when it's initially rendered. To render a controlled slider, use the `value` prop i */
  defaultValue?: number | readonly number[];
  /** Whether the slider should ignore user interaction. */
  disabled?: boolean;
  /** Options to format the input value. */
  format?: Intl.NumberFormatOptions;
  /** The locale used by `Intl.NumberFormat` when formatting the value. Defaults to the user's runtime locale. */
  locale?: string | Intl.Locale | readonly (string | Intl.Locale)[];
  /** The maximum allowed value of the slider. Should not be equal to min. */
  max?: number;
  /** The minimum allowed value of the slider. Should not be equal to max. */
  min?: number;
  /** The minimum steps between values in a range slider. */
  minStepsBetweenValues?: number;
  /** Identifies the field when a form is submitted. */
  name?: string;
  /** Identifies the form that owns the slider inputs. Useful when the slider is rendered outside the form. */
  form?: string;
  /** The component orientation. */
  orientation?: "horizontal" | "vertical";
  /** The granularity with which the slider can step through values. (A "discrete" slider.) The `min` prop serves as the origi */
  step?: number;
  /** The granularity with which the slider can step through values when using Page Up/Page Down or Shift + Arrow Up/Arrow Dow */
  largeStep?: number;
  /** How the thumb(s) are aligned relative to `Slider.Control` when the value is at `min` or `max`: - `center`: The center of */
  thumbAlignment?: "center" | "edge" | "edge-client-only";
  /** Controls how thumbs behave when they collide during pointer interactions. - `'push'` (default): Thumbs push each other w */
  thumbCollisionBehavior?: "none" | "push" | "swap";
  /** The value of the slider. For ranged sliders, provide an array with two values. */
  value?: number | readonly number[];
  children?: React.ReactNode;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  id?: string;
  /** CSS class applied to the element, or a function that returns a class based on the component's state. */
  className?: string | ((state: SliderRootState) => string | undefined);
  /** Allows you to replace the component's HTML element with a different tag, or compose it with another component. Accepts a */
  render?:
    | ReactElement<unknown, string | JSXElementConstructor<any>>
    | ComponentRenderFn<HTMLProps, SliderRootState>;
  /** Style applied to the element, or a function that returns a style object based on the component's state. */
  style?:
    | CSSProperties
    | ((state: SliderRootState) => React.CSSProperties | undefined);
}

export declare const Slider: React.ComponentType<SliderProps>;
