"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { type ReactNode, Suspense } from "react";
import { resolveSettingsSection } from "@/lib/dashboard-settings";

export namespace SettingsClient {
  export type Props = {
    account: ReactNode;
    security: ReactNode;
    integrations: ReactNode;
    billing: ReactNode;
  };
}

export const SettingsClient = (props: SettingsClient.Props) => (
  <Suspense fallback={<SettingsPanel {...props} selection="account" />}>
    <SettingsSelection {...props} />
  </Suspense>
);

const SettingsSelection = (props: SettingsClient.Props) => {
  const parameters = useSearchParams();
  return (
    <SettingsPanel {...props} selection={resolveSettingsSection(parameters)} />
  );
};

const SettingsPanel = ({
  selection,
  ...panels
}: SettingsClient.Props & {
  selection: ReturnType<typeof resolveSettingsSection>;
}) => {
  const translate = useTranslations("dashboard.settings.workspace.sections");

  return (
    <section
      className="min-w-0 bg-background-rich"
      aria-labelledby="settings-section-title"
    >
      <header className="border-accent-foreground border-b px-4 py-6 sm:px-8">
        <h2
          id="settings-section-title"
          className="font-medium text-2xl text-foreground-rich"
        >
          {translate(`${selection}.title`)}
        </h2>
        <p className="mt-2 max-w-2xl text-foreground-dimmed text-sm">
          {translate(`${selection}.description`)}
        </p>
      </header>
      {panels[selection]}
    </section>
  );
};
