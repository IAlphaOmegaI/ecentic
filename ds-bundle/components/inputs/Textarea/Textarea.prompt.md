Textarea from @zenncore/web. Use via `window.ZennWeb.Textarea` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface TextareaProps {
  name?: string;
  disabled?: boolean;
  children?: React.ReactNode;
  style?: CSSProperties;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  id?: string;
  /** Allows you to replace the component's HTML element with a different tag, or compose it with another component. Accepts a */
  render?: ReactElement<unknown, string | JSXElementConstructor<any>> | ComponentRenderFn<HTMLProps<any>, Textarea.State>;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string | ((state: Textarea.State) => string);
}
```

## Examples

### ListingDescription

```jsx
() => (
  <Field label="Product description">
    <Textarea defaultValue="Wireless noise-cancelling headphones with 40-hour battery life, adaptive EQ, and multipoint Bluetooth. Optimized for AI shopping-agent comparisons.">
      <TextareaInput rows={4} />
    </Textarea>
  </Field>
)
```

### Placeholder

```jsx
() => (
  <Field label="Optimization notes">
    <Textarea>
      <TextareaInput
        rows={4}
        placeholder="Describe how this listing should beat competitors…"
      />
    </Textarea>
  </Field>
)
```

### Disabled

```jsx
() => (
  <Field label="Generated rewrite (locked)">
    <Textarea
      disabled
      defaultValue="Claude rewrote this listing to highlight battery life and price — projected win-rate lift +14%."
    >
      <TextareaInput rows={4} />
    </Textarea>
  </Field>
)
```
