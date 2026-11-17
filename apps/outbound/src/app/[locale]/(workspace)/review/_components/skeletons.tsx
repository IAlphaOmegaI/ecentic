export const ReviewQueueSkeleton = () => (
  <div
    aria-hidden
    className="animate-pulse bg-background-rich motion-reduce:animate-none"
  >
    <div className="flex flex-wrap gap-4 border-accent-foreground border-b px-4 py-4 sm:px-6">
      <div className="h-10 w-80 max-w-full rounded-sm bg-accent-foreground/40" />
      <div className="h-10 w-40 rounded-sm bg-accent-foreground/40" />
    </div>
    <div className="border-accent-foreground border-b px-4 py-4 sm:px-6">
      <div className="h-4 w-32 rounded-sm bg-accent-foreground/40" />
    </div>
    {[1, 2, 3, 4, 5, 6].map((row) => (
      <div
        key={row}
        className="grid grid-cols-3 gap-6 border-accent-foreground border-b px-4 py-5 sm:px-6"
      >
        <div className="space-y-2">
          <div className="h-4 w-3/4 rounded-sm bg-accent-foreground/40" />
          <div className="h-3 w-1/2 rounded-sm bg-accent-foreground/40" />
        </div>
        <div className="h-4 rounded-sm bg-accent-foreground/40" />
        <div className="h-5 w-20 rounded-sm bg-accent-foreground/40" />
      </div>
    ))}
  </div>
);

export const ReviewDetailSkeleton = () => (
  <div
    aria-hidden
    className="animate-pulse bg-background-rich motion-reduce:animate-none"
  >
    <div className="border-accent-foreground border-b px-4 py-4 sm:px-6">
      <div className="h-10 w-40 rounded-sm bg-accent-foreground/40" />
    </div>
    <div className="space-y-3 border-accent-foreground border-b px-4 py-6 sm:px-6">
      <div className="h-6 w-48 rounded-sm bg-accent-foreground/40" />
      <div className="h-4 w-64 rounded-sm bg-accent-foreground/40" />
    </div>
    <div className="grid gap-8 px-4 py-6 sm:px-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="space-y-6">
        <div className="h-10 rounded-sm bg-accent-foreground/40" />
        <div className="h-40 rounded-sm bg-accent-foreground/40" />
        <div className="h-24 rounded-sm bg-accent-foreground/40" />
      </div>
      <div className="space-y-4">
        <div className="h-4 w-32 rounded-sm bg-accent-foreground/40" />
        <div className="h-24 rounded-sm bg-accent-foreground/40" />
      </div>
    </div>
  </div>
);
