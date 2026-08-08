"use client";

import { Tab, Tabs, TabsList, TabsPanel } from "@zenncore/web/components/tabs";
import { type ReactNode, useState } from "react";
import { NotificationsSection } from "./settings/notifications-section";
import { SimulationSection } from "./settings/simulation-section";

export namespace SettingsClient {
  /**
   * The tab rail carries no data of its own, so it prerenders. Each panel that
   * needs a query arrives as a slot on its own boundary — billing in particular
   * reconciles against Stripe, and used to hold up the whole screen including
   * the Account tab.
   */
  export type Props = {
    account: ReactNode;
    integrations: ReactNode;
    billing: ReactNode;
  };
}

export const SettingsClient = ({
  account,
  integrations,
  billing,
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
    "gpt",
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
          {account}
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
          {integrations}
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
          {billing}
        </TabsPanel>
      </Tabs>
    </div>
  );
};
