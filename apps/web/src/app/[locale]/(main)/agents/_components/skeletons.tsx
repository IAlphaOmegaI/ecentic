export const RunSkeleton = () => (
  <div aria-hidden="true">
    <div className="flex items-center justify-between gap-4 border-accent-foreground border-b bg-background-rich px-6 py-5 sm:px-8">
      <div className="h-6 w-56 rounded bg-accent-foreground/40" />
      <div className="h-9 w-40 rounded-md bg-accent-foreground/20" />
    </div>
    <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-3">
      <div className="flex flex-col gap-3 bg-background-dimmed px-6 py-6 sm:px-8">
        <div className="h-4 w-24 rounded bg-accent-foreground/40" />
        <div className="h-10 w-16 rounded bg-accent-foreground/40" />
      </div>
      <div className="flex flex-col gap-3 bg-background-dimmed px-6 py-6 sm:px-8">
        <div className="h-4 w-24 rounded bg-accent-foreground/40" />
        <div className="h-10 w-16 rounded bg-accent-foreground/40" />
      </div>
      <div className="flex flex-col gap-3 bg-background-dimmed px-6 py-6 sm:px-8">
        <div className="h-4 w-24 rounded bg-accent-foreground/40" />
        <div className="h-10 w-16 rounded bg-accent-foreground/40" />
      </div>
    </div>
    <div className="flex flex-col gap-2 border-accent-foreground border-t bg-background px-6 py-6 sm:px-8">
      <div className="h-4 w-72 max-w-full rounded bg-accent-foreground/20" />
      <div className="h-4 w-60 max-w-full rounded bg-accent-foreground/20" />
    </div>
  </div>
);
