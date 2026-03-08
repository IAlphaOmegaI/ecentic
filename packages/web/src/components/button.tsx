import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { type ClassProp, cn, cva, type VariantProps } from "@zenncore/utils";
import type { Nullable } from "@zenncore/utils/types";
import type { ComponentProps, JSX } from "react";
import { resolveClassName } from "../utils/helpers/class-name";
import type { RenderComponentProps } from "../utils/types/render-component-props";

export type ButtonVariant = "default" | "soft" | "outline" | "ghost" | "flat";
export type ButtonSize = "icon";
export type ButtonColor =
  | "primary"
  | "secondary"
  | "accent"
  | "emphasis"
  | "neutral"
  | "error"
  | "success"
  | "warning"
  | "info";

type ButtonVariantsProps = {
  variant?: Nullable<ButtonVariant>;
  size?: Nullable<ButtonSize>;
  color?: Nullable<ButtonColor>;
  disabled?: Nullable<boolean>;
} & ClassProp;

export const buttonVariants: (props?: ButtonVariantsProps) => string = cva(
  "box-border inline-flex items-center gap-2 w-fit cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap px-2.5 py-2 transition-all duration-300 active:scale-99",
  {
    variants: {
      variant: {
        default:
          "border-[1.5px] bg-gradient-to-b py-1.5 shadow-[inset_0px_1px_1px_0px_rgba(255,255,255,0.7)] transition-all duration-300",
        flat: "px-4",
        soft: "text-primary backdrop-blur-lg",
        outline: "border px-4",
        ghost: "transition-colors duration-300",
      },
      size: {
        icon: "flex size-8 items-center justify-center p-2",
      },
      color: {
        primary: "text-white",
        secondary: "text-white",
        accent: "text-emphasis",
        emphasis: "text-accent",
        neutral: "text-white",
        error: "text-error-foreground",
        success: "text-success-foreground",
        warning: "text-warning-foreground",
        info: "text-info-foreground",
      },
      disabled: {
        true: "cursor-not-allowed opacity-50",
      },
    },
    compoundVariants: [
      {
        variant: "default",
        color: "primary",
        className: "border-primary from-primary-rich to-primary text-white",
      },
      {
        variant: "default",
        color: "secondary",
        className:
          "border-secondary from-secondary-rich to-secondary text-white",
      },
      {
        variant: "default",
        color: "neutral",
        className: "border-neutral from-neutral-rich to-neutral text-white",
      },
      {
        variant: "default",
        color: "emphasis",
        className:
          "border-emphasis from-emphasis-rich to-emphasis text-background-rich",
      },
      {
        variant: "default",
        color: "accent",
        className:
          "border-accent from-accent-rich to-accent text-emphasis-rich",
      },
      {
        variant: "default",
        color: "error",
        className: "border-error from-error-rich to-error text-white",
      },
      {
        variant: "default",
        color: "success",
        className: "border-success from-success-rich to-success text-white",
      },
      {
        variant: "default",
        color: "warning",
        className: "border-warning from-warning-rich to-warning text-white",
      },
      {
        variant: "default",
        color: "info",
        className: "border-info from-info-rich to-info text-white",
      },
      {
        variant: "flat",
        color: "accent",
        className: "bg-accent-rich text-emphasis-rich",
      },
      {
        variant: "flat",
        color: "emphasis",
        className: "bg-emphasis-rich text-accent-rich",
      },
      {
        variant: "flat",
        color: "primary",
        className: "bg-primary text-white",
      },
      {
        variant: "flat",
        color: "secondary",
        className: "bg-secondary text-white",
      },
      {
        variant: "flat",
        color: "error",
        className: "bg-error text-white",
      },
      {
        variant: "flat",
        color: "info",
        className: "bg-info text-white",
      },
      {
        variant: "flat",
        color: "warning",
        className: "bg-warning text-white",
      },
      {
        variant: "flat",
        color: "success",
        className: "bg-success text-white",
      },
      {
        variant: "flat",
        color: "neutral",
        className: "bg-neutral text-white",
      },
      {
        variant: "soft",
        color: "primary",
        className:
          "border-primary/60 bg-primary/10 text-primary-rich hover:bg-primary/20",
      },
      {
        variant: "soft",
        color: "secondary",
        className:
          "border-secondary/60 bg-secondary/10 text-secondary-rich hover:bg-secondary/20",
      },
      {
        variant: "soft",
        color: "neutral",
        className:
          "border-neutral/60 bg-neutral/10 text-neutral-rich hover:bg-neutral/20",
      },
      {
        variant: "soft",
        color: "info",
        className: "border-info/60 bg-info/10 text-info-rich hover:bg-info/20",
      },
      {
        variant: "soft",
        color: "emphasis",
        className:
          "border-emphasis/60 bg-emphasis/10 text-emphasis-rich hover:bg-emphasis/20",
      },
      {
        variant: "soft",
        color: "accent",
        className:
          "border-accent/60 bg-accent/10 text-accent-rich hover:bg-accent/20",
      },
      {
        variant: "soft",
        color: "error",
        className:
          "border-error/60 bg-error/10 text-error-rich hover:bg-error/20",
      },
      {
        variant: "soft",
        color: "success",
        className:
          "border-success/60 bg-success/10 text-success-rich hover:bg-success/20",
      },
      {
        variant: "soft",
        color: "warning",
        className:
          "border-warning/60 bg-warning/10 text-warning-rich hover:bg-warning/20",
      },

      {
        variant: "ghost",
        color: "primary",
        className: "bg-primary/0 text-primary-rich hover:bg-primary/20",
      },
      {
        variant: "ghost",
        color: "secondary",
        className: "bg-secondary/0 text-secondary-rich hover:bg-secondary/20",
      },
      {
        variant: "ghost",
        color: "neutral",
        className: "bg-neutral/0 text-neutral-rich hover:bg-neutral/20",
      },
      {
        variant: "ghost",
        color: "info",
        className: "bg-info/0 text-info-rich hover:bg-info/20",
      },
      {
        variant: "ghost",
        color: "emphasis",
        className: "bg-emphasis/0 text-emphasis-rich hover:bg-emphasis/20",
      },
      {
        variant: "ghost",
        color: "accent",
        className: "bg-accent/0 text-accent-rich hover:bg-accent/20",
      },
      {
        variant: "ghost",
        color: "error",
        className: "bg-error/0 text-error-rich hover:bg-error/20",
      },
      {
        variant: "ghost",
        color: "success",
        className: "bg-success/0 text-success-rich hover:bg-success/20",
      },
      {
        variant: "ghost",
        color: "warning",
        className: "bg-warning/0 text-warning-rich hover:bg-warning/20",
      },
      {
        variant: "outline",
        color: "primary",
        className: "border-primary text-primary-rich hover:bg-primary/20",
      },
      {
        variant: "outline",
        color: "secondary",
        className: "border-secondary text-secondary-rich hover:bg-secondary/20",
      },
      {
        variant: "outline",
        color: "neutral",
        className: "border-neutral text-neutral-rich hover:bg-neutral/20",
      },
      {
        variant: "outline",
        color: "info",
        className: "border-info border-info/60 text-info-rich hover:bg-info/20",
      },
      {
        variant: "outline",
        color: "emphasis",
        className: "border-emphasis text-emphasis-rich hover:bg-emphasis/20",
      },
      {
        variant: "outline",
        color: "accent",
        className:
          "border-accent-foreground text-accent-rich hover:bg-accent/20",
      },
      {
        variant: "outline",
        color: "error",
        className: "border-error text-error-rich hover:bg-error/20",
      },
      {
        variant: "outline",
        color: "success",
        className: "border-success text-success-rich hover:bg-success/20",
      },
      {
        variant: "outline",
        color: "warning",
        className: "border-warning text-warning-rich hover:bg-warning/20",
      },
    ],
  },
);

export const Button = ({
  render,
  size,
  variant = "default",
  color = "primary",
  className,
  ...props
}: Button.Props): JSX.Element => {
  const state: Button.State = {
    disabled: Boolean(props.disabled),
  };

  const element = useRender({
    // defaultTagName: "button",
    render: render ?? <ButtonPrimitive />,
    props: mergeProps<typeof ButtonPrimitive>(props, {
      className: cn(
        buttonVariants({ variant, size, color, disabled: props.disabled }),
        resolveClassName(className, state),
      ),
    }),
    state,
  });

  return element;
};
export namespace Button {
  export type Props = RenderComponentProps<
    "button",
    { disabled: boolean },
    ButtonPrimitive.Props,
    ComponentProps<typeof ButtonPrimitive>
  > &
    VariantProps<typeof buttonVariants>;
  export type State = ButtonPrimitive.State;
}
