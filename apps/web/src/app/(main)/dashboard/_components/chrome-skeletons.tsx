import { Crosshair, SectionGutter } from "./grid";

// Mirrors SidebarNav's items: same count and order, widths sized to each
// label, badges on the rows that render one (Products, Optimize, UCP & Data).
const navPlaceholders = [
  { key: "overview", width: "w-20" },
  { key: "products", width: "w-16", badge: true },
  { key: "competitors", width: "w-24" },
  { key: "simulations", width: "w-22" },
  { key: "discovery", width: "w-24" },
  { key: "optimize", width: "w-16", badge: true },
  { key: "visibility", width: "w-18" },
  { key: "ucp", width: "w-20", badge: true },
  { key: "ucp-playground", width: "w-28" },
  { key: "ucp-comparison", width: "w-30" },
] as const;

export const SidebarSkeleton = () => (
  <aside className="relative hidden w-60 flex-col overflow-hidden border-accent-foreground border-r bg-background-rich md:flex">
    <div className="flex h-14 items-center justify-center overflow-hidden border-accent-foreground border-b pr-22 pl-5">
      <div className="h-7 w-full animate-pulse bg-accent-foreground/30" />
    </div>

    <div className="border-accent-foreground border-b p-2">
      <div className="flex w-full items-center gap-2.5 border border-accent-foreground bg-background px-2.5 py-2">
        <div className="size-8 shrink-0 animate-pulse border border-accent-foreground bg-background-rich" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="h-3.5 w-24 animate-pulse bg-accent-foreground/30" />
          <div className="h-2.5 w-16 animate-pulse bg-accent-foreground/30" />
        </div>
        <div className="size-4 shrink-0 animate-pulse bg-accent-foreground/30" />
      </div>
    </div>

    <nav className="relative flex flex-1 flex-col">
      {navPlaceholders.map((item) => (
        <div
          key={item.key}
          className="flex h-10 items-center gap-2.5 border-transparent border-l-[3px] px-5"
        >
          <div className="size-4 shrink-0 animate-pulse bg-accent-foreground/30" />
          <div
            className={`h-4 animate-pulse bg-accent-foreground/30 ${item.width}`}
          />
          {"badge" in item && item.badge && (
            <div className="ml-auto h-4 w-7 animate-pulse rounded-full bg-accent-foreground/30" />
          )}
        </div>
      ))}

      <div className="mt-auto border-accent-foreground border-t">
        <div className="flex h-10 items-center gap-2.5 border-transparent border-l-[3px] px-5">
          <div className="size-4 shrink-0 animate-pulse bg-accent-foreground/30" />
          <div className="h-4 w-16 animate-pulse bg-accent-foreground/30" />
        </div>
      </div>
    </nav>
  </aside>
);

export const TopbarSkeleton = () => (
  <header className="flex h-14 shrink-0 items-center justify-between border-accent-foreground border-b bg-background-rich px-8">
    <div className="flex max-w-md flex-1 items-center gap-2">
      <div className="flex h-9 flex-1 items-center gap-2 rounded-lg border border-accent-foreground bg-background px-3">
        <div className="size-4 shrink-0 animate-pulse bg-accent-foreground/30" />
        <div className="h-4 w-24 animate-pulse bg-accent-foreground/30" />
        <div className="ml-auto h-4 w-8 animate-pulse rounded bg-accent-foreground/30" />
      </div>
    </div>
    <div className="flex items-center gap-3">
      <div className="flex size-8 items-center justify-center">
        <div className="size-6 animate-pulse bg-accent-foreground/30" />
      </div>
      <div className="h-5 w-16 animate-pulse bg-accent-foreground/30" />
      <div className="flex items-center gap-2.5">
        <div className="size-8 animate-pulse rounded-md bg-accent-foreground/30" />
        <div className="hidden h-4 w-28 animate-pulse bg-accent-foreground/30 md:block" />
      </div>
    </div>
  </header>
);

export const StatsSkeleton = () => (
  <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-2 xl:grid-cols-4">
    {(["a", "b", "c", "d"] as const).map((key) => (
      <div
        key={key}
        className="relative flex h-44 flex-col justify-between bg-background-rich p-5"
      >
        <div className="flex items-center justify-between">
          <div className="h-3 w-28 animate-pulse bg-foreground/10" />
          <div className="absolute top-5 right-5 size-7.5 animate-pulse bg-foreground/10" />
        </div>
        <div>
          <div className="h-11 w-24 animate-pulse bg-foreground/10" />
          <div className="mt-3 h-4 w-32 animate-pulse bg-foreground/10" />
        </div>
      </div>
    ))}
  </div>
);

