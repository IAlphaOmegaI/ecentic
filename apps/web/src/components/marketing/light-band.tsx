import { cn } from "@zenncore/utils";
import { Plus } from "@/components/plus";
import { MarketingFeatureBand } from "./primitives";

/** Light work surfaces keep the cutout and rail geometry without darkening prose. */
export const MarketingLightBand = ({
  children,
  tone = "light",
  className,
  ...props
}: MarketingLightBand.Props) => (
  <MarketingFeatureBand
    {...props}
    tone={tone}
    className={cn(
      "[&_.bg-background-dimmed.text-foreground-dimmed]:text-foreground [&_.bg-background-dimmed_.text-foreground-dimmed]:text-foreground [&_.bg-background-dimmed_dd]:text-foreground [&_[data-open]_.text-foreground-dimmed]:text-foreground [&_[role=tab][aria-selected=true]]:bg-primary-text! [&_[role=tab][aria-selected=true]]:text-background-rich! [&_[role=tab][aria-selected=true]_.marketing-status]:text-background-rich! [&_[role=tab][aria-selected=true]_.text-foreground-dimmed]:text-background-rich! [&_[role=tab]]:text-foreground",
      tone === "muted" && "[&_.text-foreground-dimmed]:text-foreground",
      className,
    )}
  >
    <div className="marketing-surface relative min-w-0 border-accent-foreground border-y">
      <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
      <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
      {children}
    </div>
  </MarketingFeatureBand>
);

export namespace MarketingLightBand {
  export type Props = Omit<MarketingFeatureBand.Props, "tone"> & {
    tone?: "light" | "muted";
  };
}

/** Cross marks at a full-width row's two rail junctions. */
export const MarketingEdgeCrosses = ({
  edge = "top",
  className,
}: {
  edge?: "top" | "bottom";
  className?: string;
}) => (
  <>
    <Plus
      className={cn(
        "left-0 -translate-x-1/2",
        edge === "top" ? "top-0 -translate-y-1/2" : "bottom-0 translate-y-1/2",
        className,
      )}
    />
    <Plus
      className={cn(
        "right-0 translate-x-1/2",
        edge === "top" ? "top-0 -translate-y-1/2" : "bottom-0 translate-y-1/2",
        className,
      )}
    />
  </>
);
