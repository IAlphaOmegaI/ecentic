import { Checkbox, CheckboxGroup } from "@zenncore/web";

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

// Hero: an AI-agent selection group with two options pre-checked.
export const AgentGroup = () => (
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
      Simulate against agents
    </span>
    <CheckboxGroup defaultValue={["chatgpt", "claude"]}>
      <Row>
        <Checkbox value="chatgpt" />
        ChatGPT
      </Row>
      <Row>
        <Checkbox value="claude" />
        Claude
      </Row>
      <Row>
        <Checkbox value="gemini" />
        Gemini
      </Row>
      <Row>
        <Checkbox value="perplexity" />
        Perplexity
      </Row>
    </CheckboxGroup>
  </div>
);

export const Checked = () => (
  <Row>
    <Checkbox defaultChecked />
    Auto-optimize winning listings
  </Row>
);

export const Unchecked = () => (
  <Row>
    <Checkbox />
    Notify me on win-rate drops
  </Row>
);

export const Disabled = () => (
  <Row>
    <Checkbox defaultChecked disabled />
    <span style={{ opacity: 0.5 }}>Enterprise marketplace sync</span>
  </Row>
);
