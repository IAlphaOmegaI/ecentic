import { Crosshair, StatusPill } from "../../_components/grid";
import { DiscoverySkeleton } from "./skeletons";

// Mirrors the discovery page shell so navigation lands without layout shift.
export default () => (
  <div className="flex flex-col">
    <div className="mx-8 border-accent-foreground border-x">
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="relative mx-8 flex flex-col gap-6 px-6 py-8 sm:flex-row sm:items-end sm:justify-between">
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <div>
            <StatusPill tone="neutral">
              AI Visibility — Store discovery
            </StatusPill>
            <h1 className="mt-3 font-bold text-[28px] text-foreground-rich tracking-[-0.02em]">
              AI Discovery
            </h1>
            <p className="mt-1 text-foreground-dimmed text-sm">
              See which stores AI shopping agents recommend for a query — and
              exactly why your store did or didn’t make the cut, and how it
              ranked.
            </p>
          </div>
        </div>
      </div>

      <div className="-mx-8 border-accent-foreground border-b">
        <div className="relative mx-8 bg-background-rich">
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <DiscoverySkeleton />
        </div>
      </div>
    </div>
  </div>
);
