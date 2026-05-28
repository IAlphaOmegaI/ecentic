"use client";

import {
  Tab,
  Tabs,
  TabsIndicator,
  TabsList,
  TabsPanel,
} from "@zenncore/web/components/tabs";
import { useState } from "react";
import type * as Store from "@/server/app/store";
import type * as Subscription from "@/server/app/subscription";
import type * as User from "@/server/app/user";
import { AccountSection } from "./settings/account-section";
import { BillingSection } from "./settings/billing-section";
import { IntegrationsSection } from "./settings/integrations-section";
import { NotificationsSection } from "./settings/notifications-section";
import { SimulationSection } from "./settings/simulation-section";
import { TeamSection } from "./settings/team-section";

export namespace SettingsClient {
  export type Props = {
    user: User.Type;
    stores: Store.Type[];
    subscription: Subscription.Type | null;
    invoices: Subscription.InvoiceSummary[];
  };
}

export const SettingsClient = ({
  user,
  stores,
  subscription,
  invoices,
}: SettingsClient.Props) => {
  const [notifications, setNotifications] = useState({
    winRateDrop: true,
    simulationComplete: true,
    optimizationReady: true,
    autoPub: false,
    modelDrift: true,
    competitorUpdate: false,
    newCompetitor: true,
    weeklyDigest: true,
  });

  const [selectedModels, setSelectedModels] = useState([
    "gpt-4",
    "gpt-4o",
    "claude-3-5-sonnet",
  ]);

  const [frequency, setFrequency] = useState("Daily");
  const [persona, setPersona] = useState("Budget-conscious shopper");

  const className =
    "h-auto w-full justify-start border-0 border-b border-accent-foreground p-4 text-left font-medium text-foreground-dimmed hover:text-foreground data-selected:bg-transparent data-active:text-white data-selected:text-white";

  return (
    <div className="-mx-8 mb-12 border-accent-foreground border-b">
      <div className="mx-8 flex gap-px bg-accent-foreground">
        <Tabs
          orientation="vertical"
          defaultValue="account"
          className="flex w-full flex-col gap-px md:flex-row md:items-stretch"
        >
          <TabsList className="flex w-full shrink-0 flex-col border-0 bg-background-rich md:w-44">
            <Tab value="account" className={className}>
              Account
            </Tab>
            <Tab value="team" className={className}>
              Team
            </Tab>
            <Tab value="integrations" className={className}>
              Integrations
            </Tab>
            <Tab value="notifications" className={className}>
              Notifications
            </Tab>
            <Tab value="simulation" className={className}>
              Simulation
            </Tab>
            <Tab value="billing" className={className}>
              Billing
            </Tab>
            <TabsIndicator className="top-(--active-tab-top) left-0 h-(--active-tab-height) w-full translate-x-0 translate-y-0 bg-primary transition-all duration-200 ease-in-out" />
          </TabsList>

          <TabsPanel
            value="account"
            className="min-w-0 flex-1 bg-background outline-none"
          >
            <AccountSection user={user} />
          </TabsPanel>

          <TabsPanel
            value="team"
            className="min-w-0 flex-1 bg-background outline-none"
          >
            <TeamSection user={user} />
          </TabsPanel>

          <TabsPanel
            value="integrations"
            className="min-w-0 flex-1 bg-background outline-none"
          >
            <IntegrationsSection stores={stores} />
          </TabsPanel>

          <TabsPanel
            value="notifications"
            className="min-w-0 flex-1 bg-background outline-none"
          >
            <NotificationsSection
              notifications={notifications}
              onNotificationChange={(key, checked) =>
                setNotifications((previous) => ({
                  ...previous,
                  [key]: checked,
                }))
              }
            />
          </TabsPanel>

          <TabsPanel
            value="simulation"
            className="min-w-0 flex-1 bg-background outline-none"
          >
            <SimulationSection
              selectedModels={selectedModels}
              onSelectedModelsChange={setSelectedModels}
              frequency={frequency}
              onFrequencyChange={setFrequency}
              persona={persona}
              onPersonaChange={setPersona}
            />
          </TabsPanel>

          <TabsPanel
            value="billing"
            className="min-w-0 flex-1 bg-background outline-none"
          >
            <BillingSection subscription={subscription} invoices={invoices} />
          </TabsPanel>
        </Tabs>
      </div>
    </div>
  );
};
