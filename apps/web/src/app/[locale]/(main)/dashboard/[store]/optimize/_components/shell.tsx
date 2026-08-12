import { Crosshair, SectionGutter } from "../../../_components/grid";

export const OptimizeSkeleton = () => (
  <>
    <div className="-mx-8 border-accent-foreground border-b">
      <div className="relative mx-8 flex flex-col gap-6 px-6 py-8 sm:flex-row sm:items-end sm:justify-between">
        <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
        <div>
          <div className="h-5 w-44 animate-pulse rounded-full bg-foreground/10" />
          <div className="mt-3 h-8 w-64 animate-pulse bg-foreground/10" />
          <div className="mt-2 h-4 w-80 animate-pulse bg-foreground/10" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="h-9 w-44 animate-pulse rounded-md bg-foreground/10" />
          <div className="h-9 w-36 animate-pulse rounded-md bg-foreground/10" />
        </div>
      </div>
    </div>

    <div className="-mx-8 border-accent-foreground border-b">
      <div className="relative mx-8 bg-background-rich">
        <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
        <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-3">
          {(["a", "b", "c"] as const).map((key) => (
            <div
              key={key}
              className="relative flex h-44 flex-col justify-between bg-background-rich p-5"
            >
              <div className="flex items-center justify-between">
                <div className="h-3 w-32 animate-pulse bg-foreground/10" />
                <div className="absolute top-5 right-5 size-7.5 animate-pulse bg-foreground/10" />
              </div>
              <div className="h-10 w-16 animate-pulse bg-foreground/10" />
            </div>
          ))}
        </div>
      </div>
    </div>

    <SectionGutter />

    <div className="-mx-8 border-accent-foreground border-t border-b">
      <div className="relative mx-8 bg-background-rich">
        <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
        <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
        <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
        <div className="border-accent-foreground border-b p-4">
          <div className="h-3 w-44 animate-pulse bg-foreground/10" />
          <div className="mt-2 h-6 w-56 animate-pulse bg-foreground/10" />
          <div className="mt-2 h-4 w-96 max-w-full animate-pulse bg-foreground/10" />
        </div>
        <div className="grid grid-cols-1 gap-px border-accent-foreground border-b bg-accent-foreground sm:grid-cols-3">
          {(["a", "b", "c"] as const).map((key) => (
            <div
              key={key}
              className="relative flex h-36 flex-col justify-between bg-background-rich p-5"
            >
              <div className="h-3 w-28 animate-pulse bg-foreground/10" />
              <div className="h-8 w-16 animate-pulse bg-foreground/10" />
            </div>
          ))}
        </div>
        <div className="h-72 animate-pulse bg-foreground/[0.04] p-4" />
        <div className="flex flex-col gap-px border-accent-foreground border-t bg-accent-foreground">
          {(["d", "e", "f"] as const).map((key) => (
            <div key={key} className="bg-background-rich px-5 py-4">
              <div className="h-5 w-48 animate-pulse bg-foreground/10" />
              <div className="mt-2 h-3 w-full animate-pulse bg-foreground/10" />
            </div>
          ))}
        </div>
      </div>
    </div>

    <SectionGutter />

    <div className="-mx-8 border-accent-foreground border-t border-b">
      <div className="relative mx-8 bg-background-rich">
        <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
        <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
        <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
        <div className="border-accent-foreground border-b p-4">
          <div className="h-3 w-44 animate-pulse bg-foreground/10" />
          <div className="mt-2 h-6 w-56 animate-pulse bg-foreground/10" />
        </div>
        <div className="flex flex-col gap-3 p-4">
          {(["g", "h", "i"] as const).map((key) => (
            <div
              key={key}
              className="border border-accent-foreground bg-background-rich p-4"
            >
              <div className="h-5 w-48 animate-pulse bg-foreground/10" />
              <div className="mt-2 h-3 w-full animate-pulse bg-foreground/10" />
              <div className="mt-1 h-3 w-3/4 animate-pulse bg-foreground/10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </>
);
