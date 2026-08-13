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
import {
  Band,
  PageHeader,
  SectionGutter,
  SectionHeader,
  Slot,
} from "../../../_components/grid";

/**
 * Header plus one slot.
 *
 * The content used to be wrapped in a `Band`, which broke the page rail and set
 * four corner marks — and then every section inside broke out of it again with
 * its own `-mx-8` seam. Sections are siblings on the rail now, the way the
 * overview and visibility pages build theirs.
 */
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
        <PageHeader
          context={translate("eyebrow")}
          title={translate("title")}
          description={translate("description")}
          actions={actions}
        />
        <Slot>{content}</Slot>
      </div>
    </div>
  );
};

/**
 * Tab chrome is client-side; every panel receives server-rendered nodes so the
 * report content itself stays on the server.
 *
 * Crawlability, perception, funnel and landscape used to stack open below the
 * summary — six always-visible sections separated by hatch gutters. They are
 * grouped into four tabs here by the question each answers, which is the same
 * move the overview made on its three stacked panels.
 */
export const BrandTabs = ({
  findings,
  perception,
  crawlability,
  queries,
}: {
  findings: ReactNode;
  perception: ReactNode;
  crawlability: ReactNode;
  queries: ReactNode;
}) => {
  const translate = useTranslations("dashboard.brand.tabs");

  return (
    <Tabs defaultValue="findings">
      <Band marks="top">
        <SectionHeader
          kicker={translate("kicker")}
          title={translate("title")}
          description={translate("description")}
        />
        <div className="p-4">
          {/* Same segmented rail as the overview's detail tabs — design.md §11.6. */}
          <TabsList className="h-10 w-full max-w-xl rounded-md border-0 bg-background-dimmed p-1">
            <TabsIndicator className="top-1 h-8 rounded" />
            <Tab value="findings" className="h-8 flex-1 border-r-0">
              {translate("findings")}
            </Tab>
            <Tab value="perception" className="h-8 flex-1 border-r-0">
              {translate("perception")}
            </Tab>
            <Tab value="crawlability" className="h-8 flex-1 border-r-0">
              {translate("crawlability")}
            </Tab>
            <Tab value="queries" className="h-8 flex-1 border-r-0">
              {translate("queries")}
            </Tab>
          </TabsList>
        </div>
        <TabsPanel value="findings" keepMounted>
          {findings}
        </TabsPanel>
        <TabsPanel value="perception" keepMounted>
          {perception}
        </TabsPanel>
        <TabsPanel value="crawlability" keepMounted>
          {crawlability}
        </TabsPanel>
        <TabsPanel value="queries" keepMounted>
          {queries}
        </TabsPanel>
      </Band>
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
const STAT_CELLS = ["a", "b", "c", "d"] as const;

/** Matches the report: a stat band, the summary pair, then the tabbed region. */
export const BrandSkeleton = () => (
  <>
    <Band>
      <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-2 xl:grid-cols-4">
        {STAT_CELLS.map((key) => (
          <div
            key={key}
            className="flex flex-col justify-between gap-6 bg-background-rich p-5"
          >
            <div className="h-3 w-24 animate-pulse bg-foreground/10" />
            <div className="flex flex-col gap-3">
              <div className="h-9 w-20 animate-pulse bg-foreground/10" />
              <div className="h-1 w-full animate-pulse rounded-full bg-foreground/10" />
            </div>
          </div>
        ))}
      </div>
    </Band>
    <SectionGutter />
    <Band marks="top">
      <div className="grid gap-px bg-accent-foreground lg:grid-cols-[1.6fr_1fr]">
        <SkeletonCard lines={TALL_CARD} />
        <SkeletonCard lines={TALL_CARD} />
      </div>
    </Band>
    <SectionGutter />
    <Band marks="top">
      <div className="p-4">
        <div className="h-10 w-full max-w-xl animate-pulse rounded-md bg-foreground/10" />
      </div>
      <SkeletonCard lines={SHORT_CARD} />
    </Band>
  </>
);
