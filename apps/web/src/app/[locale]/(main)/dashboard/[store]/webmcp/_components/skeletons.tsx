export const ScannerSkeleton = () => (
  <div
    aria-hidden
    className="animate-pulse bg-background-rich motion-reduce:animate-none"
  >
    <div className="border-accent-foreground border-b px-4 py-4 sm:px-6">
      <div className="h-4 w-48 max-w-full rounded-sm bg-foreground/10" />
    </div>
    <div className="grid lg:grid-cols-3">
      <div className="space-y-3 border-accent-foreground border-b px-4 py-6 sm:px-6 lg:border-r lg:border-b-0">
        <div className="size-4 rounded-sm bg-foreground/10" />
        <div className="h-8 w-48 max-w-full rounded-sm bg-foreground/10" />
        <div className="h-16 w-full rounded-sm bg-foreground/5" />
      </div>
      <div className="space-y-4 px-4 py-6 sm:px-6 lg:col-span-2">
        <div className="h-4 w-32 rounded-sm bg-foreground/10" />
        <div className="h-10 w-full rounded-lg bg-foreground/5" />
        <div className="h-10 w-40 rounded-lg bg-foreground/10" />
        <div className="h-12 w-full rounded-sm bg-foreground/5" />
      </div>
    </div>
    <div className="border-accent-foreground border-t px-4 py-4 sm:px-6">
      <div className="h-4 w-64 max-w-full rounded-sm bg-foreground/5" />
    </div>
  </div>
);
