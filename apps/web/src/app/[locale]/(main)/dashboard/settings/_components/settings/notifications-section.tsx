"use client";

import { useTranslations } from "next-intl";
import { Switch } from "@zenncore/web/components/switch";

export const NotificationsSection = ({
  notifications,
  onNotificationChange,
}: {
  notifications: {
    winRateDrop: boolean;
    simulationComplete: boolean;
    optimizationReady: boolean;
    autoPub: boolean;
    modelDrift: boolean;
    competitorUpdate: boolean;
    newCompetitor: boolean;
    weeklyDigest: boolean;
  };
  onNotificationChange: (
    key:
      | "winRateDrop"
      | "simulationComplete"
      | "optimizationReady"
      | "autoPub"
      | "modelDrift"
      | "competitorUpdate"
      | "newCompetitor"
      | "weeklyDigest",
    checked: boolean,
  ) => void;
}) => {
  const translate = useTranslations("dashboard.settings.notifications");

  const rows = [
    "winRateDrop",
    "simulationComplete",
    "optimizationReady",
    "autoPub",
    "modelDrift",
    "competitorUpdate",
    "newCompetitor",
    "weeklyDigest",
  ] as const;

  return (
    <div>
      <div className="border-accent-foreground border-b bg-background-dimmed px-4 py-3">
        <p className="font-semibold text-foreground-rich text-sm">
          {translate("title")}
        </p>
      </div>
      <div className="divide-y divide-accent-foreground">
        {rows.map((key) => (
          <div
            key={key}
            className="flex items-center justify-between px-4 py-4"
          >
            <div>
              <p className="font-medium text-[13px] text-foreground">
                {translate(`items.${key}.label`)}
              </p>
              <p className="mt-0.5 text-foreground-dimmed text-xs">
                {translate(`items.${key}.description`)}
              </p>
            </div>
            <Switch
              checked={notifications[key]}
              onCheckedChange={(checked) => onNotificationChange(key, checked)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
