import {
  Button,
  Tooltip,
  TooltipArrow,
  TooltipPopup,
  TooltipPositioner,
  TooltipProvider,
  TooltipTrigger,
} from "@zenncore/web";

// Tooltip is a trigger→popup overlay — rendered open (open) so the card shows
// the real popup. Base UI Tooltip must sit inside a TooltipProvider and needs
// Portal + Positioner around the Popup; TooltipPositioner wraps both.
// cfg.overrides.Tooltip pins cardMode "single" + a viewport so the portalled
// popup renders inside the card. Tooltip content stays short.
export const Open = () => (
  <TooltipProvider>
    <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
      <Tooltip open>
        <TooltipTrigger render={<Button variant="soft" color="primary">Win rate</Button>} />
        <TooltipPositioner side="top">
          <TooltipPopup
            style={{
              background: "var(--color-background-rich)",
              borderRadius: 6,
              boxShadow: "0 10px 28px rgba(0,0,0,0.22)",
              color: "var(--color-foreground)",
            }}
          >
            <TooltipArrow />
            Share of AI-agent comparisons won
          </TooltipPopup>
        </TooltipPositioner>
      </Tooltip>
    </div>
  </TooltipProvider>
);
