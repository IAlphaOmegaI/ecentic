import {
  Button,
  Popover,
  PopoverArrow,
  PopoverDescription,
  PopoverPopup,
  PopoverPositioner,
  PopoverTitle,
  PopoverTrigger,
} from "@zenncore/web";

// Popover is a trigger→popup overlay — rendered open (defaultOpen) so the card
// shows the real popup. Base UI needs Portal + Positioner around the Popup;
// PopoverPositioner wraps both. cfg.overrides.Popover pins cardMode "single" +
// a viewport so the portalled popup renders inside the card.
export const Open = () => (
  <Popover defaultOpen>
    <PopoverTrigger
      render={
        <Button variant="soft" color="primary">
          Why is this losing?
        </Button>
      }
    />
    <PopoverPositioner side="bottom" align="end">
      <PopoverPopup
        style={{
          background: "var(--color-background-rich)",
          borderRadius: 8,
          width: 300,
          boxShadow: "0 16px 40px rgba(0,0,0,0.22)",
        }}
      >
        <PopoverArrow />
        <PopoverTitle
          style={{ fontWeight: 600, color: "var(--color-foreground-rich)" }}
        >
          ChatGPT ranked you 3rd
        </PopoverTitle>
        <PopoverDescription
          style={{
            marginTop: 6,
            color: "var(--color-foreground)",
            fontSize: 14,
          }}
        >
          The agent flagged a missing battery-life spec and 2 fewer reviews than
          Anker. Adding "48h playback" to your title is projected to recover the
          top slot.
        </PopoverDescription>
      </PopoverPopup>
    </PopoverPositioner>
  </Popover>
);
