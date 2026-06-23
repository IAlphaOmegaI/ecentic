import { Progress, ProgressLabel, ProgressValue } from "@zenncore/web";

// Progress.Root lays out children + a full-width Track; wrap in a fixed width.
const Bar = ({ label, value }: { label: string; value: number | null }) => (
  <Progress
    value={value}
    style={{ width: 320, display: "flex", flexDirection: "column", gap: 8 }}
  >
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <ProgressLabel>{label}</ProgressLabel>
      <ProgressValue />
    </div>
  </Progress>
);

// Hero: a running simulation across AI agents.
export const Simulating = () => (
  <Bar label="Simulating across 4 agents" value={45} />
);

export const NearlyDone = () => (
  <Bar label="Syncing Shopify catalog" value={92} />
);

export const Complete = () => <Bar label="Listing optimization" value={100} />;

export const Indeterminate = () => (
  <Bar label="Discovering competitors…" value={null} />
);
