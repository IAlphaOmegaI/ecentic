"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Crosshair, SectionGutter } from "../../../_components/grid";

/**
 * The page's static frame, rendered by both `page.tsx` and `loading.tsx`.
 *
 * Every region that needs a query is a slot; the heading, the section chrome
 * and the gutters need no data and prerender. Keeping one copy is what lets a
 * navigation land without shift and stops the two from drifting.
 */
export const CompetitorsShell = ({
  statusPill,
  action,
  stats,
  landscape,
  table,
  insights,
}: {
  statusPill: ReactNode;
  action: ReactNode;
  stats: ReactNode;
  landscape: ReactNode;
  table: ReactNode;
  insights: ReactNode;
}) => {
  const translate = useTranslations("dashboard.competitors");

  return (
    <div className="flex flex-col">
      <div className="mx-8 border-accent-foreground border-x">
        <div className="-mx-8 border-accent-foreground border-b">
          <div className="relative mx-8 flex flex-col gap-6 px-6 py-8 sm:flex-row sm:items-end sm:justify-between">
            <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
            <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
            <div>
              {statusPill}
              <h1 className="mt-3 font-bold text-[28px] text-foreground-rich tracking-[-0.02em]">
                {translate("title")}
              </h1>
              <p className="mt-1 text-foreground-dimmed text-sm">
                {translate("description")}
              </p>
            </div>
            <div className="flex items-center gap-2">{action}</div>
          </div>
        </div>

        <div className="-mx-8 border-accent-foreground border-b">
          <div className="relative mx-8 bg-background-rich">
            <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
            <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
            {stats}
          </div>
        </div>

        <SectionGutter />

        <div className="-mx-8 border-accent-foreground border-t border-b">
          <div className="relative mx-8 bg-background-rich">
            <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
            <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
            <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
            <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
            {landscape}
          </div>
        </div>

        <SectionGutter />

        <div className="-mx-8 border-accent-foreground border-t border-b">
          <div className="relative mx-8 bg-background-rich">
            <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
            <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
            <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
            <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
            {table}
          </div>
        </div>

        <SectionGutter />

        <div className="-mx-8 border-accent-foreground border-t border-b">
          <div className="relative mx-8 bg-background-rich">
            <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
            <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
            <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
            <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
            {insights}
          </div>
        </div>
      </div>
    </div>
  );
};

// Sized to the "Add Competitor" button it stands in for.
export const AddActionSkeleton = () => (
  <div className="h-9 w-36 animate-pulse bg-foreground/10" />
);

// Suspense fallbacks for the competitors page, shared with loading.tsx so the
// route-level skeleton and the streamed page render the exact same shapes.

export const LandscapeSkeleton = () => (
  <div className="grid grid-cols-1 gap-px bg-accent-foreground xl:grid-cols-3">
    <div className="bg-background-rich xl:col-span-2">
      <div className="p-4">
        <div className="h-3 w-32 animate-pulse bg-foreground/10" />
        <div className="mt-2 h-8 w-56 animate-pulse bg-foreground/10" />
      </div>
      <div className="flex flex-col gap-px border-accent-foreground border-t bg-accent-foreground">
        {(["a", "b", "c", "d", "e"] as const).map((key) => (
          <div
            key={key}
            className="flex items-center gap-4 bg-background-rich px-4 py-3"
          >
            <div className="flex w-36 items-center gap-2">
              <div className="size-8 shrink-0 animate-pulse rounded-md bg-foreground/10" />
              <div className="h-4 w-20 animate-pulse bg-foreground/10" />
            </div>
            <div className="flex flex-1 items-center gap-3">
              <div className="h-1 flex-1 animate-pulse rounded-full bg-foreground/10" />
              <div className="h-4 w-10 animate-pulse bg-foreground/10" />
            </div>
            <div className="h-4 w-14 animate-pulse bg-foreground/10" />
          </div>
        ))}
      </div>
    </div>
    <div className="flex flex-col gap-px bg-accent-foreground">
      <div className="flex flex-1 flex-col bg-background-rich">
        <div className="p-4">
          <div className="h-3 w-24 animate-pulse bg-foreground/10" />
          <div className="mt-2 h-8 w-40 animate-pulse bg-foreground/10" />
        </div>
        <div className="mx-4 min-h-56 flex-1 animate-pulse bg-foreground/10" />
        <div className="grid grid-cols-2 gap-3 p-4">
          {(["x", "y", "z", "w"] as const).map((key) => (
            <div key={key} className="space-y-2">
              <div className="h-3 w-20 animate-pulse bg-foreground/10" />
              <div className="h-5 w-12 animate-pulse bg-foreground/10" />
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

export const TableSkeleton = () => (
  <div>
    <div className="flex items-center justify-between border-accent-foreground border-b p-4">
      <div className="space-y-2">
        <div className="h-3 w-40 animate-pulse bg-foreground/10" />
        <div className="h-6 w-36 animate-pulse bg-foreground/10" />
      </div>
      <div className="h-4 w-24 animate-pulse bg-foreground/10" />
    </div>
    <div className="overflow-x-auto bg-background-rich">
      <table className="w-full">
        <thead>
          <tr className="border-accent-foreground border-b">
            {["Brand", "Win Rate", "Simulations", "Last Updated", ""].map(
              (header) => (
                <th key={header} className="px-4 py-3 text-left">
                  {header && (
                    <div className="h-3 w-16 animate-pulse bg-foreground/10" />
                  )}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {(["row-a", "row-b", "row-c", "row-d", "row-e"] as const).map(
            (key) => (
              <tr
                key={key}
                className="border-accent-foreground border-b last:border-b-0"
              >
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="size-9 shrink-0 animate-pulse rounded-md bg-foreground/10" />
                    <div className="space-y-1.5">
                      <div className="h-4 w-24 animate-pulse bg-foreground/10" />
                      <div className="h-3 w-16 animate-pulse bg-foreground/10" />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <div className="h-1 w-24 animate-pulse rounded-full bg-foreground/10" />
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
            ),
          )}
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

export const InsightsSkeleton = () => (
  <div className="bg-background-rich">
    <div className="flex items-start justify-between p-4">
      <div>
        <div className="h-3 w-32 animate-pulse bg-foreground/10" />
        <div className="mt-2 h-8 w-48 animate-pulse bg-foreground/10" />
      </div>
      <div className="space-y-1.5 text-right">
        <div className="h-3 w-20 animate-pulse bg-foreground/10" />
        <div className="h-4 w-48 animate-pulse bg-foreground/10" />
      </div>
    </div>
    <div className="flex flex-col gap-px border-accent-foreground border-t bg-accent-foreground">
      {(["a", "b", "c"] as const).map((key) => (
        <div
          key={key}
          className="flex items-center justify-between bg-background-rich px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <div className="size-2 shrink-0 animate-pulse rounded-[2px] bg-foreground/10" />
            <div className="space-y-1.5">
              <div className="h-4 w-48 animate-pulse bg-foreground/10" />
              <div className="h-3 w-64 animate-pulse bg-foreground/10" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-4 w-20 animate-pulse bg-foreground/10" />
            <div className="h-3 w-14 animate-pulse bg-foreground/10" />
          </div>
        </div>
      ))}
    </div>
    <div className="flex items-center justify-between border-accent-foreground border-t p-4">
      <div className="h-4 w-28 animate-pulse bg-foreground/10" />
      <div className="h-9 w-36 animate-pulse bg-foreground/10" />
    </div>
  </div>
);
