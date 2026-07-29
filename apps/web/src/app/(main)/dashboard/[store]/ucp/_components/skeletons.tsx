// Suspense fallback for the structured-data section, shared between the
// page's Suspense boundary and the segment's loading.tsx.
export const UcpSectionSkeleton = () => (
  <div className="animate-pulse space-y-4">
    <div className="border border-accent-foreground bg-background-rich p-5">
      <div className="flex items-center gap-6">
        <div className="size-14 shrink-0 bg-accent-foreground/20" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-40 bg-accent-foreground/20" />
          <div className="h-3 w-72 bg-accent-foreground/10" />
        </div>
      </div>
    </div>

    <div className="flex border border-accent-foreground">
      <div className="h-9 w-36 bg-accent-foreground/20" />
      <div className="h-9 w-48 bg-accent-foreground/10" />
    </div>

    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="border border-accent-foreground bg-background-rich">
        <div className="border-accent-foreground border-b px-4 py-2.5">
          <div className="h-4 w-24 bg-accent-foreground/20" />
        </div>
        <div className="divide-y divide-accent-foreground">
          {Array.from({ length: 9 }).map((_, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
            <div key={index} className="flex items-center gap-3 px-4 py-2.5">
              <div className="size-1.5 shrink-0 bg-accent-foreground/30" />
              <div className="h-3 w-28 bg-accent-foreground/20" />
              <div className="h-7 flex-1 bg-accent-foreground/10" />
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <div className="h-72 border border-accent-foreground bg-background-rich" />
        <div className="h-32 border border-accent-foreground bg-background-rich" />
      </div>
    </div>
  </div>
);
