export const ScannerSkeleton = () => (
  <div aria-hidden="true" className="bg-background-rich">
    <div className="border-accent-foreground border-b px-6 py-4 sm:px-8">
      <div className="h-4 w-48 rounded bg-accent-foreground/40" />
    </div>
    <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_2fr]">
      <div className="space-y-4">
        <div className="size-4 rounded bg-accent-foreground/40" />
        <div className="h-8 w-48 rounded bg-accent-foreground/40" />
        <div className="h-16 w-full rounded bg-accent-foreground/20" />
      </div>
      <div className="space-y-4">
        <div className="h-4 w-32 rounded bg-accent-foreground/40" />
        <div className="h-10 w-full rounded bg-accent-foreground/20" />
        <div className="h-8 w-full rounded bg-accent-foreground/20" />
        <div className="h-10 w-40 rounded bg-accent-foreground/40" />
        <div className="h-8 w-full rounded bg-accent-foreground/20" />
      </div>
    </div>
    <div className="border-accent-foreground border-t px-6 py-4 sm:px-8">
      <div className="h-4 w-64 rounded bg-accent-foreground/20" />
    </div>
  </div>
);
