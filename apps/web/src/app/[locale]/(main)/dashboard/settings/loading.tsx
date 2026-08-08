import { PanelSkeleton, SettingsShell } from "./_components/shell";

// Same frame the page renders, so arriving by link looks like arriving by
// refresh: real heading, placeholder only where a panel streams. The tab rail
// lives in `SettingsClient`, so it stands in as a panel here.
export default () => (
  <SettingsShell>
    <PanelSkeleton />
  </SettingsShell>
);
