import { SettingsClient } from "./_components/settings-client";
import { PanelSkeleton, SettingsShell } from "./_components/shell";

export default () => (
  <SettingsShell>
    <SettingsClient
      account={<PanelSkeleton key="account" />}
      security={<PanelSkeleton key="security" section="security" />}
      integrations={<PanelSkeleton key="integrations" section="integrations" />}
      billing={<PanelSkeleton key="billing" section="billing" />}
    />
  </SettingsShell>
);
