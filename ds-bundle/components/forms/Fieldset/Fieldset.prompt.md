Fieldset from @zenncore/web. Use via `window.ZennWeb.Fieldset` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface FieldsetProps {
  children?: React.ReactNode;
  /** CSS class applied to the element, or a function that returns a class based on the component's state. */
  className?: string | ((state: FieldsetRootState) => string | undefined);
  /** Style applied to the element, or a function that returns a style object based on the component's state. */
  style?: CSSProperties | ((state: FieldsetRootState) => React.CSSProperties | undefined);
  id?: string;
  /** Allows you to replace the component's HTML element with a different tag, or compose it with another component. Accepts a */
  render?: ReactElement<unknown, string | JSXElementConstructor<any>> | ComponentRenderFn<HTMLProps, FieldsetRootState>;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}
```

## Examples

### StoreDetails

```jsx
() => (
  <div style={{ width: 360 }}>
    <Fieldset>
      <FieldsetLegend>Store details</FieldsetLegend>
      <Row label="Store name">
        <TextField>
          <TextFieldInput placeholder="Northwind Outdoors" />
        </TextField>
      </Row>
      <Row label="Storefront domain">
        <TextField>
          <TextFieldInput placeholder="northwind.myshopify.com" />
        </TextField>
      </Row>
    </Fieldset>
  </div>
);

// A second grouping — competitor tracking settings.
```

### Competitors

```jsx
() => (
  <div style={{ width: 360 }}>
    <Fieldset>
      <FieldsetLegend>Competitor tracking</FieldsetLegend>
      <Row label="Primary competitor">
        <TextField defaultValue="Anker PowerCore">
          <TextFieldInput />
        </TextField>
      </Row>
      <Row label="Marketplace">
        <TextField defaultValue="Amazon US">
          <TextFieldInput />
        </TextField>
      </Row>
    </Fieldset>
  </div>
)
```
