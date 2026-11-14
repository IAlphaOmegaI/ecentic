export const OverviewPerformanceSkeleton = () => (
  <section aria-hidden className="flex min-w-0 flex-col">
    <div className="min-h-36 px-6 pt-5 pb-4">
      <div className="h-5 w-40 animate-pulse bg-foreground/10" />
      <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-2">
        <div className="h-12 w-28 animate-pulse bg-foreground/10" />
        <div className="mb-1 h-5 w-48 max-w-full animate-pulse bg-foreground/5" />
      </div>
      <div className="mt-3 h-4 w-72 max-w-full animate-pulse bg-foreground/5" />
    </div>
    <div className="h-48 px-4 pb-4 sm:h-52 sm:px-6">
      <div className="flex h-full flex-col pb-6 pl-10">
        {[0, 25, 50, 75, 100].map((tick) => (
          <div
            key={tick}
            className="relative flex-1 border-accent-foreground/50 border-t last:flex-none"
          >
            <div className="absolute top-0 -left-10 h-3 w-6 -translate-y-1/2 animate-pulse bg-foreground/5" />
          </div>
        ))}
      </div>
      <div className="-mt-4 flex justify-between pl-10">
        {["first", "middle", "last"].map((position) => (
          <div
            key={position}
            className="h-3 w-10 animate-pulse bg-foreground/5"
          />
        ))}
      </div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-accent-foreground border-t px-6 py-3">
      <div className="max-w-full">
        <div className="h-3 w-60 max-w-full animate-pulse bg-foreground/5" />
        <div className="mt-1 h-3 w-48 max-w-full animate-pulse bg-foreground/5" />
      </div>
      <div className="h-8 w-32 animate-pulse bg-foreground/10" />
    </div>
  </section>
);

export const OverviewRecentScansSkeleton = () => (
  <section aria-hidden className="min-w-0 bg-background-rich">
    <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="size-6 animate-pulse bg-primary/15" />
        <div className="h-7 w-32 animate-pulse bg-foreground/10" />
      </div>
      <div className="h-9 w-40 animate-pulse bg-foreground/10" />
    </div>
    <div className="divide-y divide-accent-foreground border-accent-foreground border-t">
      {["latest", "previous", "earlier"].map((scan) => (
        <div key={scan} className="flex min-w-0 items-center gap-4 px-6 py-4">
          <div className="mt-1 size-6 shrink-0 animate-pulse bg-primary/15" />
          <div className="min-w-0 flex-1">
            <div className="h-4 w-72 max-w-full animate-pulse bg-foreground/10" />
            <div className="mt-1 h-4 w-48 max-w-full animate-pulse bg-foreground/5" />
          </div>
        </div>
      ))}
    </div>
  </section>
);
