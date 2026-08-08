import type { ReactNode } from "react";
import { Crosshair, SectionGutter } from "../../../_components/grid";
import { OverviewDetails } from "../../../_components/overview-details";

// Sized to the "Run Simulation" button it stands in for.
export const OverviewActionsSkeleton = () => (
  <div className="h-9 w-40 animate-pulse bg-foreground/10" />
);

/**
 * The page's static frame, rendered by both `page.tsx` and `loading.tsx`.
 *
 * Every region that needs a query is a slot; the heading, the section chrome
 * and the tab rail need no data and prerender. The tabbed panel is rendered
 * here rather than passed in whole, so the loading state shows the real tabs
 * with placeholders inside them instead of a blank rectangle.
 */
export const OverviewShell = ({
  statusPill,
  actions,
  stats,
  performance,
  products,
  competitors,
  agents,
}: {
  statusPill: ReactNode;
  actions: ReactNode;
  stats: ReactNode;
  performance: ReactNode;
  products: ReactNode;
  competitors: ReactNode;
  agents: ReactNode;
}) => (
  <div className="flex flex-col">
    <div className="mx-8 border-accent-foreground border-x">
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="relative mx-8 flex flex-col gap-6 px-6 py-8 sm:flex-row sm:items-end sm:justify-between">
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <div>
            {statusPill}
            <h1 className="mt-3 font-bold text-3xl text-foreground-rich tracking-[-0.02em]">
              Overview
            </h1>
            <p className="mt-1 text-foreground-dimmed text-sm">
              How AI shopping agents rank your catalog against competitors.
            </p>
          </div>
          {actions}
        </div>
      </div>

      <div className="-mx-8 border-accent-foreground border-b">
        <div className="relative mx-8 bg-background-rich">
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          {stats}
        </div>
      </div>

      <SectionGutter />

      <div className="-mx-8 border-accent-foreground border-t border-b">
        <div className="relative mx-8 bg-background-rich">
          <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
          <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          {performance}
        </div>
      </div>

      <SectionGutter />

      {/* Top Products / Competitors / Agent Visits were three stacked
          always-open panels — ~6 screens of scroll. Now one tabbed panel. */}
      <div className="-mx-8 border-accent-foreground border-t border-b">
        <div className="relative mx-8 bg-background-rich">
          <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
          <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <OverviewDetails
            products={products}
            competitors={competitors}
            agents={agents}
          />
        </div>
      </div>
    </div>
  </div>
);
