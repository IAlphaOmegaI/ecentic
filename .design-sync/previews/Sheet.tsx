import {
  Button,
  Sheet,
  SheetClose,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetPopup,
  SheetTitle,
  SheetTrigger,
} from "@zenncore/web";

// Sheet is a side panel — rendered open (defaultOpen) so the card shows the
// real popup. cfg.overrides.Sheet pins cardMode "single" + a viewport so the
// portalled popup renders inside the card. SheetPopup wraps Portal + Backdrop
// and renders its own close (X) button internally.
export const Open = () => (
  <Sheet defaultOpen>
    <SheetTrigger
      render={<Button variant="soft" color="primary">Optimize listing</Button>}
    />
    <SheetPopup
      side="right"
      style={{ background: "var(--color-background-rich)", boxShadow: "-12px 0 40px rgba(0,0,0,0.25)" }}
    >
      <SheetHeader>
        <SheetTitle style={{ fontSize: 18, color: "var(--color-foreground-rich)" }}>
          Optimize: Wireless Earbuds Pro
        </SheetTitle>
        <SheetDescription style={{ color: "var(--color-foreground)" }}>
          AI-rewritten listing to lift your win rate against 8 competitors.
        </SheetDescription>
      </SheetHeader>
      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-foreground-dimmed)", textTransform: "uppercase", letterSpacing: 0.4 }}>
            Title
          </div>
          <div style={{ marginTop: 4, color: "var(--color-foreground)" }}>
            Wireless Earbuds Pro — 48h Battery, Active Noise Cancelling, USB-C
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-foreground-dimmed)", textTransform: "uppercase", letterSpacing: 0.4 }}>
            Projected win rate
          </div>
          <div style={{ marginTop: 4, display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 24, fontWeight: 700, color: "var(--color-foreground-rich)" }}>71%</span>
            <span style={{ color: "var(--color-success)", fontWeight: 600 }}>+14% vs current</span>
          </div>
        </div>
        <div style={{ fontSize: 13, color: "var(--color-foreground-dimmed)" }}>
          Claude and Perplexity now rank you above Anker; GPT-4 cites the
          battery spec as the deciding factor.
        </div>
      </div>
      <SheetFooter>
        <Button color="primary">Apply optimization</Button>
        <SheetClose render={<Button variant="ghost" color="neutral">Discard</Button>} />
      </SheetFooter>
    </SheetPopup>
  </Sheet>
);
