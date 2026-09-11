/**
 * The connect body while the entry cookie is read — the platform grid's shape,
 * so neither the grid nor the import panel shifts the layout when it lands.
 */
export const CatalogSkeleton = () => (
  <div
    aria-hidden
    className="grid grid-cols-2 gap-px bg-accent-foreground sm:grid-cols-3"
  >
    {Array.from({ length: 6 }, (_, index) => (
      <div
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder tiles
        key={index}
        className="flex aspect-square flex-col justify-between bg-background-dimmed p-5"
      >
        <div className="size-14 animate-pulse rounded-md bg-accent-foreground/60" />
        <div className="flex flex-col gap-2">
          <div className="h-5 w-2/3 animate-pulse rounded bg-accent-foreground/60" />
          <div className="h-4 w-full animate-pulse rounded bg-accent-foreground/40" />
        </div>
      </div>
    ))}
  </div>
);

export const FooterSkeleton = () => (
  <div
    aria-hidden
    className="h-10 w-32 animate-pulse rounded-md bg-accent-foreground/40"
  />
);
