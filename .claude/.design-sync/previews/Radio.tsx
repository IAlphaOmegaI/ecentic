import { Radio, RadioGroup } from "@zenncore/web";

const Row = ({ children }: { children: React.ReactNode }) => (
  <label
    style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      fontSize: 14,
      color: "var(--color-foreground)",
    }}
  >
    {children}
  </label>
);

// Hero: scan-frequency selection with one option pre-selected.
export const ScanFrequency = () => (
  <div style={{ width: 320 }}>
    <span
      style={{
        fontSize: 13,
        fontWeight: 500,
        color: "var(--color-foreground)",
        display: "block",
        marginBottom: 8,
      }}
    >
      Scan frequency
    </span>
    <RadioGroup defaultValue="daily">
      <Row>
        <Radio value="hourly" />
        Hourly
      </Row>
      <Row>
        <Radio value="daily" />
        Daily
      </Row>
      <Row>
        <Radio value="weekly" />
        Weekly
      </Row>
    </RadioGroup>
  </div>
);

export const Selected = () => (
  <RadioGroup defaultValue="enabled">
    <Row>
      <Radio value="enabled" />
      Track this competitor
    </Row>
  </RadioGroup>
);

export const Unselected = () => (
  <Row>
    <Radio value="disabled" />
    Ignore this competitor
  </Row>
);

export const Disabled = () => (
  <RadioGroup defaultValue="enterprise" disabled>
    <Row>
      <Radio value="enterprise" />
      <span style={{ opacity: 0.5 }}>Enterprise plan (locked)</span>
    </Row>
  </RadioGroup>
);
