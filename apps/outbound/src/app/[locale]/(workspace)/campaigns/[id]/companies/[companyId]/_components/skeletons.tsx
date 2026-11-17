export const ContactSkeleton = () => (
  <div aria-hidden className="motion-safe:animate-pulse">
    <div className="flex items-center justify-between gap-4 border-accent-foreground border-b px-4 py-4 sm:px-6">
      <div className="space-y-2">
        <div className="h-6 w-48 rounded-sm bg-accent-foreground/40" />
        <div className="h-4 w-36 rounded-sm bg-accent-foreground/40" />
      </div>
      <div className="h-10 w-32 rounded-sm bg-accent-foreground/40" />
    </div>
    <div className="space-y-4 px-4 py-6 sm:px-6">
      <div className="h-4 w-3/4 rounded-sm bg-accent-foreground/40" />
      <div className="flex gap-2">
        <div className="h-10 w-32 rounded-sm bg-accent-foreground/40" />
        <div className="h-10 w-40 rounded-sm bg-accent-foreground/40" />
      </div>
    </div>
  </div>
);
