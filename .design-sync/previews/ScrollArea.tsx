import { ScrollArea } from "@zenncore/web";

const agents = [
  "GPT-4 picked AcousticPro X3 over 3 competitors",
  "Claude favored SoundForge Studio for studio use",
  "Gemini ranked EchoLab Mini #2 on value",
  "Perplexity flagged PulseWave Air missing specs",
  "GPT-4 cited 4.7-star reviews as decisive",
  "Claude penalized vague shipping copy",
  "Gemini compared price-per-feature on Walmart",
  "Perplexity surfaced a cheaper Amazon variant",
  "GPT-4 recommended bundling the carrying case",
  "Claude noted competitor's longer warranty",
  "Gemini weighted battery life heavily",
  "Perplexity questioned the return policy",
];

// ScrollArea needs a constrained size and overflowing content to show the bar.
export const AgentFeed = () => (
  <ScrollArea style={{ height: 220, width: 360 }}>
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
      {agents.map((line, index) => (
        <div
          key={line}
          style={{
            fontSize: 13,
            lineHeight: 1.4,
            color: "var(--color-foreground)",
            paddingBottom: 12,
            borderBottom:
              index < agents.length - 1
                ? "1px solid var(--color-accent-foreground)"
                : "none",
          }}
        >
          {line}
        </div>
      ))}
    </div>
  </ScrollArea>
);

export const TallContent = () => (
  <ScrollArea style={{ height: 160, width: 280 }}>
    <div style={{ padding: 12 }}>
      <p style={{ fontSize: 13, color: "var(--color-foreground)", margin: 0 }}>
        Optimization log for AcousticPro X3:
      </p>
      {Array.from({ length: 20 }).map((_, index) => (
        <p
          key={index}
          style={{ fontSize: 13, color: "var(--color-foreground)", margin: "8px 0 0" }}
        >
          Rewrite #{index + 1}: win rate +{index + 1}.2% across agents
        </p>
      ))}
    </div>
  </ScrollArea>
);
