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
  "box-border inline-flex w-fit cursor-pointer items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-lg px-2.5 py-2 font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/15 active:scale-99",
  {
    variants: {
      variant: {
        default:
          "border bg-gradient-to-b py-1.5 inset-shadow-sm inset-shadow-background-rich/70 transition-all duration-300",
        flat: "px-4",
        soft: "text-primary backdrop-blur-lg",
        outline: "border px-4",
        ghost: "transition-colors duration-300",
      },
      size: {
        icon: "flex size-8 items-center justify-center p-2",
      },
      color: {
        primary: "text-background-rich",
        secondary: "text-background-rich",
        accent: "text-emphasis",
        emphasis: "text-accent",
        neutral: "text-background-rich",
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
        className:
          "border-primary from-primary-text/90 to-primary-text text-background-rich",
      },
      {
        variant: "default",
        color: "secondary",
        className:
          "border-secondary from-primary-text/90 to-primary-text text-background-rich",
      },
      {
        variant: "default",
        color: "neutral",
        className:
          "border-accent-foreground from-background-rich to-background-dimmed text-foreground",
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
          "border-accent-foreground from-background-rich to-background-dimmed text-foreground",
      },
      {
        variant: "default",
        color: "error",
        className:
          "border-error from-error to-error-dimmed text-background-rich",
      },
      {
        variant: "default",
        color: "success",
        className:
          "border-success from-success-dimmed to-success-dimmed text-background-rich",
      },
      {
        variant: "default",
        color: "warning",
        className:
          "border-warning from-warning-dimmed to-warning-dimmed text-background-rich",
      },
      {
        variant: "default",
        color: "info",
        className:
          "border-info from-primary-text/90 to-primary-text text-background-rich",
      },
      {
        variant: "flat",
        color: "accent",
        className: "bg-accent-rich text-emphasis-rich",
      },
      {
        variant: "flat",
        color: "emphasis",
        className: "bg-emphasis-rich text-background-rich",
      },
      {
        variant: "flat",
        color: "primary",
        className: "bg-primary-text text-background-rich",
      },
      {
        variant: "flat",
        color: "secondary",
        className: "bg-primary-text text-background-rich",
      },
      {
        variant: "flat",
        color: "error",
        className: "bg-error text-background-rich",
      },
      {
        variant: "flat",
        color: "info",
        className: "bg-primary-text text-background-rich",
      },
      {
        variant: "flat",
        color: "warning",
        className: "bg-warning-dimmed text-background-rich",
      },
      {
        variant: "flat",
        color: "success",
        className: "bg-success-dimmed text-background-rich",
      },
      {
        variant: "flat",
        color: "neutral",
        className: "bg-neutral text-background-rich",
      },
      {
        variant: "soft",
        color: "primary",
        className:
          "border-primary/60 bg-primary/10 text-primary-text hover:bg-primary/20",
      },
      {
        variant: "soft",
        color: "secondary",
        className:
          "border-secondary/60 bg-secondary/10 text-primary-text hover:bg-secondary/20",
      },
      {
        variant: "soft",
        color: "neutral",
        className:
          "border-neutral/60 bg-neutral/10 text-foreground hover:bg-neutral/20",
      },
      {
        variant: "soft",
        color: "info",
        className:
          "border-info/60 bg-info/10 text-primary-text hover:bg-info/20",
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
          "border-accent/60 bg-accent/10 text-foreground hover:bg-accent/20",
      },
      {
        variant: "soft",
        color: "error",
        className:
          "border-error/60 bg-error/10 text-error-dimmed hover:bg-error/20",
      },
      {
        variant: "soft",
        color: "success",
        className:
          "border-success/60 bg-success/10 text-success-dimmed hover:bg-success/20",
      },
      {
        variant: "soft",
        color: "warning",
        className:
          "border-warning/60 bg-warning/10 text-warning-dimmed hover:bg-warning/20",
      },

      {
        variant: "ghost",
        color: "primary",
        className: "bg-primary/0 text-primary-text hover:bg-primary/20",
      },
      {
        variant: "ghost",
        color: "secondary",
        className: "bg-secondary/0 text-primary-text hover:bg-secondary/20",
      },
      {
        variant: "ghost",
        color: "neutral",
        className: "bg-neutral/0 text-foreground hover:bg-neutral/20",
      },
      {
        variant: "ghost",
        color: "info",
        className: "bg-info/0 text-primary-text hover:bg-info/20",
      },
      {
        variant: "ghost",
        color: "emphasis",
        className: "bg-emphasis/0 text-emphasis-rich hover:bg-emphasis/20",
      },
      {
        variant: "ghost",
        color: "accent",
        className: "bg-accent/0 text-foreground hover:bg-accent/20",
      },
      {
        variant: "ghost",
        color: "error",
        className: "bg-error/0 text-error-dimmed hover:bg-error/20",
      },
      {
        variant: "ghost",
        color: "success",
        className: "bg-success/0 text-success-dimmed hover:bg-success/20",
      },
      {
        variant: "ghost",
        color: "warning",
        className: "bg-warning/0 text-warning-dimmed hover:bg-warning/20",
      },
      {
        variant: "outline",
        color: "primary",
        className: "border-primary text-primary-text hover:bg-primary/20",
      },
      {
        variant: "outline",
        color: "secondary",
        className: "border-secondary text-primary-text hover:bg-secondary/20",
      },
      {
        variant: "outline",
        color: "neutral",
        className: "border-neutral text-foreground hover:bg-neutral/20",
      },
      {
        variant: "outline",
        color: "info",
        className:
          "border-info border-info/60 text-primary-text hover:bg-info/20",
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
          "border-accent-foreground text-foreground hover:bg-accent/20",
      },
      {
        variant: "outline",
        color: "error",
        className: "border-error text-error-dimmed hover:bg-error/20",
      },
      {
        variant: "outline",
        color: "success",
        className: "border-success text-success-dimmed hover:bg-success/20",
      },
      {
        variant: "outline",
        color: "warning",
        className: "border-warning text-warning-dimmed hover:bg-warning/20",
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
