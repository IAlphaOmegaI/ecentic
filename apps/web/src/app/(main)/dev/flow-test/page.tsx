import {
  Crosshair,
  SectionKicker,
  StatusPill,
} from "../../dashboard/_components/grid";
import { FlowTester } from "./_components/flow-tester";

export default () => (
  <div className="flex flex-col">
    <div className="mx-8 border-accent-foreground border-x">
      {/* Title */}
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="mx-8 flex flex-col gap-6 px-6 py-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="mt-3 font-bold text-[28px] text-foreground-rich tracking-[-0.02em]">
              UCP Flow Tester
            </h1>
            <p className="mt-1 text-foreground-dimmed text-sm">
              Test catalog search, product lookup, cart, and checkout operations
              against any UCP-compliant store.
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="relative mx-8 bg-background-rich">
          <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
          <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
          <div className="border-accent-foreground border-b p-4">
            <SectionKicker>01 — Flow Test</SectionKicker>
            <h2 className="mt-2 font-semibold text-foreground-rich text-lg">
              Agent Run
            </h2>
          </div>
          <div className="p-6">
            <FlowTester />
          </div>
        </div>
      </div>
    </div>
  </div>
);
