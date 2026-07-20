import { Meter, MeterLabel, MeterValue } from "@zenncore/web";

// Meter.Root lays out children + a full-width Track; wrap in a fixed width.
const Bar = ({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max?: number;
}) => (
  <Meter
    value={value}
    max={max}
    style={{ width: 320, display: "flex", flexDirection: "column", gap: 8 }}
  >
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <MeterLabel>{label}</MeterLabel>
      <MeterValue />
    </div>
  </Meter>
);

// Hero: win-rate against AI shopping agents.
export const WinRate = () => <Bar label="Win-rate vs competitors" value={62} />;

export const High = () => <Bar label="Listing health score" value={88} />;

export const Low = () => <Bar label="Catalog coverage" value={23} />;

export const Capacity = () => (
  <Bar label="Scans used this month" value={340} max={500} />
);
