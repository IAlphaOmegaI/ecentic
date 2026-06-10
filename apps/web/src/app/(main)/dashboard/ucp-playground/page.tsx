import { Crosshair, SectionKicker } from "../_components/grid";
import { PlaygroundClient } from "./_components/playground-client";

export default () => (
  <div className="flex flex-col">
    <div className="mx-8 border-accent-foreground border-x">
      {/* Title */}
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="mx-8 flex flex-col gap-6 px-6 py-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5 text-foreground-dimmed text-xs uppercase tracking-[0.2em]">
              <span className="size-2 bg-accent-rich" />
              Sandbox — UCP flow testing
            </div>
            <h1 className="mt-3 font-medium text-4xl text-foreground">
              UCP Playground
            </h1>
            <p className="mt-1 font-light text-foreground-dimmed text-lg">
              Test catalog search, product lookup, and cart operations against
              any store.
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
            <h2 className="mt-2 font-medium text-2xl text-foreground">
              Agent Run
            </h2>
          </div>
          <div className="p-6">
            <PlaygroundClient />
          </div>
        </div>
      </div>
    </div>
  </div>
);
