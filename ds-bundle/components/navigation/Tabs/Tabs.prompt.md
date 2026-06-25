Tabs from @zenncore/web. Use via `window.ZennWeb.Tabs` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface TabsProps {
  children?: React.ReactNode;
  /** CSS class applied to the element, or a function that returns a class based on the component's state. */
  className?: string | ((state: TabsRootState) => string | undefined);
  /** The default value. Use when the component is not controlled. When the value is `null`, no Tab will be active. */
  defaultValue?: any;
  /** Style applied to the element, or a function that returns a style object based on the component's state. */
  style?: CSSProperties | ((state: TabsRootState) => React.CSSProperties | undefined);
  id?: string;
  /** The value of the currently active `Tab`. Use when the component is controlled. When the value is `null`, no Tab will be  */
  value?: any;
  /** Allows you to replace the component's HTML element with a different tag, or compose it with another component. Accepts a */
  render?: ReactElement<unknown, string | JSXElementConstructor<any>> | ComponentRenderFn<HTMLProps, TabsRootState>;
  /** The component orientation (layout flow direction). */
  orientation?: "horizontal" | "vertical";
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}
```

## Examples

### Horizontal

```jsx
() => (
  <div style={{ width: 480 }}>
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsIndicator />
        <Tab value="overview">Overview</Tab>
        <Tab value="agents">AI Agents</Tab>
        <Tab value="competitors">Competitors</Tab>
      </TabsList>
      <TabsPanel value="overview" style={{ padding: 16, color: "var(--color-foreground)" }}>
        Your product wins 62% of AI shopping-agent comparisons this week.
      </TabsPanel>
      <TabsPanel value="agents" style={{ padding: 16, color: "var(--color-foreground)" }}>
        Simulated across GPT-4, Claude, Gemini and Perplexity.
      </TabsPanel>
      <TabsPanel value="competitors" style={{ padding: 16, color: "var(--color-foreground)" }}>
        Tracking 8 competitors across 3 marketplaces.
      </TabsPanel>
    </Tabs>
  </div>
)
```

### FullWidth

```jsx
() => (
  <div style={{ width: 480 }}>
    <Tabs defaultValue="auto">
      <TabsList>
        <TabsIndicator />
        <Tab value="auto" style={{ flex: 1 }}>Auto-detect</Tab>
        <Tab value="url" style={{ flex: 1 }}>Paste URLs</Tab>
        <Tab value="search" style={{ flex: 1 }}>Search brand</Tab>
      </TabsList>
      <TabsPanel value="auto" style={{ padding: 16, color: "var(--color-foreground)" }}>
        We detect competitors automatically from your catalog.
      </TabsPanel>
      <TabsPanel value="url" style={{ padding: 16, color: "var(--color-foreground)" }}>
        Paste competitor product URLs to track them directly.
      </TabsPanel>
      <TabsPanel value="search" style={{ padding: 16, color: "var(--color-foreground)" }}>
        Search by brand name to discover competing listings.
      </TabsPanel>
    </Tabs>
  </div>
)
```
