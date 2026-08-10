"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Crosshair } from "../../../_components/grid";

/**
 * The channel page's static frame, rendered by both `page.tsx` and
 * `loading.tsx`.
 *
 * The header needs no data, so it prerenders into the static shell. Sharing one
 * copy is what keeps a navigation looking like a refresh — and stops this
 * fairly long piece of prose from being edited in one place and not the other.
 */
export const GoogleShoppingShell = ({ children }: { children: ReactNode }) => {
  const translate = useTranslations("dashboard.googleShopping");

  return (
    <div className="flex flex-col">
      <div className="mx-8 border-accent-foreground border-x">
        <div className="-mx-8 border-accent-foreground border-b">
          <div className="relative mx-8 px-6 py-8">
            <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
            <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
            <p className="font-semibold text-primary text-xs uppercase tracking-[0.14em]">
              {translate("eyebrow")}
            </p>
            <h1 className="mt-2 font-bold text-2xl text-foreground-rich">
              {translate("title")}
            </h1>
            <p className="mt-1 max-w-2xl text-foreground-dimmed text-sm">
              {translate("description")}
            </p>
          </div>
        </div>

        {children}
      </div>
    </div>
  );
};

export const SectionBox = ({ children }: { children: ReactNode }) => (
  <div className="-mx-8 border-accent-foreground border-b">
    <div className="relative mx-8 bg-background-rich">
      <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
      {children}
    </div>
  </div>
);

export const ManagerSkeleton = () => (
  <div className="flex flex-col divide-y divide-accent-foreground">
    {(["a", "b"] as const).map((key) => (
      <div key={key} className="flex flex-col gap-2 p-4">
        <div className="h-4 w-56 animate-pulse bg-foreground/10" />
        <div className="h-3 w-full max-w-2xl animate-pulse bg-foreground/10" />
        <div className="h-9 w-40 animate-pulse bg-foreground/10" />
      </div>
    ))}
  </div>
);
