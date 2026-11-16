"use client";

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

const sections = ["account", "integrations", "billing"] as const;
type Section = (typeof sections)[number];

export const SettingsClient = (props: SettingsClient.Props) => (
  <NuqsAdapter>
    <Suspense fallback={<SettingsPanels {...props} />}>
      <SettingsSelection {...props} />
    </Suspense>
  </NuqsAdapter>
);

const SettingsSelection = (props: SettingsClient.Props) => {
  const [selection, setSelection] = useQueryState(
    "tab",
    parseAsStringLiteral(sections).withDefault("account"),
  );

  return (
    <SettingsPanels
      {...props}
      selection={selection}
      onSelectionChange={(value) => {
        if (typeof value !== "string") return;
        const section = sections.find((section) => section === value);
        if (section) void setSelection(section);
      }}
    />
  );
};

const SettingsPanels = ({
  account,
  integrations,
  billing,
  selection,
  onSelectionChange,
}: SettingsClient.Props & {
  selection?: Section;
  onSelectionChange?: (value: unknown) => void;
}) => {
  const translate = useTranslations("dashboard.settings.tabs");

  return (
    <div className="min-w-0">
      <Tabs
        defaultValue="account"
        value={selection}
        onValueChange={onSelectionChange}
        className="flex w-full min-w-0 flex-col"
      >
        <div className="border-accent-foreground border-b px-4 py-4 sm:px-6">
          <TabsList className="max-w-full text-sm">
            <TabsIndicator />
            {sections.map((section) => (
              <Tab key={section} value={section}>
                {translate(section)}
              </Tab>
            ))}
          </TabsList>
        </div>

        <TabsPanel
          value="account"
          className="min-w-0 flex-1 bg-background-rich outline-none"
        >
          {account}
        </TabsPanel>

        <TabsPanel
          value="integrations"
          className="min-w-0 flex-1 bg-background-rich outline-none"
        >
          {integrations}
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
