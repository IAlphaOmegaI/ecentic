PhoneField from @zenncore/web. Use via `window.ZennWeb.PhoneField` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface PhoneFieldProps {
  children?: React.ReactNode;
  style?: CSSProperties;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  id?: string;
  /** Allows you to replace the component's HTML element with a different tag, or compose it with another component. Accepts a */
  render?: ReactElement<unknown, string | JSXElementConstructor<any>> | ComponentRenderFn<HTMLProps<any>, PhoneField.State>;
  defaultValue?: string;
  name?: string;
  disabled?: boolean;
  value?: string;
  onValueChange?: (value: string) => void;
  defaultCountry?: "AL" | "DE" | "GB" | "US";
  onCountryChange?: (country: ISO) => void;
  className?: string | ((state: PhoneField.State) => string);
}
```

## Examples

### Default

```jsx
() => (
  <Field label="Store contact number">
    <PhoneField defaultValue="+12025550147" style={{ width: 320 }}>
      <PhoneFieldCountryCombobox />
      <PhoneFieldInput />
    </PhoneField>
  </Field>
)
```

### Disabled

```jsx
() => (
  <Field label="Verified number (locked)">
    <PhoneField disabled defaultValue="+4915123456789" style={{ width: 320 }}>
      <PhoneFieldCountryCombobox />
      <PhoneFieldInput />
    </PhoneField>
  </Field>
)
```
