import { cn } from "@zenncore/utils";
import { MarketingFeatureBand } from "@/components/marketing/primitives";

/** The same interactive records, adapted to the illuminated workbench surface. */
export const SolutionFeatureBand = ({
  className,
  ...props
}: MarketingFeatureBand.Props) => (
  <MarketingFeatureBand
    {...props}
    data-solution-feature
    className={cn(
      "[&_.bg-accent-foreground]:bg-background-rich/15 [&_.bg-background-dimmed]:bg-emphasis [&_.bg-background-rich]:bg-emphasis-rich [&_.bg-background]:bg-emphasis-dimmed [&_.bg-foreground-dimmed]:bg-background-rich/35 [&_.border-accent-foreground]:border-background-rich/15 [&_.text-foreground-dimmed]:text-background-rich/65 [&_.text-foreground-rich]:text-background-rich [&_.text-primary-text]:text-primary-rich [&_:is(button,a):focus-visible]:outline-primary-rich [&_:not(a,button).text-foreground]:text-background-rich/85 [&_[role=tab][aria-selected=true]]:bg-primary-dimmed! [&_[role=tab][aria-selected=true]]:text-background-rich!",
      className,
    )}
  />
);
