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
 * Each panel's children are streamed server components (wrapped in Suspense on
 * the server), so this client wrapper just switches which one is visible.
 * keepMounted keeps all three in the DOM so switching is instant and their
 * Suspense boundaries can stream in independently.
 */
export const OverviewDetails = ({
  products,
  competitors,
  agents,
}: OverviewDetails.Props) => (
  <Tabs defaultValue="products">
    <div className="border-accent-foreground border-b p-4">
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
    </div>

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
