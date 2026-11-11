import { cn, cva } from "@zenncore/utils";
import type { HTMLAttributes } from "react";
import { Plus } from "@/components/plus";

const calculator = cva(
  "relative min-w-0 border-accent-foreground bg-background-dimmed text-foreground-rich [&_div:has(>input)]:rounded-md [&_div:has(>input)]:bg-background-dimmed [&_input]:rounded-md [&_input]:text-base [&_input]:text-foreground-rich [&_label]:text-foreground-rich",
  {
    variants: { layout: { split: "grid lg:grid-cols-2", inline: "w-full" } },
    defaultVariants: { layout: "split" },
  },
);

const Root = ({ layout, className, children, ...props }: Calculator.Props) => (
  <div className={cn(calculator({ layout }), className)} {...props}>
    <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
    <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
    {children}
  </div>
);
const Fields = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("min-w-0 px-8 py-8 max-sm:px-4", className)} {...props} />
);
const Result = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "relative min-w-0 border-accent-foreground border-t px-8 py-8 max-sm:px-4 lg:border-t-0 lg:border-l",
      className,
    )}
    {...props}
  />
);

export const Calculator = { Root, Fields, Result };
export namespace Calculator {
  export type Props = HTMLAttributes<HTMLDivElement> & {
    layout?: "split" | "inline";
  };
}
