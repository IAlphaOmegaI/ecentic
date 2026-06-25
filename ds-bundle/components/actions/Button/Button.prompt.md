Button from @zenncore/web. Use via `window.ZennWeb.Button` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface ButtonProps {
  /** Allows you to replace the component's HTML element with a different tag, or compose it with another component. Accepts a */
  render?: ReactElement<unknown, string | JSXElementConstructor<any>> | ComponentRenderFn<Omit<ButtonProps, "ref"> & RefAttributes<HTMLElement>, { disabled: boolean; }>;
  children?: React.ReactNode;
  /** Style applied to the element, or a function that returns a style object based on the component's state. */
  style?: CSSProperties | ((state: ButtonState) => React.CSSProperties | undefined);
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  id?: string;
  /** Whether the button should be focusable when disabled. */
  focusableWhenDisabled?: boolean;
  /** Whether the component renders a native `<button>` element when replacing it via the `render` prop. Set to `false` if the */
  nativeButton?: boolean;
  className?: string | ((state: { disabled: boolean; }) => string);
  variant?: "flat" | "default" | "soft" | "outline" | "ghost";
  size?: "icon";
}
```

## Examples

### Variants

```jsx
() => (
  <Row>
    <Button variant="default" color="primary">Run simulation</Button>
    <Button variant="soft" color="primary">Optimize listing</Button>
    <Button variant="outline" color="primary">View report</Button>
    <Button variant="ghost" color="primary">Cancel</Button>
    <Button variant="flat" color="primary">Add competitor</Button>
  </Row>
)
```

### Colors

```jsx
() => (
  <Row>
    <Button color="primary">Primary</Button>
    <Button color="secondary">Secondary</Button>
    <Button color="success">Success</Button>
    <Button color="warning">Warning</Button>
    <Button color="error">Error</Button>
    <Button color="info">Info</Button>
    <Button color="neutral">Neutral</Button>
  </Row>
)
```

### Soft

```jsx
() => (
  <Row>
    <Button variant="soft" color="primary">Winning</Button>
    <Button variant="soft" color="success">Approved</Button>
    <Button variant="soft" color="warning">At risk</Button>
    <Button variant="soft" color="error">Losing</Button>
  </Row>
)
```

### Disabled

```jsx
() => (
  <Row>
    <Button disabled>Add to Cart — $139</Button>
    <Button variant="soft" color="primary" disabled>Processing…</Button>
  </Row>
)
```
