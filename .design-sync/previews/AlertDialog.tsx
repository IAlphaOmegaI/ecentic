import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
} from "@zenncore/web";

// AlertDialog is a confirm overlay — rendered open (defaultOpen) so the card
// shows the real popup. cfg.overrides.AlertDialog pins cardMode "single" + a
// viewport so the portalled popup renders inside the card. AlertDialogPopup
// already wraps Portal + Backdrop internally.
export const Open = () => (
  <AlertDialog defaultOpen>
    <AlertDialogTrigger
      render={<Button variant="ghost" color="error">Delete competitor</Button>}
    />
    <AlertDialogPopup
      style={{
        background: "var(--color-background-rich)",
        padding: 24,
        borderRadius: 8,
        width: 380,
        maxWidth: "90vw",
        boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
      }}
    >
      <AlertDialogTitle
        style={{ fontSize: 18, fontWeight: 600, color: "var(--color-foreground-rich)" }}
      >
        Stop tracking Anker PowerCore?
      </AlertDialogTitle>
      <AlertDialogDescription style={{ marginTop: 8, color: "var(--color-foreground)" }}>
        This competitor will be removed from all simulations. 142 days of
        agent win-rate history against GPT-4, Claude, Gemini and Perplexity
        will be archived. This can't be undone.
      </AlertDialogDescription>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 24 }}>
        <AlertDialogClose render={<Button variant="ghost" color="neutral">Keep tracking</Button>} />
        <AlertDialogClose render={<Button color="error">Stop tracking</Button>} />
      </div>
    </AlertDialogPopup>
  </AlertDialog>
);
