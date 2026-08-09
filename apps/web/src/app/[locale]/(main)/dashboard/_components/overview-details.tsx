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

export const OverviewDetails = ({
  products,
  competitors,
  agents,
}: OverviewDetails.Props) => {
  const translate = useTranslations("dashboard.overview.tabs");

  return (
    <Tabs defaultValue="products">
      <TabsList className="h-10 w-full rounded-md border-0 bg-background-dimmed p-1">
        <TabsIndicator className="top-1 h-8 rounded" />
        <Tab value="products" className="h-8 flex-1 border-r-0">
          {translate("topProducts")}
        </Tab>
        <Tab value="competitors" className="h-8 flex-1 border-r-0">
          {translate("competitors")}
        </Tab>
        <Tab value="agents" className="h-8 flex-1 border-r-0">
          {translate("agentVisits")}
        </Tab>
      </TabsList>

      <TabsPanel value="products" keepMounted>
        {products}
      </TabsPanel>
      <TabsPanel value="competitors" keepMounted>
        {competitors}
      </TabsPanel>
      <TabsPanel value="agents" keepMounted>
        {agents}
      </TabsPanel>
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
