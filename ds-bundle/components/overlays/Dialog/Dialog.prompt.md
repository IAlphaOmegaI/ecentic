Dialog from @zenncore/web. Use via `window.ZennWeb.Dialog` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface DialogProps {
  /** Whether the dialog is currently open. */
  open?: boolean;
  /** Whether the dialog is initially open. To render a controlled dialog, use the `open` prop instead. */
  defaultOpen?: boolean;
  /** Determines if the dialog enters a modal state when open. - `true`: user interaction is limited to just the dialog: focus */
  modal?: boolean | "trap-focus";
  /** Whether to prevent the dialog from closing on outside presses. For non-modal dialogs, this also prevents the dialog from */
  disablePointerDismissal?: boolean;
  /** A ref to imperative actions. - `unmount`: Manually unmounts the dialog. Call this after any externally controlled closin */
  actionsRef?: RefObject<DialogRootActions>;
  /** A handle to associate the dialog with a trigger. If specified, allows external triggers to control the dialog's open sta */
  handle?: Dialog$1.Handle<Payload>;
  /** The content of the dialog. This can be a regular React node or a render function that receives the `payload` of the acti */
  children?: boolean | PayloadChildRenderFunction<Payload> | React.ReactNode;
  /** ID of the trigger that the dialog is associated with. This is useful in conjunction with the `open` prop to create a con */
  triggerId?: string;
  /** ID of the trigger that the dialog is associated with. This is useful in conjunction with the `defaultOpen` prop to creat */
  defaultTriggerId?: string;
}
```

## Examples

### Open

```jsx
() => (
  <Dialog defaultOpen>
    <DialogTrigger
      render={<Button variant="soft" color="primary">Run simulation</Button>}
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
      <DialogTitle style={{ fontSize: 18, fontWeight: 600, color: "var(--color-foreground-rich)" }}>
        Run simulation?
      </DialogTitle>
      <DialogDescription style={{ marginTop: 8, color: "var(--color-foreground)" }}>
        We'll compare your product against 8 competitors across GPT-4, Claude,
        Gemini and Perplexity. This uses 1 simulation credit.
      </DialogDescription>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 24 }}>
        <DialogClose render={<Button variant="ghost" color="neutral">Cancel</Button>} />
        <DialogClose render={<Button color="primary">Run simulation</Button>} />
      </div>
    </DialogPopup>
  </Dialog>
)
```
