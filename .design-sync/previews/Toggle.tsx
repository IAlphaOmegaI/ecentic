import { Toggle, ToggleGroup } from "@zenncore/web";
import { RobotIcon, RadarIcon, BarChartIcon, BullseyeIcon } from "@zenncore/icons";

// A single pressed toggle (defaultPressed) so the active state is visible.
export const Pressed = () => (
  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
    <Toggle defaultPressed aria-label="Auto-optimize" style={{ borderRadius: 6 }}>
      <BullseyeIcon style={{ width: 16, height: 16 }} />
    </Toggle>
    <span style={{ fontSize: 14, color: "var(--color-foreground)" }}>
      Auto-optimize on
    </span>
  </div>
);

// A toggle group acting as a single-select segmented control — one item
// pre-pressed. Used to switch the dashboard chart between views.
export const ViewGroup = () => (
  <ToggleGroup defaultValue={["winrate"]} style={{ borderRadius: 8 }}>
    <Toggle value="winrate" aria-label="Win rate" style={{ width: 36 }}>
      <BarChartIcon style={{ width: 16, height: 16 }} />
    </Toggle>
    <Toggle value="agents" aria-label="Agents" style={{ width: 36 }}>
      <RobotIcon style={{ width: 16, height: 16 }} />
    </Toggle>
    <Toggle value="radar" aria-label="Radar" style={{ width: 36 }}>
      <RadarIcon style={{ width: 16, height: 16 }} />
    </Toggle>
  </ToggleGroup>
);

// Labeled multi-select group — which agents to include in a simulation.
export const AgentFilter = () => (
  <ToggleGroup
    multiple
    defaultValue={["gpt-4", "claude"]}
    style={{ borderRadius: 8, gap: 2 }}
  >
    <Toggle value="gpt-4" style={{ width: "auto", padding: "0 12px", borderRadius: 6 }}>
      GPT-4
    </Toggle>
    <Toggle value="claude" style={{ width: "auto", padding: "0 12px", borderRadius: 6 }}>
      Claude
    </Toggle>
    <Toggle value="gemini" style={{ width: "auto", padding: "0 12px", borderRadius: 6 }}>
      Gemini
    </Toggle>
  </ToggleGroup>
);
