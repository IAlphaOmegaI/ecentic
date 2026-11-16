"use client";

import { BullseyeIcon, CommerceFilePenIcon, RadarIcon } from "@zenncore/icons";
import {
  Tab,
  Tabs,
  TabsIndicator,
  TabsList,
  TabsPanel,
} from "@zenncore/web/components/tabs";
import { useTranslations } from "next-intl";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { type ReactNode, Suspense } from "react";

type OverviewView = "products" | "competitors" | "agents";

export const OverviewDetails = (props: OverviewDetails.Props) => (
  <NuqsAdapter>
    <Suspense fallback={<OverviewDetailsContent {...props} />}>
      <OverviewDetailsQuery {...props} />
    </Suspense>
  </NuqsAdapter>
);

const OverviewDetailsQuery = (props: OverviewDetails.Props) => {
  const [view, setView] = useQueryState(
    "view",
    parseAsStringLiteral(["products", "competitors", "agents"]).withDefault(
      "products",
    ),
  );
  return (
    <OverviewDetailsContent
      {...props}
      view={view}
      onViewChange={(value) => {
        void setView(value);
      }}
    />
  );
};

const OverviewDetailsContent = ({
  products,
  competitors,
  agents,
  view,
  onViewChange,
}: OverviewDetails.Props & {
  view?: OverviewView;
  onViewChange?: (value: OverviewView) => void;
}) => {
  const translate = useTranslations("dashboard.overview.tabs");

  return (
    <Tabs
      id="overview-details"
      defaultValue="products"
      value={view}
      onValueChange={(value) => {
        if (
          value === "products" ||
          value === "competitors" ||
          value === "agents"
        )
          onViewChange?.(value);
      }}
      className="min-w-0 scroll-mt-4"
    >
      <div className="border-accent-foreground border-b px-4 py-4 sm:px-6">
        <TabsList className="max-w-full text-sm">
          <TabsIndicator />
          <Tab value="products" className="gap-2">
            <CommerceFilePenIcon
              aria-hidden
              className="hidden size-5 shrink-0 sm:block"
            />
            {translate("topProducts")}
          </Tab>
          <Tab value="competitors" className="gap-2">
            <BullseyeIcon
              aria-hidden
              className="hidden size-5 shrink-0 sm:block"
            />
            {translate("competitors")}
          </Tab>
          <Tab value="agents" className="gap-2">
            <RadarIcon
              aria-hidden
              className="hidden size-5 shrink-0 sm:block"
            />
            {translate("agentVisits")}
          </Tab>
        </TabsList>
      </div>

      <TabsPanel value="products" keepMounted>
        {products}
      </TabsPanel>
      <TabsPanel value="competitors" keepMounted>
        {competitors}
      </TabsPanel>
      <TabsPanel value="agents">{agents}</TabsPanel>
    </Tabs>
  );
};

export namespace OverviewDetails {
  export type Props = {
    products: ReactNode;
    competitors: ReactNode;
    agents: ReactNode;
  };
}
