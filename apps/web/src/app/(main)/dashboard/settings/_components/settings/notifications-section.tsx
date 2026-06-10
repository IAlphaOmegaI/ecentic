"use client";

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
  const rows = [
    {
      key: "winRateDrop" as const,
      label: "Win Rate Drops",
      description: "Alert when any product drops >5%",
    },
    {
      key: "simulationComplete" as const,
      label: "Simulation Complete",
      description: "When a simulation batch finishes",
    },
    {
      key: "optimizationReady" as const,
      label: "Optimization Ready",
      description: "New optimization suggestions available",
    },
    {
      key: "autoPub" as const,
      label: "Auto-Published",
      description: "When auto-optimization publishes changes",
    },
    {
      key: "modelDrift" as const,
      label: "Model Drift Detected",
      description: "When an AI model updates its behavior",
    },
    {
      key: "competitorUpdate" as const,
      label: "Competitor Updates",
      description: "When tracked competitor listings change",
    },
    {
      key: "newCompetitor" as const,
      label: "New Competitors",
      description: "When a new competitor is detected",
    },
    {
      key: "weeklyDigest" as const,
      label: "Weekly Digest",
      description: "Summary of the week's performance",
    },
  ] as const;

  return (
    <div>
      <div className="border-accent-foreground border-b bg-background-dimmed px-4 py-3">
        <p className="font-semibold text-foreground-rich text-sm">
          Email Notifications
        </p>
      </div>
      <div className="divide-y divide-accent-foreground">
        {rows.map(({ key, label, description }) => (
          <div
            key={key}
            className="flex items-center justify-between px-4 py-4"
          >
            <div>
              <p className="font-medium text-[13px] text-foreground">{label}</p>
              <p className="mt-0.5 text-foreground-dimmed text-xs">
                {description}
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
