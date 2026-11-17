export const WarmupSkeleton = () => (
  <div aria-hidden className="motion-safe:animate-pulse">
    <div className="space-y-4 border-accent-foreground border-b px-4 py-6 sm:px-6">
      <div className="h-5 w-48 rounded-sm bg-accent-foreground/40" />
      <div className="h-4 w-3/4 rounded-sm bg-accent-foreground/40" />
      <div className="h-10 w-40 rounded-sm bg-accent-foreground/40" />
    </div>
    {[1, 2, 3, 4, 5].map((row) => (
      <div
        key={row}
        className="grid grid-cols-3 gap-6 border-accent-foreground border-b px-4 py-6 sm:px-6"
      >
        <div className="h-4 w-3/4 rounded-sm bg-accent-foreground/40" />
        <div className="h-4 w-1/2 rounded-sm bg-accent-foreground/40" />
        <div className="h-4 w-2/3 rounded-sm bg-accent-foreground/40" />
      </div>
    ))}
  </div>
);
