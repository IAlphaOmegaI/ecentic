export const DiscoverySkeleton = () => (
  <div className="flex flex-col gap-4 p-6 md:flex-row md:items-end">
    <div className="h-4 w-40 animate-pulse bg-accent-foreground/30" />
    <div className="h-9 flex-1 animate-pulse bg-accent-foreground/20" />
    <div className="h-9 w-40 animate-pulse bg-accent-foreground/30" />
  </div>
);
