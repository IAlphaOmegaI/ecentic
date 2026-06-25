AlertDialog from @zenncore/web. Use via `window.ZennWeb.AlertDialog` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface AlertDialogProps {
  /** A ref to imperative actions. - `unmount`: Manually unmounts the alert dialog. Call this after any externally controlled  */
  actionsRef?: RefObject<DialogRootActions>;
  /** A handle to associate the alert dialog with a trigger. If specified, allows external triggers to control the alert dialo */
  handle?: AlertDialog$1.Handle<unknown>;
  /** Whether the dialog is currently open. */
  open?: boolean;
  /** Whether the dialog is initially open. To render a controlled dialog, use the `open` prop instead. */
  defaultOpen?: boolean;
  /** The content of the dialog. This can be a regular React node or a render function that receives the `payload` of the acti */
  children?: boolean | PayloadChildRenderFunction<unknown> | React.ReactNode;
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
)
```
