import {
  Button,
  Dialog,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from "@zenncore/web";

// Dialog is an overlay — rendered open (defaultOpen) so the card shows the
// real popup. cfg.overrides.Dialog pins cardMode "single" + a viewport so the
// portalled popup renders inside the card instead of escaping.
export const Open = () => (
  <Dialog defaultOpen>
    <DialogTrigger
      render={
        <Button variant="soft" color="primary">
          Run simulation
        </Button>
      }
    />
    <DialogPopup
      style={{
        background: "var(--color-background-rich)",
        padding: 24,
        borderRadius: 8,
        width: 380,
        maxWidth: "90vw",
        boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
      }}
    >
      <DialogTitle
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: "var(--color-foreground-rich)",
        }}
      >
        Run simulation?
      </DialogTitle>
      <DialogDescription
        style={{ marginTop: 8, color: "var(--color-foreground)" }}
      >
        We'll compare your product against 8 competitors across GPT-4, Claude,
        Gemini and Perplexity. This uses 1 simulation credit.
      </DialogDescription>
      <div
        style={{
          display: "flex",
          gap: 8,
          justifyContent: "flex-end",
          marginTop: 24,
        }}
      >
        <DialogClose
          render={
            <Button variant="ghost" color="neutral">
              Cancel
            </Button>
          }
        />
        <DialogClose render={<Button color="primary">Run simulation</Button>} />
      </div>
    </DialogPopup>
  </Dialog>
);
