import type { ReactNode } from "react";
import { Crosshair, StatusPill } from "../../../dashboard/_components/grid";

/**
 * The page's static frame, rendered by both `page.tsx` and `loading.tsx` so
 * navigation lands without layout shift. Hardcoded English — see `script.ts`.
 */
export const CallSheetShell = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-col">
    <div className="mx-8 border-accent-foreground border-x">
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="relative mx-8 flex flex-col gap-6 px-6 py-8 sm:flex-row sm:items-end sm:justify-between">
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <div>
            <StatusPill tone="neutral">Internal — outbound</StatusPill>
            <h1 className="mt-3 font-bold text-[28px] text-foreground-rich tracking-[-0.02em]">
              Call Sheet
            </h1>
            <p className="mt-1 max-w-2xl text-foreground-dimmed text-sm">
              Paste a prospect's store address. The scan reads their live
              robots.txt and product pages and reports only what it actually
              found — every finding shows the URL it came from, so it holds up
              if they open their own source while you're talking.
            </p>
          </div>
        </div>
      </div>
      {children}
    </div>
  </div>
);

const Line = ({ className }: { className: string }) => (
  <div className={`animate-pulse bg-foreground/10 ${className}`} />
);

export const CallSheetSkeleton = () => (
  <>
    <div className="-mx-8 border-accent-foreground border-b">
      <div className="relative mx-8 grid gap-6 px-6 py-6 sm:px-8 lg:grid-cols-4">
        <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        {["store", "contact", "company", "rep"].map((field) => (
          <div key={field} className="space-y-2">
            <Line className="h-3 w-20" />
            <Line className="h-10 w-full" />
          </div>
        ))}
      </div>
    </div>
    <div className="-mx-8 grid lg:grid-cols-2">
      <div className="mx-8 space-y-4 px-6 py-8">
        <Line className="h-3 w-28" />
        <Line className="h-28 w-full" />
        <Line className="h-28 w-full" />
      </div>
      <div className="mx-8 space-y-4 border-accent-foreground px-6 py-8 lg:border-l">
        <Line className="h-3 w-24" />
        <Line className="h-16 w-full" />
        <Line className="h-16 w-full" />
        <Line className="h-16 w-full" />
      </div>
    </div>
  </>
);
