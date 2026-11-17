export const ConversationQueueSkeleton = () => (
  <div aria-hidden className="animate-pulse motion-reduce:animate-none">
    <div className="flex gap-3 border-accent-foreground border-b px-4 py-5 sm:px-6">
      <div className="h-10 flex-1 rounded-sm bg-accent-foreground/40" />
      <div className="h-10 w-36 rounded-sm bg-accent-foreground/40" />
    </div>
    <div className="h-12 border-accent-foreground border-b bg-background" />
    {[1, 2, 3, 4, 5, 6].map((row) => (
      <div
        key={row}
        className="flex h-20 items-center gap-6 border-accent-foreground border-b px-4 sm:px-6"
      >
        <div className="h-8 flex-1 rounded-sm bg-accent-foreground/40" />
        <div className="h-6 w-28 rounded-sm bg-accent-foreground/40" />
        <div className="hidden h-6 w-32 rounded-sm bg-accent-foreground/40 sm:block" />
      </div>
    ))}
  </div>
);
export const ConversationDetailSkeleton = () => (
  <div aria-hidden className="animate-pulse motion-reduce:animate-none">
    <div className="space-y-3 border-accent-foreground border-b px-4 py-6 sm:px-6">
      <div className="h-7 w-72 max-w-full rounded-sm bg-accent-foreground/40" />
      <div className="h-5 w-48 rounded-sm bg-accent-foreground/40" />
    </div>
    <div className="grid xl:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="space-y-5 px-4 py-6 sm:px-6">
        <div className="h-56 rounded-sm bg-accent-foreground/40" />
        <div className="h-40 rounded-sm bg-accent-foreground/40" />
      </div>
      <div className="space-y-5 border-accent-foreground border-t px-4 py-6 sm:px-6 xl:border-t-0 xl:border-l">
        <div className="h-10 rounded-sm bg-accent-foreground/40" />
        <div className="h-72 rounded-sm bg-accent-foreground/40" />
      </div>
    </div>
  </div>
);
