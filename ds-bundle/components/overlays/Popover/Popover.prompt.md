Popover from @zenncore/web. Use via `window.ZennWeb.Popover` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface PopoverProps {
  /** Whether the popover is initially open. To render a controlled popover, use the `open` prop instead. */
  defaultOpen?: boolean;
  /** Whether the popover is currently open. */
  open?: boolean;
  /** A ref to imperative actions. - `unmount`: Manually unmounts the popover. Call this after any externally controlled closi */
  actionsRef?: RefObject<PopoverRootActions>;
  /** Determines if the popover enters a modal state when open. - `true`: user interaction is limited to the popover: document */
  modal?: boolean | "trap-focus";
  /** ID of the trigger that the popover is associated with. This is useful in conjunction with the `open` prop to create a co */
  triggerId?: string;
  /** ID of the trigger that the popover is associated with. This is useful in conjunction with the `defaultOpen` prop to crea */
  defaultTriggerId?: string;
  /** A handle to associate the popover with a trigger. If specified, allows external triggers to control the popover's open s */
  handle?: Popover$1.Handle<Payload>;
  /** The content of the popover. This can be a regular React node or a render function that receives the `payload` of the act */
  children?: boolean | PayloadChildRenderFunction<Payload> | React.ReactNode;
}
```

## Examples

### Open

```jsx
() => (
  <Popover defaultOpen>
    <PopoverTrigger render={<Button variant="soft" color="primary">Why is this losing?</Button>} />
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
        <PopoverTitle style={{ fontWeight: 600, color: "var(--color-foreground-rich)" }}>
          GPT-4 ranked you 3rd
        </PopoverTitle>
        <PopoverDescription style={{ marginTop: 6, color: "var(--color-foreground)", fontSize: 14 }}>
          The agent flagged a missing battery-life spec and 2 fewer reviews
          than Anker. Adding "48h playback" to your title is projected to
          recover the top slot.
        </PopoverDescription>
      </PopoverPopup>
    </PopoverPositioner>
  </Popover>
)
```
