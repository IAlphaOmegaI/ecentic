import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@zenncore/web";
import { ChevronDownIcon } from "@zenncore/icons";

// Rendered defaultOpen so the panel is visible. Used to disclose the agent
// reasoning behind a simulation result.
export const Open = () => (
  <div style={{ width: 360 }}>
    <Collapsible defaultOpen style={{ width: "100%" }}>
      <CollapsibleTrigger
        style={{
          width: "100%",
          justifyContent: "space-between",
          padding: "8px 0",
          fontWeight: 500,
          color: "var(--color-foreground)",
        }}
      >
        Why Claude picked you
        <ChevronDownIcon style={{ width: 14, height: 14 }} />
      </CollapsibleTrigger>
      <CollapsiblePanel style={{ background: "transparent" }}>
        <div style={{ padding: "8px 0", color: "var(--color-foreground)" }}>
          Claude cited your 48-hour battery life and USB-C charging as the
          deciding factors over Anker PowerCore. Confidence: 0.86.
        </div>
      </CollapsiblePanel>
    </Collapsible>
  </div>
);

// Collapsed state — only the trigger shows.
export const Collapsed = () => (
  <div style={{ width: 360 }}>
    <Collapsible style={{ width: "100%" }}>
      <CollapsibleTrigger
        style={{
          width: "100%",
          justifyContent: "space-between",
          padding: "8px 0",
          fontWeight: 500,
          color: "var(--color-foreground)",
        }}
      >
        Show full agent transcript
        <ChevronDownIcon style={{ width: 14, height: 14 }} />
      </CollapsibleTrigger>
      <CollapsiblePanel style={{ background: "transparent" }}>
        <div style={{ padding: "8px 0", color: "var(--color-foreground)" }}>
          Full reasoning trace from all four agents.
        </div>
      </CollapsiblePanel>
    </Collapsible>
  </div>
);