export const ChartSkeleton = () => (
  <div className="grid grid-cols-1 gap-px bg-accent-foreground xl:grid-cols-3">
    <div className="bg-background-rich xl:col-span-2">
      <div className="p-4">
        <div className="h-3 w-32 animate-pulse bg-foreground/10" />
        <div className="mt-2 h-8 w-44 animate-pulse bg-foreground/10" />
      </div>

      <div className="grid grid-cols-4 divide-x divide-accent-foreground border-accent-foreground border-y">
        {(["GPT-4", "Claude", "Gemini", "Perplexity"] as const).map((model) => (
          <div key={model} className="p-6">
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-8 animate-pulse bg-foreground/10" />
                <div className="h-3.5 w-14 animate-pulse bg-foreground/10" />
              </div>
              <div className="flex items-baseline gap-0.5">
                <div className="h-9 w-10 animate-pulse bg-foreground/10" />
                <div className="h-4 w-3 animate-pulse bg-foreground/10" />
              </div>
            </div>
            <div className="mt-3 h-1 w-full animate-pulse bg-foreground/10" />
          </div>
        ))}
      </div>

      <div className="p-4">
        <div className="mb-3 h-3 w-24 animate-pulse bg-foreground/10" />
        <div className="h-56 w-full animate-pulse bg-foreground/10" />
      </div>
    </div>

    <div className="flex flex-col gap-px bg-accent-foreground">
      <div className="flex-1 bg-background-rich">
        <div className="px-4 pt-4 pb-2">
          <div className="h-3.5 w-24 animate-pulse bg-foreground/10" />
        </div>
        <div className="flex flex-col">
          {(["a", "b", "c"] as const).map((key) => (
            <div
              key={key}
              className="flex items-start gap-3 border-accent-foreground border-b p-4 last:border-b-0"
            >
              <div className="mt-0.5 size-8 shrink-0 animate-pulse bg-foreground/10" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-full animate-pulse bg-foreground/10" />
                <div className="h-3 w-4/5 animate-pulse bg-foreground/10" />
                <div className="h-2.5 w-14 animate-pulse bg-foreground/10" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between bg-background-rich p-4">
        <div className="h-9 w-28 animate-pulse bg-foreground/10" />
        <div className="h-9 w-36 animate-pulse bg-foreground/10" />
      </div>
    </div>
  </div>
);

export const CompetitorTableSkeleton = () => (
  <div>
    <div className="flex items-center justify-between border-accent-foreground border-b p-4">
      <div className="space-y-2">
        <div className="h-3 w-40 animate-pulse bg-foreground/10" />
        <div className="h-6 w-36 animate-pulse bg-foreground/10" />
      </div>
      <div className="h-9 w-24 animate-pulse bg-foreground/10" />
    </div>
    <div className="overflow-x-auto bg-background-rich">
      <table className="w-full">
        <thead>
          <tr className="border-accent-foreground border-b">
            {["Brand", "Win Rate", "Simulations", "Last Updated", ""].map(
              (header) => (
                <th key={header} className="px-4 py-3 text-left">
                  {header && (
                    <div className="h-3 w-14 animate-pulse bg-foreground/10" />
                  )}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {(["a", "b", "c", "d", "e"] as const).map((key) => (
            <tr
              key={key}
              className="border-accent-foreground border-b last:border-b-0"
            >
              <td className="px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="size-9 shrink-0 animate-pulse bg-foreground/10" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-28 animate-pulse bg-foreground/10" />
                    <div className="h-3 w-16 animate-pulse bg-foreground/10" />
                  </div>
                </div>
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                  <div className="h-1 w-20 animate-pulse bg-foreground/10" />
                  <div className="h-4 w-9 animate-pulse bg-foreground/10" />
                </div>
              </td>
              <td className="px-4 py-4">
                <div className="h-4 w-10 animate-pulse bg-foreground/10" />
              </td>
              <td className="px-4 py-4">
                <div className="h-4 w-20 animate-pulse bg-foreground/10" />
              </td>
              <td className="px-4 py-4">
                <div className="size-9 animate-pulse bg-foreground/10" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div className="flex items-center justify-between border-accent-foreground border-t p-4">
      <div className="h-4 w-24 animate-pulse bg-foreground/10" />
      <div className="flex gap-2">
        <div className="h-9 w-9 animate-pulse bg-foreground/10" />
        <div className="h-9 w-9 animate-pulse bg-foreground/10" />
      </div>
    </div>
  </div>
);

export const TableSkeleton = () => (
  <div>
    <div className="flex items-center justify-between border-accent-foreground border-b p-4">
      <div className="space-y-2">
        <div className="h-3 w-32 animate-pulse bg-foreground/10" />
        <div className="h-6 w-28 animate-pulse bg-foreground/10" />
      </div>
      <div className="h-9 w-36 animate-pulse bg-foreground/10" />
    </div>
    <div className="overflow-x-auto bg-background-rich">
      <table className="w-full">
        <thead>
          <tr className="border-accent-foreground border-b">
            {[
              "Product",
              "Win Rate",
              "GPT-4",
              "Claude",
              "Gemini",
              "Perplexity",
              "Quality",
              "",
            ].map((header) => (
              <th key={header} className="px-4 py-3 text-left">
                {header && (
                  <div className="h-3 w-14 animate-pulse bg-foreground/10" />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(["a", "b", "c", "d", "e"] as const).map((key) => (
            <tr
              key={key}
              className="border-accent-foreground border-b last:border-b-0"
            >
              <td className="px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="size-9 shrink-0 animate-pulse bg-foreground/10" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-36 animate-pulse bg-foreground/10" />
                    <div className="h-3 w-20 animate-pulse bg-foreground/10" />
                  </div>
                </div>
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                  <div className="h-1 w-20 animate-pulse bg-foreground/10" />
                  <div className="h-4 w-9 animate-pulse bg-foreground/10" />
                </div>
              </td>
              <td className="px-4 py-4">
                <div className="h-4 w-9 animate-pulse bg-foreground/10" />
              </td>
              <td className="px-4 py-4">
                <div className="h-4 w-9 animate-pulse bg-foreground/10" />
              </td>
              <td className="px-4 py-4">
                <div className="h-4 w-9 animate-pulse bg-foreground/10" />
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                  <div className="h-1 w-20 animate-pulse bg-foreground/10" />
                  <div className="h-4 w-9 animate-pulse bg-foreground/10" />
                </div>
              </td>
              <td className="px-4 py-4">
                <div className="size-9 animate-pulse bg-foreground/10" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

/**
 * Mirrors the store overview's exact chrome — same bordered container, header
 * block, crosshairs, gutters, and section skeletons the page itself renders —
 * so the loading state and the loaded page are structurally identical and
 * nothing shifts when content streams in. Every store sub-page shares this
 * container and header geometry, so those navigations align too.
 */
export const PageSkeleton = () => (
  <div className="flex flex-col">
    <div className="mx-8 border-accent-foreground border-x">
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="relative mx-8 flex flex-col gap-6 px-6 py-8 sm:flex-row sm:items-end sm:justify-between">
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <div>
            <div className="h-4 w-56 animate-pulse bg-foreground/10" />
            <div className="mt-3 h-9 w-40 animate-pulse bg-foreground/10" />
            <div className="mt-1 h-5 w-80 max-w-full animate-pulse bg-foreground/10" />
          </div>
          <div className="h-9 w-32 animate-pulse bg-foreground/10" />
        </div>
      </div>

      <div className="-mx-8 border-accent-foreground border-b">
        <div className="relative mx-8 bg-background-rich">
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <StatsSkeleton />
        </div>
      </div>

      <SectionGutter />

      <div className="-mx-8 border-accent-foreground border-t border-b">
        <div className="relative mx-8 bg-background-rich">
          <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
          <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <ChartSkeleton />
        </div>
      </div>

      <SectionGutter />

      <div className="-mx-8 border-accent-foreground border-t border-b">
        <div className="relative mx-8 bg-background-rich">
          <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
          <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <div className="h-10 w-full rounded-md bg-background-dimmed p-1">
            <div className="h-8 w-1/3 animate-pulse rounded bg-foreground/10" />
          </div>
          <TableSkeleton />
        </div>
      </div>
    </div>
  </div>
);
