/**
 * The connect body while the entry cookie is read — the platform grid's shape,
 * so neither the grid nor the import panel shifts the layout when it lands.
 */
export const CatalogSkeleton = () => (
  <div aria-hidden>
    <div className="border-accent-foreground border-b bg-background-rich px-6 py-4 sm:px-8">
      <div className="h-12 w-full animate-pulse rounded-lg bg-accent-foreground/40" />
    </div>
    <div className="border-accent-foreground border-b bg-background px-6 py-4 sm:px-8">
      <div className="h-6 w-40 animate-pulse rounded-sm bg-accent-foreground/60" />
    </div>
    <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-2">
      {Array.from({ length: 4 }, (_, index) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder tiles
          key={index}
          className="flex min-h-48 flex-col justify-between bg-background-rich px-6 py-6 sm:px-8"
        >
          <div className="h-8 w-24 animate-pulse rounded-sm bg-accent-foreground/60" />
          <div className="flex flex-col gap-2">
            <div className="h-6 w-2/3 animate-pulse rounded-sm bg-accent-foreground/60" />
            <div className="h-4 w-full animate-pulse rounded-sm bg-accent-foreground/40" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const FooterSkeleton = () => (
  <div
    aria-hidden
    className="h-10 w-32 animate-pulse rounded-sm bg-accent-foreground/40"
  />
);
