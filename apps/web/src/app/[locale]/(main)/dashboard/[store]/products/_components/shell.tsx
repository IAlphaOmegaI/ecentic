"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Crosshair, SectionGutter } from "../../../_components/grid";

/**
 * The page's static frame, rendered by both `page.tsx` and `loading.tsx`.
 *
 * Every region that needs a query is a slot; the heading, the section chrome
 * and the gutters need no data and prerender. `banner` renders nothing until
 * the embed status resolves, so it has no placeholder.
 */
export const ProductsShell = ({
  statusPill,
  action,
  banner,
  stats,
  performance,
  table,
  traffic,
  insights,
}: {
  statusPill: ReactNode;
  action: ReactNode;
  banner?: ReactNode;
  stats: ReactNode;
  performance: ReactNode;
  table: ReactNode;
  traffic: ReactNode;
  insights: ReactNode;
}) => {
  const translate = useTranslations("dashboard.products");

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

      {banner}

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
          {performance}
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
          {traffic}
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

// Sized to the "Add Products" button it stands in for.
export const AddActionSkeleton = () => (
  <div className="h-9 w-36 animate-pulse bg-foreground/10" />
);

// Suspense fallbacks for the products page, shared with loading.tsx so the
// route-level skeleton and the streamed page render the exact same shapes.

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
          <div className="h-10 w-24 animate-pulse bg-foreground/10" />
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
      <div className="grid grid-cols-4 divide-x divide-accent-foreground border-accent-foreground border-y px-4">
        {(["a", "b", "c", "d"] as const).map((key) => (
          <div
            key={key}
            className="flex flex-col items-center gap-1 p-6 first:pl-0 last:pr-0"
          >
            <div className="flex w-full flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-8 animate-pulse bg-foreground/10" />
                <div className="h-3 w-14 animate-pulse bg-foreground/10" />
              </div>
              <div className="flex items-baseline gap-0.5">
                <div className="h-9 w-10 animate-pulse bg-foreground/10" />
                <div className="h-4 w-3 animate-pulse bg-foreground/10" />
              </div>
            </div>
            <div className="mt-2 h-1 w-full animate-pulse rounded-full bg-foreground/10" />
          </div>
        ))}
      </div>
      <div className="p-4">
        <div className="mb-4 h-3 w-28 animate-pulse bg-foreground/10" />
        <div className="h-64 w-full animate-pulse bg-foreground/10" />
      </div>
    </div>
    <div className="flex flex-col gap-px bg-accent-foreground">
      <div className="flex-1 bg-background-rich p-4">
        <div className="h-6 w-40 animate-pulse bg-foreground/10" />
        <div className="mt-6 h-1 w-full animate-pulse rounded-full bg-foreground/10" />
        <div className="mt-4 grid grid-cols-3 gap-4">
          {(["x", "y", "z"] as const).map((key) => (
            <div key={key} className="space-y-2">
              <div className="h-3 w-16 animate-pulse bg-foreground/10" />
              <div className="h-4 w-8 animate-pulse bg-foreground/10" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 bg-background-rich p-4">
        <div className="h-6 w-40 animate-pulse bg-foreground/10" />
        <div className="mt-6 h-1 w-full animate-pulse rounded-full bg-foreground/10" />
        <div className="mt-4 grid grid-cols-3 gap-4">
          {(["x", "y", "z"] as const).map((key) => (
            <div key={key} className="space-y-2">
              <div className="h-3 w-16 animate-pulse bg-foreground/10" />
              <div className="h-8 w-10 animate-pulse bg-foreground/10" />
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
    <div className="flex items-end justify-between border-accent-foreground border-b p-4">
      <div className="space-y-2">
        <div className="h-3 w-28 animate-pulse bg-foreground/10" />
        <div className="h-7 w-40 animate-pulse bg-foreground/10" />
      </div>
      <div className="h-4 w-24 animate-pulse bg-foreground/10" />
    </div>
    <div className="overflow-x-auto bg-background-rich">
      <table className="w-full">
        <thead>
          <tr className="border-accent-foreground border-b">
            {[
              "Product",
              "Price",
              "Win Rate",
              "ChatGPT",
              "Claude",
              "Gemini",
              "Perplexity",
              "Quality",
              "Last Scan",
              "",
            ].map((header) => (
              <th key={header} className="px-4 py-3 text-left">
                {header && (
                  <div className="h-3 w-16 animate-pulse bg-foreground/10" />
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
                    <div className="h-4 w-32 animate-pulse bg-foreground/10" />
                    <div className="h-3 w-16 animate-pulse bg-foreground/10" />
                  </div>
                </div>
              </td>
              <td className="px-4 py-4">
                <div className="h-4 w-14 animate-pulse bg-foreground/10" />
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                  <div className="h-1 w-12 animate-pulse rounded-full bg-foreground/10" />
                  <div className="h-4 w-8 animate-pulse bg-foreground/10" />
                </div>
              </td>
              <td className="px-4 py-4">
                <div className="h-4 w-8 animate-pulse bg-foreground/10" />
              </td>
              <td className="px-4 py-4">
                <div className="h-4 w-8 animate-pulse bg-foreground/10" />
              </td>
              <td className="px-4 py-4">
                <div className="h-4 w-8 animate-pulse bg-foreground/10" />
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                  <div className="h-1 w-10 animate-pulse rounded-full bg-foreground/10" />
                  <div className="h-4 w-6 animate-pulse bg-foreground/10" />
                </div>
              </td>
              <td className="px-4 py-4">
                <div className="h-3 w-14 animate-pulse bg-foreground/10" />
              </td>
              <td className="px-4 py-4">
                <div className="h-4 w-10 animate-pulse bg-foreground/10" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export const TrafficSkeleton = () => (
  <div className="bg-background-rich">
    <div className="flex flex-col gap-6 p-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="h-3 w-24 animate-pulse bg-foreground/10" />
        <div className="mt-2 h-8 w-64 animate-pulse bg-foreground/10" />
        <div className="mt-1 h-4 w-72 animate-pulse bg-foreground/10" />
      </div>
      <div className="h-10 w-28 animate-pulse bg-foreground/10" />
    </div>
    <div className="flex items-center gap-6 px-4">
      {(["a", "b", "c", "d"] as const).map((key) => (
        <div key={key} className="flex items-center gap-2">
          <div className="size-4 animate-pulse bg-foreground/10" />
          <div className="h-3 w-14 animate-pulse bg-foreground/10" />
        </div>
      ))}
    </div>
    <div className="px-4 pt-4 pb-6">
      <div className="h-64 w-full animate-pulse bg-foreground/10" />
    </div>
    <div className="flex flex-col gap-3 px-4 pb-4">
      {(["d", "e", "f"] as const).map((key) => (
        <div key={key}>
          <div className="mb-1 flex items-center justify-between">
            <div className="h-4 w-28 animate-pulse bg-foreground/10" />
            <div className="h-4 w-8 animate-pulse bg-foreground/10" />
          </div>
          <div className="h-1 w-full animate-pulse rounded-full bg-foreground/10" />
        </div>
      ))}
    </div>
  </div>
);

export const InsightsSkeleton = () => (
  <div className="bg-background-rich">
    <div className="flex items-start justify-between border-accent-foreground border-b p-4">
      <div className="space-y-2">
        <div className="h-3 w-24 animate-pulse bg-foreground/10" />
        <div className="h-7 w-32 animate-pulse bg-foreground/10" />
      </div>
      <div className="space-y-1.5">
        <div className="h-4 w-24 animate-pulse bg-foreground/10" />
        <div className="h-3 w-28 animate-pulse bg-foreground/10" />
      </div>
    </div>
    <div className="p-6">
      <div className="h-5 w-3/4 animate-pulse bg-foreground/10" />
    </div>
    <div className="grid grid-cols-1 gap-px border-accent-foreground border-y bg-accent-foreground sm:grid-cols-[1fr_auto]">
      <div className="bg-background-rich p-6">
        <div className="size-7.5 animate-pulse bg-foreground/10" />
        <div className="mt-4 h-3 w-16 animate-pulse bg-foreground/10" />
        <div className="mt-2 h-4 w-full animate-pulse bg-foreground/10" />
      </div>
      <div className="flex flex-col items-center justify-center bg-background-rich p-6 sm:min-w-44">
        <div className="h-10 w-20 animate-pulse bg-foreground/10" />
        <div className="mt-2 h-4 w-16 animate-pulse bg-foreground/10" />
      </div>
    </div>
    <div className="flex flex-col gap-4 p-4">
      <div className="h-3 w-32 animate-pulse bg-foreground/10" />
      <div className="flex flex-wrap gap-2">
        {(["a", "b", "c", "d"] as const).map((key) => (
          <div
            key={key}
            className="h-5 w-20 animate-pulse rounded bg-foreground/10"
          />
        ))}
      </div>
    </div>
    <div className="flex items-center justify-between border-accent-foreground border-t p-4">
      <div className="space-y-2">
        <div className="h-3 w-16 animate-pulse bg-foreground/10" />
        <div className="h-7 w-28 animate-pulse bg-foreground/10" />
      </div>
      <div className="h-9 w-24 animate-pulse bg-foreground/10" />
    </div>
  </div>
);
