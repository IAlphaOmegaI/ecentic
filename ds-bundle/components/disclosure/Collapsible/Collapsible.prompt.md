Collapsible from @zenncore/web. Use via `window.ZennWeb.Collapsible` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface CollapsibleProps {
  /** Whether the collapsible panel is currently open. To render an uncontrolled collapsible, use the `defaultOpen` prop inste */
  open?: boolean;
  /** Whether the collapsible panel is initially open. To render a controlled collapsible, use the `open` prop instead. */
  defaultOpen?: boolean;
  children?: React.ReactNode;
  /** CSS class applied to the element, or a function that returns a class based on the component's state. */
  className?: string | ((state: CollapsibleRootState) => string | undefined);
  /** Style applied to the element, or a function that returns a style object based on the component's state. */
  style?: CSSProperties | ((state: CollapsibleRootState) => React.CSSProperties | undefined);
  id?: string;
  /** Whether the component should ignore user interaction. */
  disabled?: boolean;
  /** Allows you to replace the component's HTML element with a different tag, or compose it with another component. Accepts a */
  render?: ReactElement<unknown, string | JSXElementConstructor<any>> | ComponentRenderFn<HTMLProps, CollapsibleRootState>;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}
```

## Examples

### Open

```jsx
() => (
  <div style={{ width: 360 }}>
    <Collapsible defaultOpen style={{ width: "100%" }}>
      <CollapsibleTrigger
        style={{
          width: "100%",
          justifyContent: "space-between",
          padding: "8px 0",
          fontWeight: 500,
          color: "var(--color-foreground)",
        }}
      >
        Why Claude picked you
        <ChevronDownIcon style={{ width: 14, height: 14 }} />
      </CollapsibleTrigger>
      <CollapsiblePanel style={{ background: "transparent" }}>
        <div style={{ padding: "8px 0", color: "var(--color-foreground)" }}>
          Claude cited your 48-hour battery life and USB-C charging as the
          deciding factors over Anker PowerCore. Confidence: 0.86.
        </div>
      </CollapsiblePanel>
    </Collapsible>
  </div>
);

// Collapsed state — only the trigger shows.
```

### Collapsed

```jsx
() => (
  <div style={{ width: 360 }}>
    <Collapsible style={{ width: "100%" }}>
      <CollapsibleTrigger
        style={{
          width: "100%",
          justifyContent: "space-between",
          padding: "8px 0",
          fontWeight: 500,
          color: "var(--color-foreground)",
        }}
      >
        Show full agent transcript
        <ChevronDownIcon style={{ width: 14, height: 14 }} />
      </CollapsibleTrigger>
      <CollapsiblePanel style={{ background: "transparent" }}>
        <div style={{ padding: "8px 0", color: "var(--color-foreground)" }}>
          Full reasoning trace from all four agents.
        </div>
      </CollapsiblePanel>
    </Collapsible>
  </div>
)
```
