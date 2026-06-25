Sheet from @zenncore/web. Use via `window.ZennWeb.Sheet` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface SheetProps {
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
  handle?: Dialog.Handle<Payload>;
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
)
```
