Toolbar from @zenncore/web. Use via `window.ZennWeb.Toolbar` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface ToolbarProps {
  children?: React.ReactNode;
  /** CSS class applied to the element, or a function that returns a class based on the component's state. */
  className?: string | ((state: ToolbarRootState) => string | undefined);
  /** Style applied to the element, or a function that returns a style object based on the component's state. */
  style?: CSSProperties | ((state: ToolbarRootState) => React.CSSProperties | undefined);
  id?: string;
  disabled?: boolean;
  /** If `true`, using keyboard navigation will wrap focus to the other end of the toolbar once the end is reached. */
  loopFocus?: boolean;
  /** Allows you to replace the component's HTML element with a different tag, or compose it with another component. Accepts a */
  render?: ReactElement<unknown, string | JSXElementConstructor<any>> | ComponentRenderFn<HTMLProps, ToolbarRootState>;
  /** The orientation of the toolbar. */
  orientation?: "horizontal" | "vertical";
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}
```

## Examples

### ListingEditor

```jsx
() => (
  <div
    style={{
      width: 560,
      border: "1px solid var(--color-accent-foreground)",
      borderRadius: 8,
      padding: 6,
      background: "var(--color-background)",
    }}
  >
    <Toolbar style={{ display: "flex", alignItems: "center" }}>
      <ToolbarGroup style={{ display: "flex" }}>
        <ToolbarButton style={{ fontWeight: 700 }}>B</ToolbarButton>
        <ToolbarButton style={{ fontStyle: "italic" }}>I</ToolbarButton>
        <ToolbarButton style={{ textDecoration: "underline" }}>U</ToolbarButton>
      </ToolbarGroup>
      <ToolbarSeparator
        style={{
          width: 1,
          alignSelf: "stretch",
          margin: "4px 4px",
          background: "var(--color-accent-foreground)",
        }}
      />
      <ToolbarButton>AI rewrite title</ToolbarButton>
      <ToolbarButton>Add spec</ToolbarButton>
      <ToolbarSeparator
        style={{
          width: 1,
          alignSelf: "stretch",
          margin: "4px 4px",
          background: "var(--color-accent-foreground)",
        }}
      />
      <ToolbarLink
        href="#"
        style={{
          padding: "0 12px",
          fontSize: 14,
          color: "var(--color-primary)",
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
        }}
      >
        Preview
      </ToolbarLink>
    </Toolbar>
  </div>
);

// A products-table actions bar with a search input on the right.
```

### TableActions

```jsx
() => (
  <div
    style={{
      width: 560,
      border: "1px solid var(--color-accent-foreground)",
      borderRadius: 8,
      padding: 6,
      background: "var(--color-background)",
    }}
  >
    <Toolbar style={{ display: "flex", alignItems: "center" }}>
      <ToolbarButton>Run simulation</ToolbarButton>
      <ToolbarButton>Add competitor</ToolbarButton>
      <ToolbarButton>Export</ToolbarButton>
      <ToolbarSeparator
        style={{
          width: 1,
          alignSelf: "stretch",
          margin: "4px 4px",
          background: "var(--color-accent-foreground)",
        }}
      />
      <div
        style={{
          marginLeft: "auto",
          display: "flex",
          alignItems: "center",
          gap: 6,
          border: "1px solid var(--color-accent-foreground)",
          borderRadius: 6,
          padding: "0 8px",
          height: 32,
        }}
      >
        <SearchIcon style={{ width: 14, height: 14, color: "var(--color-foreground-dimmed)" }} />
        <ToolbarInput
          placeholder="Search products"
          style={{
            border: "none",
            outline: "none",
            background: "transparent",
            fontSize: 14,
            color: "var(--color-foreground)",
            width: 150,
          }}
        />
      </div>
    </Toolbar>
  </div>
)
```
