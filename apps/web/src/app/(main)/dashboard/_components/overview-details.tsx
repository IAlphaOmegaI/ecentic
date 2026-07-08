"use client";

import {
  Tab,
  Tabs,
  TabsIndicator,
  TabsList,
  TabsPanel,
} from "@zenncore/web/components/tabs";
import type { ReactNode } from "react";

/**
 * The store overview used to stack Top Products, Top Competitors, and Agent
 * Visits as three full-height panels — six-plus screens of scroll before the
 * user could act. They now share one tabbed panel; only the active one shows.
 *
 * Structure matches the other dashboard tabs (product detail / optimize)
 * exactly: TabsList is a DIRECT child of Tabs. Wrapping it in a div broke Base
 * UI's active-indicator measurement (the pill spanned the whole bar).
 */
export const OverviewDetails = ({
  products,
  competitors,
  agents,
}: OverviewDetails.Props) => (
  <Tabs defaultValue="products">
    <TabsList className="h-10 w-full rounded-md border-0 bg-background-dimmed p-1">
      <TabsIndicator className="rounded" />
      <Tab value="products" className="h-8 flex-1 border-r-0">
        Top Products
      </Tab>
      <Tab value="competitors" className="h-8 flex-1 border-r-0">
        Competitors
      </Tab>
      <Tab value="agents" className="h-8 flex-1 border-r-0">
        Agent Visits
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

export namespace OverviewDetails {
  export type Props = {
    products: ReactNode;
    competitors: ReactNode;
    agents: ReactNode;
  };
}
