import { Separator } from "@zenncore/web";

// Horizontal: a thin divider between two stat blocks.
export const Horizontal = () => (
  <div
    style={{
      width: 360,
      display: "flex",
      flexDirection: "column",
      gap: 12,
      color: "var(--color-foreground)",
    }}
  >
    <div>
      <div style={{ fontSize: 12, opacity: 0.7 }}>Overall win rate</div>
      <div style={{ fontSize: 22, fontWeight: 600 }}>62%</div>
    </div>
    <Separator
      className="h-px w-full bg-accent-foreground"
      orientation="horizontal"
    />
    <div>
      <div style={{ fontSize: 12, opacity: 0.7 }}>Competitors tracked</div>
      <div style={{ fontSize: 22, fontWeight: 600 }}>
        8 across Amazon, Shopify, Walmart
      </div>
    </div>
  </div>
);

// Vertical: dividers between inline AI-agent win-rate stats.
export const Vertical = () => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 16,
      height: 48,
      color: "var(--color-foreground)",
    }}
  >
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 18, fontWeight: 600 }}>71%</div>
      <div style={{ fontSize: 11, opacity: 0.7 }}>GPT-4</div>
    </div>
    <Separator
      className="h-8 w-px bg-accent-foreground"
      orientation="vertical"
    />
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 18, fontWeight: 600 }}>68%</div>
      <div style={{ fontSize: 11, opacity: 0.7 }}>Claude</div>
    </div>
    <Separator
      className="h-8 w-px bg-accent-foreground"
      orientation="vertical"
    />
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 18, fontWeight: 600 }}>54%</div>
      <div style={{ fontSize: 11, opacity: 0.7 }}>Gemini</div>
    </div>
  </div>
);
