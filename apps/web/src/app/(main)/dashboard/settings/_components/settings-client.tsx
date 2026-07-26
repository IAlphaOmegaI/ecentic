"use client";

import { Tab, Tabs, TabsList, TabsPanel } from "@zenncore/web/components/tabs";
import { useState } from "react";
import type * as PerformanceFee from "@/server/app/billing/performance-fee";
import type * as GoogleMerchant from "@/server/app/integration/google-merchant";
import type * as Store from "@/server/app/store";
import type * as Subscription from "@/server/app/subscription";
import type * as User from "@/server/app/user";
import { AccountSection } from "./settings/account-section";
import { BillingSection } from "./settings/billing-section";
import { IntegrationsSection } from "./settings/integrations-section";
import { NotificationsSection } from "./settings/notifications-section";
import { SimulationSection } from "./settings/simulation-section";

export namespace SettingsClient {
  export type Props = {
    user: User.Type;
    stores: Store.Type[];
    google: Record<string, GoogleMerchant.Status | null>;
    subscription: Subscription.Type | null;
    invoices: Subscription.InvoiceSummary[];
    performanceFee: PerformanceFee.PeriodSummary | null;
  };
}

export const SettingsClient = ({
  user,
  stores,
  google,
  subscription,
  invoices,
  performanceFee,
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
    "h-auto w-full justify-start rounded-none border-0 border-accent-foreground border-b border-l-[3px] border-l-transparent p-4 text-left font-medium text-foreground-dimmed text-sm transition-colors duration-150 hover:bg-background hover:text-foreground data-selected:border-l-primary data-selected:bg-primary/5 data-selected:font-semibold data-selected:text-primary data-[active]:text-primary";

  return (
    <div className="flex gap-px bg-accent-foreground">
      <Tabs
        orientation="vertical"
        defaultValue="account"
        className="flex w-full flex-col gap-px md:flex-row md:items-stretch"
      >
        <TabsList className="flex w-full shrink-0 flex-col border-0 bg-background-rich md:w-44">
          <Tab value="account" className={className}>
            Account
          </Tab>
          {/* <Tab value="team" className={className}>
              Team
            </Tab> */}
          <Tab value="integrations" className={className}>
            Integrations
          </Tab>
          <Tab value="notifications" className={className}>
            Notifications
          </Tab>
          {/* <Tab value="simulation" className={className}>
              Simulation
            </Tab> */}
          <Tab value="billing" className={className}>
            Billing
          </Tab>
        </TabsList>

        <TabsPanel
          value="account"
          className="min-w-0 flex-1 bg-background-rich outline-none"
        >
          <AccountSection user={user} />
        </TabsPanel>

        {/* <TabsPanel
            value="team"
            className="min-w-0 flex-1 bg-background-rich outline-none"
          >
            <TeamSection user={user} />
          </TabsPanel> */}

        <TabsPanel
          value="integrations"
          className="min-w-0 flex-1 bg-background-rich outline-none"
        >
          <IntegrationsSection stores={stores} google={google} />
        </TabsPanel>

        <TabsPanel
          value="notifications"
          className="min-w-0 flex-1 bg-background-rich outline-none"
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
          className="min-w-0 flex-1 bg-background-rich outline-none"
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
          className="min-w-0 flex-1 bg-background-rich outline-none"
        >
          <BillingSection
            subscription={subscription}
            invoices={invoices}
            performanceFee={performanceFee}
          />
        </TabsPanel>
      </Tabs>
    </div>
  );
};
