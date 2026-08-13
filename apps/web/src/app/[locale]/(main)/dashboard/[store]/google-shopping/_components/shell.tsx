"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Band, PageHeader } from "../../../_components/grid";

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
        <PageHeader
          context={translate("eyebrow")}
          title={translate("title")}
          description={translate("description")}
        />
        {children}
      </div>
    </div>
  );
};

export const SectionBox = ({
  marks,
  children,
}: {
  /** "top" for a band arriving after a hatch gutter — see `Band`. */
  marks?: "top" | "bottom" | "both" | "none";
  children: ReactNode;
}) => <Band marks={marks}>{children}</Band>;

export const ManagerSkeleton = () => (
  <div className="grid min-h-64 gap-px bg-accent-foreground lg:grid-cols-[16rem_minmax(0,1fr)]">
    <div className="bg-background-dimmed p-5">
      <div className="h-3 w-24 animate-pulse bg-foreground/10" />
      <div className="mt-5 grid grid-cols-4 gap-2 lg:grid-cols-1">
        {(["a", "b", "c", "d"] as const).map((key) => (
          <div key={key} className="h-8 animate-pulse bg-foreground/10" />
        ))}
      </div>
    </div>
    <div className="bg-background-rich p-5 sm:p-6">
      <div className="h-4 w-56 animate-pulse bg-foreground/10" />
      <div className="mt-3 h-3 w-full max-w-2xl animate-pulse bg-foreground/10" />
      <div className="mt-2 h-3 w-4/5 max-w-xl animate-pulse bg-foreground/10" />
      <div className="mt-6 h-9 w-40 animate-pulse bg-foreground/10" />
    </div>
  </div>
);
