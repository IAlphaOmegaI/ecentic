Separator from @zenncore/web. Use via `window.ZennWeb.Separator` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface SeparatorProps {
  children?: React.ReactNode;
  /** CSS class applied to the element, or a function that returns a class based on the component's state. */
  className?: string | ((state: SeparatorState) => string | undefined);
  /** Style applied to the element, or a function that returns a style object based on the component's state. */
  style?: CSSProperties | ((state: SeparatorState) => React.CSSProperties | undefined);
  id?: string;
  /** Allows you to replace the component's HTML element with a different tag, or compose it with another component. Accepts a */
  render?: ReactElement<unknown, string | JSXElementConstructor<any>> | ComponentRenderFn<HTMLProps, SeparatorState>;
  /** The orientation of the separator. */
  orientation?: "horizontal" | "vertical";
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}
```

## Examples

### Horizontal

```jsx
() => (
  <div
    style={{
      width: 360,
      display: "flex",
      flexDirection: "column",
      gap: 12,
      color: "var(--color-foreground)",
    }}
  >
    <div>
      <div style={{ fontSize: 12, opacity: 0.7 }}>Overall win rate</div>
      <div style={{ fontSize: 22, fontWeight: 600 }}>62%</div>
    </div>
    <Separator className="h-px w-full bg-accent-foreground" orientation="horizontal" />
    <div>
      <div style={{ fontSize: 12, opacity: 0.7 }}>Competitors tracked</div>
      <div style={{ fontSize: 22, fontWeight: 600 }}>8 across Amazon, Shopify, Walmart</div>
    </div>
  </div>
);

// Vertical: dividers between inline AI-agent win-rate stats.
```

### Vertical

```jsx
() => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 16,
      height: 48,
      color: "var(--color-foreground)",
    }}
  >
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 18, fontWeight: 600 }}>71%</div>
      <div style={{ fontSize: 11, opacity: 0.7 }}>GPT-4</div>
    </div>
    <Separator className="h-8 w-px bg-accent-foreground" orientation="vertical" />
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 18, fontWeight: 600 }}>68%</div>
      <div style={{ fontSize: 11, opacity: 0.7 }}>Claude</div>
    </div>
    <Separator className="h-8 w-px bg-accent-foreground" orientation="vertical" />
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 18, fontWeight: 600 }}>54%</div>
      <div style={{ fontSize: 11, opacity: 0.7 }}>Gemini</div>
    </div>
  </div>
)
```
