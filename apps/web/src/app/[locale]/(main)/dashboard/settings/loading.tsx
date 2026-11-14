import { SettingsClient } from "./_components/settings-client";
import { PanelSkeleton, SettingsShell } from "./_components/shell";

export default () => (
  <SettingsShell>
    <SettingsClient
      account={<PanelSkeleton />}
      integrations={<PanelSkeleton section="integrations" />}
      billing={<PanelSkeleton section="billing" />}
    />
  </SettingsShell>
);
