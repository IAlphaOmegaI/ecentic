"use client";

import {
  Tab,
  Tabs,
  TabsIndicator,
  TabsList,
  TabsPanel,
} from "@zenncore/web/components/tabs";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Crosshair, SectionGutter } from "../../../_components/grid";

export const BrandShell = ({
  actions,
  content,
}: {
  actions?: ReactNode;
  content: ReactNode;
}) => {
  const translate = useTranslations("dashboard.brand");

  return (
    <div className="flex flex-col">
      <div className="mx-8 border-accent-foreground border-x">
        <div className="-mx-8 border-accent-foreground border-b">
          <div className="relative mx-8 flex flex-col gap-6 px-6 py-8 sm:flex-row sm:items-end sm:justify-between">
            <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
            <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
            <div>
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
            {actions && (
              <div className="flex shrink-0 items-center gap-3">{actions}</div>
            )}
          </div>
        </div>
        {content}
      </div>
    </div>
  );
};

/**
 * Tab chrome is client-side; both panels receive server-rendered nodes so the
 * report content itself stays on the server.
 */
export const BrandTabs = ({
  overview,
  queries,
}: {
  overview: ReactNode;
  queries: ReactNode;
}) => {
  const translate = useTranslations("dashboard.brand.tabs");

  return (
    <Tabs defaultValue="overview">
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="relative mx-8 px-6 py-3">
          <TabsList className="h-10 w-full max-w-xs rounded-md border-0 bg-background-dimmed p-1">
            <TabsIndicator className="top-1 h-8 rounded" />
            <Tab value="overview" className="h-8 flex-1 border-r-0">
              {translate("overview")}
            </Tab>
            <Tab value="queries" className="h-8 flex-1 border-r-0">
              {translate("queries")}
            </Tab>
          </TabsList>
        </div>
      </div>
      <TabsPanel value="overview" keepMounted>
        {overview}
      </TabsPanel>
      <TabsPanel value="queries" keepMounted>
        {queries}
      </TabsPanel>
    </Tabs>
  );
};

const SkeletonCard = ({ lines }: { lines: readonly string[] }) => (
  <div className="flex flex-col gap-3 bg-background-rich p-6">
    <div className="h-4 w-40 animate-pulse rounded-full bg-foreground/10" />
    {lines.map((line) => (
      <div
        key={line}
        className="h-3 w-full animate-pulse rounded-full bg-foreground/10 last:w-2/3"
      />
    ))}
  </div>
);

const SHORT_CARD = ["a", "b", "c", "d"] as const;
const TALL_CARD = ["a", "b", "c", "d", "e", "f"] as const;

export const BrandSkeleton = () => (
  <>
    <div className="-mx-8 border-accent-foreground border-b">
      <div className="relative mx-8 px-6 py-3">
        <div className="h-10 w-full max-w-xs animate-pulse rounded-md bg-foreground/10" />
      </div>
    </div>
    <div className="-mx-8 border-accent-foreground border-b">
      <div className="relative mx-8 grid gap-px bg-accent-foreground lg:grid-cols-[1.6fr_1fr]">
        <SkeletonCard lines={TALL_CARD} />
        <SkeletonCard lines={TALL_CARD} />
      </div>
    </div>
    <SectionGutter />
    <div className="-mx-8 border-accent-foreground border-t border-b">
      <div className="relative mx-8">
        <SkeletonCard lines={SHORT_CARD} />
      </div>
    </div>
    <SectionGutter />
    <div className="-mx-8 border-accent-foreground border-t border-b">
      <div className="relative mx-8 grid gap-px bg-accent-foreground md:grid-cols-2">
        <SkeletonCard lines={SHORT_CARD} />
        <SkeletonCard lines={SHORT_CARD} />
      </div>
    </div>
  </>
);
