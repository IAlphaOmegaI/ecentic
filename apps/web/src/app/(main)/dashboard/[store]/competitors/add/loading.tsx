import { Crosshair, SectionGutter } from "../../../_components/grid";

// Mirrors the page's static shell so navigation lands without layout shift:
// the heading is real, and only the regions the page streams are placeholders.
export default () => (
  <div className="flex flex-col">
    <div className="mx-8 border-accent-foreground border-x">
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="relative mx-8 flex flex-col gap-6 px-6 py-8 sm:flex-row sm:items-end sm:justify-between">
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <div>
            <div className="h-5 w-56 animate-pulse rounded-full bg-foreground/10" />
            <h1 className="mt-3 font-bold text-[28px] text-foreground-rich tracking-[-0.02em]">
              Add Competitors
            </h1>
            <p className="mt-1 text-foreground-dimmed text-sm">
              The brands this store's catalog is judged against. Competitors
              belong to one store, so these never mix with your other stores.
            </p>
          </div>
          <div className="h-9 w-40 animate-pulse bg-foreground/10" />
        </div>
      </div>

      <SectionGutter /> 

      <div className="-mx-8 border-accent-foreground border-t border-b">
        <div className="relative mx-8 bg-background-rich">
          <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
          <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <div className="flex flex-col gap-6 bg-background-rich p-6">
            <div className="flex flex-col gap-2">
              <div className="h-3 w-28 animate-pulse bg-foreground/10" />
              <div className="h-6 w-44 animate-pulse bg-foreground/10" />
              <div className="h-4 w-full max-w-2xl animate-pulse bg-foreground/10" />
              <div className="h-4 w-2/3 max-w-2xl animate-pulse bg-foreground/10" />
            </div>
            <div className="h-9 w-32 animate-pulse bg-foreground/10" />
          </div>
        </div>
      </div>
    </div>
  </div>
);
