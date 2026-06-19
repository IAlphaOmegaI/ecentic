import {
  Crosshair,
  SectionKicker,
  StatusPill,
} from "../../dashboard/_components/grid";
import { FreeForAllClient } from "./_components/free-for-all-client";

export default () => (
  <div className="flex flex-col">
    <div className="mx-8 border-accent-foreground border-x">
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="relative mx-8 flex flex-col gap-6 px-6 py-8 sm:flex-row sm:items-end sm:justify-between">
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <div>
            <StatusPill tone="neutral">Sandbox — Free-for-all</StatusPill>
            <h1 className="mt-3 font-bold text-[28px] text-foreground-rich tracking-[-0.02em]">
              UCP Free-for-All
            </h1>
            <p className="mt-1 text-foreground-dimmed text-sm">
              Add any number of stores on a level playing field. The AI shopping
              agent evaluates and negotiates across every catalog, then picks the
              single product it would buy — and explains why it beat the rest.
            </p>
          </div>
        </div>
      </div>

      <div className="-mx-8 border-accent-foreground border-b">
        <div className="relative mx-8 bg-background-rich">
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <div className="border-accent-foreground border-b p-4">
            <SectionKicker>01 — Agent Decision</SectionKicker>
            <h2 className="mt-2 font-semibold text-foreground-rich text-lg">
              One Buyer Request, One Winning Product
            </h2>
          </div>
          <div className="p-6">
            <FreeForAllClient />
          </div>
        </div>
      </div>
    </div>
  </div>
);
