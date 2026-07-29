// Suspense fallback for the connected playground, shared between the page's
// Suspense boundary and the segment's loading.tsx.
export const PlaygroundSkeleton = () => (
  <div className="flex flex-1 items-center justify-center p-8">
    <div className="w-full max-w-md space-y-3">
      <div className="h-4 w-40 animate-pulse bg-accent-foreground/30" />
      <div className="h-9 w-full animate-pulse bg-accent-foreground/20" />
      <div className="h-9 w-full animate-pulse bg-accent-foreground/30" />
    </div>
  </div>
);
