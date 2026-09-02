import type { ReactNode } from "react";
import {
  Band,
  PageHeader,
  SectionGutter,
} from "../../../dashboard/_components/grid";

/**
 * The page's static frame, rendered by both `page.tsx` and `loading.tsx` so
 * navigation lands without layout shift. Hardcoded English — see `script.ts`.
 */
export const CallSheetShell = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-col">
    <div className="mx-8 border-accent-foreground border-x">
      <PageHeader
        context="Internal"
        title="Call sheet"
        description="Paste a store, scan it, then read the script. Every finding shows the URL it came from, so it holds up if they open their own source while you're talking."
      />
      {children}
    </div>
  </div>
);

const Line = ({ className }: { className: string }) => (
  <div className={`animate-pulse bg-foreground/10 ${className}`} />
);

export const CallSheetSkeleton = () => (
  <>
    <Band>
      <div className="grid gap-4 px-6 py-6 sm:px-8 lg:grid-cols-5">
        {["store", "contact", "company", "rep", "email"].map((field) => (
          <div key={field} className="space-y-2">
            <Line className="h-4 w-24" />
            <Line className="h-10 w-full rounded-md" />
          </div>
        ))}
      </div>
    </Band>
    <div className="border-accent-foreground border-b">
      <SectionGutter />
    </div>
    <div className="grid lg:grid-cols-2">
      <div className="min-w-0 border-accent-foreground lg:border-r">
        <div className="space-y-2 border-accent-foreground border-b p-4">
          <Line className="h-5 w-40" />
          <Line className="h-4 w-64" />
        </div>
        <div className="border-accent-foreground border-b px-6 py-4">
          <div className="flex flex-wrap gap-1.5">
            <Line className="h-6 w-28" />
            <Line className="h-6 w-32" />
            <Line className="h-6 w-24" />
          </div>
        </div>
        <Line className="h-28 w-full" />
        <Line className="h-28 w-full" />
      </div>
      <div className="min-w-0">
        <div className="space-y-2 border-accent-foreground border-b p-4">
          <Line className="h-5 w-36" />
          <Line className="h-4 w-56" />
        </div>
        <div className="space-y-3 px-4 py-4">
          <Line className="h-12 w-full" />
          <Line className="h-12 w-full" />
          <Line className="h-12 w-full" />
        </div>
      </div>
    </div>
  </>
);
