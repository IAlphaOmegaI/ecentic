import { Crosshair, SectionKicker, StatusPill } from "../../_components/grid";
import { UcpSectionSkeleton } from "./skeletons";

// Mirrors the UCP page's static shell so navigation renders the real header
// instantly while the structured-data section streams in.
export default () => (
  <div className="flex flex-col">
    <div className="mx-8 border-accent-foreground border-x">
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="relative mx-8 flex flex-col gap-6 px-6 py-8 sm:flex-row sm:items-end sm:justify-between">
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <div>
            <StatusPill tone="neutral">Universal Commerce Protocol</StatusPill>
            <h1 className="mt-3 font-bold text-[28px] text-foreground-rich tracking-[-0.02em]">
              UCP & Structured Data
            </h1>
            <p className="mt-1 text-foreground-dimmed text-sm">
              Your merchant identity for AI shopping agents.
            </p>
          </div>
        </div>
      </div>

      <div className="-mx-8 border-accent-foreground border-b">
        <div className="relative mx-8 bg-background-rich">
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <div className="border-accent-foreground border-b p-4">
            <SectionKicker>01 — Protocol</SectionKicker>
            <h2 className="mt-2 font-semibold text-foreground-rich text-lg">
              Structured Data
            </h2>
          </div>
          <div className="p-6">
            <UcpSectionSkeleton />
          </div>
        </div>
      </div>
    </div>
  </div>
);
