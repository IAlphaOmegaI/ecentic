"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Crosshair, Slot } from "../../../../_components/grid";

import { DashboardHeaderFigure } from "../../../../_components/header-figure";

export const AddProductsShell = ({
  statusPill,
  action,
  children,
}: {
  statusPill: ReactNode;
  action: ReactNode;
  children: ReactNode;
}) => {
  const translate = useTranslations("dashboard.products.add");
  return (
    <div className="flex min-h-full min-w-0 flex-col">
      <header className="flex min-w-0 flex-col items-stretch justify-between gap-5 px-4 py-6 sm:flex-row sm:items-center sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <DashboardHeaderFigure subject="addProducts" />
          <div className="min-w-0">
            <h1 className="font-heading font-semibold text-3xl text-foreground-rich tracking-tight">
              {translate("title")}
            </h1>
            <p className="mt-2 max-w-xl text-foreground-dimmed text-sm leading-6">
              {translate("description")}
            </p>
          </div>
        </div>
        <Slot>{action}</Slot>
      </header>
      <div className="border-accent-foreground border-t px-4 py-3 sm:px-6">
        <Slot>{statusPill}</Slot>
      </div>
      <section className="relative flex min-w-0 flex-1 flex-col border-accent-foreground border-y bg-background-rich">
        <Crosshair className="top-0 right-0 -translate-y-1/2" />
        {children}
        <Crosshair className="bottom-0 left-0 translate-y-1/2" />
      </section>
    </div>
  );
};

export const BackLinkSkeleton = () => (
  <div className="h-9 w-40 animate-pulse rounded-lg bg-foreground/10 motion-reduce:animate-none" />
);

export const SourcesSkeleton = () => (
  <div aria-hidden className="grid min-w-0 lg:grid-cols-2">
    <div className="flex min-w-0 flex-col gap-4 border-accent-foreground border-b px-4 py-6 sm:px-6 lg:border-r lg:border-b-0">
      <div className="h-7 w-44 max-w-full animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
      <div className="h-12 w-full animate-pulse rounded-lg bg-foreground/10 motion-reduce:animate-none" />
      <div className="mt-2 h-48 w-full animate-pulse rounded-lg bg-primary/5 motion-reduce:animate-none" />
      <div className="h-9 w-36 animate-pulse rounded-lg bg-foreground/10 motion-reduce:animate-none" />
    </div>
    <div className="flex min-w-0 flex-col items-center justify-center gap-4 px-4 py-6 sm:px-6">
      <div className="h-48 w-56 max-w-full animate-pulse rounded-sm bg-foreground/5 motion-reduce:animate-none" />
      <div className="h-12 w-full animate-pulse rounded-lg bg-foreground/10 motion-reduce:animate-none" />
    </div>
  </div>
);
