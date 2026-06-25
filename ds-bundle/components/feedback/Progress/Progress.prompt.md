Progress from @zenncore/web. Use via `window.ZennWeb.Progress` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface ProgressProps {
  classList?: { root?: string; track?: string; indicator?: string; };
  children?: React.ReactNode;
  /** CSS class applied to the element, or a function that returns a class based on the component's state. */
  className?: string | ((state: ProgressRootState) => string | undefined);
  /** Style applied to the element, or a function that returns a style object based on the component's state. */
  style?: CSSProperties | ((state: ProgressRootState) => React.CSSProperties | undefined);
  id?: string;
  /** The locale used by `Intl.NumberFormat` when formatting the value. Defaults to the user's runtime locale. */
  locale?: string | Intl.Locale | readonly (string | Intl.Locale)[];
  /** The current value. The component is indeterminate when value is `null`. */
  value: number;
  /** Allows you to replace the component's HTML element with a different tag, or compose it with another component. Accepts a */
  render?: ReactElement<unknown, string | JSXElementConstructor<any>> | ComponentRenderFn<HTMLProps, ProgressRootState>;
  /** The maximum value. */
  max?: number;
  /** The minimum value. */
  min?: number;
  /** Options to format the value. */
  format?: Intl.NumberFormatOptions;
  /** Accepts a function which returns a string value that provides a human-readable text alternative for the current value of */
  getAriaValueText?: (formattedValue: string | null, value: number | null) => string;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}
```

## Examples

### Simulating

```jsx
() => (
  <Bar label="Simulating across 4 agents" value={45} />
)
```

### NearlyDone

```jsx
() => (
  <Bar label="Syncing Shopify catalog" value={92} />
)
```

### Complete

```jsx
() => <Bar label="Listing optimization" value={100} />
```

### Indeterminate

```jsx
() => (
  <Bar label="Discovering competitors…" value={null} />
)
```
