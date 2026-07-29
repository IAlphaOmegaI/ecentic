import { Crosshair, SectionGutter } from "../../../../_components/grid";

// Suspense fallback for the product detail page, shared with loading.tsx so
// the route-level skeleton and the streamed page render the exact same shapes.
export const PageSkeleton = () => (
  <>
    {/* Header skeleton */}
    <div className="-mx-8 border-accent-foreground border-b">
      <div className="mx-8 flex flex-col gap-6 px-6 py-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="h-5 w-56 animate-pulse rounded-full bg-foreground/10" />
          <div className="mt-3 h-9 w-64 animate-pulse bg-foreground/10" />
          <div className="mt-2 h-5 w-40 animate-pulse bg-foreground/10" />
        </div>
        <div className="flex shrink-0 gap-2">
          <div className="h-9 w-36 animate-pulse bg-foreground/10" />
          <div className="h-9 w-28 animate-pulse bg-foreground/10" />
          <div className="h-9 w-24 animate-pulse bg-foreground/10" />
        </div>
      </div>
    </div>

    {/* Stats skeleton */}
    <div className="-mx-8 border-accent-foreground border-b">
      <div className="relative mx-8 bg-background-rich">
        <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
        <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
        <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-2 xl:grid-cols-4">
          {(["a", "b", "c", "d"] as const).map((key) => (
            <div
              key={key}
              className="relative flex h-44 flex-col justify-between bg-background-rich p-5"
            >
              <div className="flex items-center justify-between">
                <div className="h-3 w-28 animate-pulse bg-foreground/10" />
                <div className="absolute top-5 right-5 size-7.5 animate-pulse bg-foreground/10" />
              </div>
              <div>
                <div className="h-10 w-24 animate-pulse bg-foreground/10" />
                <div className="mt-3 h-4 w-32 animate-pulse bg-foreground/10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

    <SectionGutter />

    {/* Tabs skeleton */}
    <div className="-mx-8 border-accent-foreground border-t border-b">
      <div className="mx-8 bg-background-rich">
        <div className="p-4">
          <div className="h-11 w-full animate-pulse rounded-lg bg-foreground/10" />
        </div>
        <div className="grid grid-cols-1 gap-px bg-accent-foreground lg:grid-cols-4">
          {(["a", "b", "c", "d"] as const).map((key) => (
            <div
              key={key}
              className="relative flex h-44 flex-col justify-between bg-background-rich p-5"
            >
              <div className="flex items-center justify-between">
                <div className="h-3 w-20 animate-pulse bg-foreground/10" />
                <div className="absolute top-5 right-5 size-7.5 animate-pulse bg-foreground/10" />
              </div>
              <div>
                <div className="h-10 w-20 animate-pulse bg-foreground/10" />
                <div className="mt-3 h-1 w-full animate-pulse rounded-full bg-foreground/10" />
                <div className="mt-2 h-4 w-32 animate-pulse bg-foreground/10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </>
);
