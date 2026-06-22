import { Slider } from "@zenncore/web";

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div style={{ width: 320, display: "flex", flexDirection: "column", gap: 8 }}>
    <span
      style={{ fontSize: 13, fontWeight: 500, color: "var(--color-foreground)" }}
    >
      {label}
    </span>
    {children}
  </div>
);

// Hero: a single-value win-rate threshold slider.
export const WinRateThreshold = () => (
  <Field label="Min win-rate to auto-optimize — 60%">
    <Slider defaultValue={60} min={0} max={100} />
  </Field>
);

export const PriceRange = () => (
  <Field label="Competitor price range — $40–$180">
    <Slider defaultValue={[40, 180]} min={0} max={250} />
  </Field>
);

export const Stepped = () => (
  <Field label="Simulations per scan — 8">
    <Slider defaultValue={8} min={1} max={12} step={1} />
  </Field>
);

export const Disabled = () => (
  <Field label="Enterprise scan budget (locked)">
    <span style={{ display: "block", opacity: 0.5 }}>
      <Slider defaultValue={75} min={0} max={100} disabled />
    </span>
  </Field>
);
