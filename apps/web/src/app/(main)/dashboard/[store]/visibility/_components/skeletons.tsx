export const AuditSkeleton = () => (
  <div className="flex flex-col divide-y divide-accent-foreground">
    {(["a", "b", "c", "d", "e"] as const).map((key) => (
      <div key={key} className="flex flex-col gap-2 p-4">
        <div className="h-4 w-56 animate-pulse bg-foreground/10" />
        <div className="h-3 w-full animate-pulse bg-foreground/10" />
        <div className="h-3 w-2/3 animate-pulse bg-foreground/10" />
      </div>
    ))}
  </div>
);
