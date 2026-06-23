import { Switch } from "@zenncore/web";

const Row = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div
    style={{
      width: 320,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
      fontSize: 14,
      color: "var(--color-foreground)",
    }}
  >
    <span>{label}</span>
    {children}
  </div>
);

export const On = () => (
  <Row label="Auto-optimize listings">
    <Switch checked onCheckedChange={() => {}} />
  </Row>
);

export const Off = () => (
  <Row label="Pause competitor scans">
    <Switch checked={false} onCheckedChange={() => {}} />
  </Row>
);

export const DisabledOn = () => (
  <Row label="Enterprise marketplace sync">
    <span style={{ display: "flex", opacity: 0.5 }}>
      <Switch checked disabled onCheckedChange={() => {}} />
    </span>
  </Row>
);

export const DisabledOff = () => (
  <Row label="Real-time agent tracking">
    <span style={{ display: "flex", opacity: 0.5 }}>
      <Switch checked={false} disabled onCheckedChange={() => {}} />
    </span>
  </Row>
);
