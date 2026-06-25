PreviewCard from @zenncore/web. Use via `window.ZennWeb.PreviewCard` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface PreviewCardProps {
  /** Whether the preview card is initially open. To render a controlled preview card, use the `open` prop instead. */
  defaultOpen?: boolean;
  /** Whether the preview card is currently open. */
  open?: boolean;
  /** A ref to imperative actions. - `unmount`: Unmounts the preview card popup. - `close`: Closes the preview card imperative */
  actionsRef?: RefObject<PreviewCardRootActions>;
  /** A handle to associate the preview card with a trigger. If specified, allows external triggers to control the card's open */
  handle?: PreviewCard$1.Handle<Payload>;
  /** The content of the preview card. This can be a regular React node or a render function that receives the `payload` of th */
  children?: boolean | PayloadChildRenderFunction<Payload> | React.ReactNode;
  /** ID of the trigger that the preview card is associated with. This is useful in conjunction with the `open` prop to create */
  triggerId?: string;
  /** ID of the trigger that the preview card is associated with. This is useful in conjunction with the `defaultOpen` prop to */
  defaultTriggerId?: string;
}
```

## Examples

### Open

```jsx
() => (
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
)
```
