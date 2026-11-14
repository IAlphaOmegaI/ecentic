export const OverviewSummarySkeleton = () => (
  <div
    aria-hidden
    className="min-w-0 bg-background motion-reduce:[&_*]:animate-none"
  >
    <div className="min-h-24 shrink-0 border-accent-foreground border-b bg-primary/5 px-5 py-5 sm:px-6">
      <div className="h-7 w-28 animate-pulse bg-foreground/10 motion-reduce:animate-none" />
      <div className="mt-1.5 h-5 w-full animate-pulse bg-foreground/10 motion-reduce:animate-none" />
    </div>
    <div className="grid min-w-0 divide-y divide-accent-foreground lg:grid-cols-3 lg:divide-x lg:divide-y-0">
      {["fields", "compare", "optimize"].map((key) => (
        <div
          key={key}
          className="flex min-h-28 min-w-0 gap-3.5 px-5 py-4 sm:px-6"
        >
          <div className="mt-0.5 size-7 shrink-0 animate-pulse rounded-sm bg-primary/15" />
          <div className="min-w-0 flex-1">
            <div className="h-5 w-4/5 animate-pulse bg-foreground/10" />
            <div className="mt-1 h-5 w-full animate-pulse bg-foreground/5" />
            <div className="mt-2 h-5 w-3/5 animate-pulse bg-primary/10" />
          </div>
        </div>
      ))}
    </div>
  </div>
);
