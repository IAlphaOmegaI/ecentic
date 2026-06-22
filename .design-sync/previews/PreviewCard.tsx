import {
  PreviewCard,
  PreviewCardArrow,
  PreviewCardPopup,
  PreviewCardPositioner,
  PreviewCardTrigger,
} from "@zenncore/web";

// PreviewCard is a hover-card overlay — rendered open (open) so the card shows
// the real popup. Base UI needs Portal + Positioner around the Popup;
// PreviewCardPositioner wraps both. cfg.overrides.PreviewCard pins cardMode
// "single" + a viewport so the portalled popup renders inside the card.
export const Open = () => (
  <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
    <PreviewCard open>
      <PreviewCardTrigger
        render={
          <a style={{ color: "var(--color-primary)", fontWeight: 600, cursor: "pointer" }}>
            Anker PowerCore
          </a>
        }
      />
      <PreviewCardPositioner side="bottom">
        <PreviewCardPopup
          style={{
            background: "var(--color-background-rich)",
            borderRadius: 8,
            width: 260,
            boxShadow: "0 16px 40px rgba(0,0,0,0.22)",
          }}
        >
          <PreviewCardArrow />
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 6,
                background: "var(--color-background-dimmed)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                color: "var(--color-foreground-rich)",
              }}
            >
              A
            </div>
            <div>
              <div style={{ fontWeight: 600, color: "var(--color-foreground-rich)" }}>
                Anker PowerCore 20K
              </div>
              <div style={{ fontSize: 12, color: "var(--color-foreground-dimmed)" }}>
                Top competitor · Amazon
              </div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: "var(--color-foreground)" }}>
            $59.99 · 4.7★ (18,204 reviews). Wins 64% of GPT-4 and Perplexity
            comparisons against your listing this week.
          </div>
          <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--color-foreground-dimmed)" }}>
            <span>Win rate <b style={{ color: "var(--color-foreground-rich)" }}>64%</b></span>
            <span>Mentions <b style={{ color: "var(--color-foreground-rich)" }}>312</b></span>
          </div>
        </PreviewCardPopup>
      </PreviewCardPositioner>
    </PreviewCard>
  </div>
);
