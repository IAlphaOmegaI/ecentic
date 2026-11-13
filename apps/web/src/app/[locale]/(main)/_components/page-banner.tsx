import { cn } from "@zenncore/utils";
import type { ReactNode } from "react";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import { MarketingHero } from "@/components/marketing/primitives";

/** Keep dedicated content pages on the same hero as the public marketing pages. */
export const PageBanner = ({
  title,
  accent,
  description,
  badge,
  identity,
  meta,
  actions,
  assurances,
  artwork,
  illustration,
  compact = false,
}: PageBanner.Props) => (
  <MarketingHero
    title={[title.trim(), accent?.trim()].filter(Boolean).join(" ")}
    description={description}
    dark={!compact}
    artwork={compact ? undefined : artwork}
    identity={identity}
    illustration={
      illustration ??
      (!compact &&
      (!artwork || artwork === "commerce" || artwork === "console") ? (
        <div className="relative flex min-h-80 w-full items-center justify-center self-stretch overflow-hidden bg-linear-to-br from-background-rich/8 via-transparent to-emphasis-dimmed/15 max-sm:min-h-64">
          <EvolvingAscii
            artwork="catalogCommerce"
            className="aspect-[3/2] h-auto w-full text-background-rich"
          />
        </div>
      ) : undefined)
    }
    meta={
      badge || meta ? (
        <>
          {badge}
          {meta && (
            <div
              className={cn(
                "text-sm",
                compact ? "text-foreground-dimmed" : "text-background-rich/85",
              )}
            >
              {meta}
            </div>
          )}
        </>
      ) : undefined
    }
    actionsSlot={actions}
  >
    {assurances && assurances.length > 0 && (
      <p
        className={cn(
          "mt-6 text-sm",
          compact ? "text-foreground-dimmed" : "text-background-rich/85",
        )}
      >
        {assurances.join(" · ")}
      </p>
    )}
  </MarketingHero>
);

export namespace PageBanner {
  export type Props = {
    title: string;
    description: string;
    accent?: string;
    /** Accepted for content compatibility; page titles establish the hierarchy. */
    eyebrow?: string;
    badge?: ReactNode;
    /** Large unframed provider/program mark above the page title. */
    identity?: ReactNode;
    meta?: ReactNode;
    actions?: ReactNode;
    assurances?: readonly string[];
    artwork?: EvolvingAscii.Kind;
    illustration?: ReactNode;
    /** Reference, legal, and tool pages lead directly into their reading surface. */
    compact?: boolean;
  };
}
