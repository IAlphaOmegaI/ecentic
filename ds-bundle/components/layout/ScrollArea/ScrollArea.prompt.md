ScrollArea from @zenncore/web. Use via `window.ZennWeb.ScrollArea` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface ScrollAreaProps {
  classList?: { root?: string; viewport?: string; scrollBar?: { root?: string; thumb?: string; }; };
  children?: React.ReactNode;
  /** CSS class applied to the element, or a function that returns a class based on the component's state. */
  className?: string | ((state: ScrollAreaRootState) => string | undefined);
  /** Style applied to the element, or a function that returns a style object based on the component's state. */
  style?: CSSProperties | ((state: ScrollAreaRootState) => React.CSSProperties | undefined);
  id?: string;
  /** Allows you to replace the component's HTML element with a different tag, or compose it with another component. Accepts a */
  render?: ReactElement<unknown, string | JSXElementConstructor<any>> | ComponentRenderFn<HTMLProps, ScrollAreaRootState>;
  /** The threshold in pixels that must be passed before the overflow edge attributes are applied. Accepts a single number for */
  overflowEdgeThreshold?: number | Partial<{ xStart: number; xEnd: number; yStart: number; yEnd: number; }>;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}
```

## Examples

### AgentFeed

```jsx
() => (
  <ScrollArea style={{ height: 220, width: 360 }}>
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
      {agents.map((line, index) => (
        <div
          key={line}
          style={{
            fontSize: 13,
            lineHeight: 1.4,
            color: "var(--color-foreground)",
            paddingBottom: 12,
            borderBottom:
              index < agents.length - 1
                ? "1px solid var(--color-accent-foreground)"
                : "none",
          }}
        >
          {line}
        </div>
      ))}
    </div>
  </ScrollArea>
)
```

### TallContent

```jsx
() => (
  <ScrollArea style={{ height: 160, width: 280 }}>
    <div style={{ padding: 12 }}>
      <p style={{ fontSize: 13, color: "var(--color-foreground)", margin: 0 }}>
        Optimization log for AcousticPro X3:
      </p>
      {Array.from({ length: 20 }).map((_, index) => (
        <p
          key={index}
          style={{ fontSize: 13, color: "var(--color-foreground)", margin: "8px 0 0" }}
        >
          Rewrite #{index + 1}: win rate +{index + 1}.2% across agents
        </p>
      ))}
    </div>
  </ScrollArea>
)
```
