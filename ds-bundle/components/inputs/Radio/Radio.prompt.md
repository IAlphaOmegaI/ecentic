Radio from @zenncore/web. Use via `window.ZennWeb.Radio` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface RadioProps {
  classList?: { root?: string; indicator?: string; };
  /** The unique identifying value of the radio in a group. */
  value: unknown;
  /** Whether the component should ignore user interaction. */
  disabled?: boolean;
  /** Whether the user must choose a value before submitting a form. */
  required?: boolean;
  /** Whether the user should be unable to select the radio button. */
  readOnly?: boolean;
  /** A ref to access the hidden input element. */
  inputRef?: React.Ref;
  /** Whether the component renders a native `<button>` element when replacing it via the `render` prop. Set to `true` if the  */
  nativeButton?: boolean;
  children?: React.ReactNode;
  /** CSS class applied to the element, or a function that returns a class based on the component's state. */
  className?: string | ((state: RadioRootState) => string | undefined);
  /** Style applied to the element, or a function that returns a style object based on the component's state. */
  style?: CSSProperties | ((state: RadioRootState) => React.CSSProperties | undefined);
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  id?: string;
  /** Allows you to replace the component's HTML element with a different tag, or compose it with another component. Accepts a */
  render?: ReactElement<unknown, string | JSXElementConstructor<any>> | ComponentRenderFn<HTMLProps, RadioRootState>;
}
```

## Examples

### ScanFrequency

```jsx
() => (
  <div style={{ width: 320 }}>
    <span
      style={{
        fontSize: 13,
        fontWeight: 500,
        color: "var(--color-foreground)",
        display: "block",
        marginBottom: 8,
      }}
    >
      Scan frequency
    </span>
    <RadioGroup defaultValue="daily">
      <Row>
        <Radio value="hourly" />
        Hourly
      </Row>
      <Row>
        <Radio value="daily" />
        Daily
      </Row>
      <Row>
        <Radio value="weekly" />
        Weekly
      </Row>
    </RadioGroup>
  </div>
)
```

### Selected

```jsx
() => (
  <RadioGroup defaultValue="enabled">
    <Row>
      <Radio value="enabled" />
      Track this competitor
    </Row>
  </RadioGroup>
)
```

### Unselected

```jsx
() => (
  <Row>
    <Radio value="disabled" />
    Ignore this competitor
  </Row>
)
```

### Disabled

```jsx
() => (
  <RadioGroup defaultValue="enterprise" disabled>
    <Row>
      <Radio value="enterprise" />
      <span style={{ opacity: 0.5 }}>Enterprise plan (locked)</span>
    </Row>
  </RadioGroup>
)
```
