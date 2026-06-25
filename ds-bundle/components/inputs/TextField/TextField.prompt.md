TextField from @zenncore/web. Use via `window.ZennWeb.TextField` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface TextFieldProps {
  name?: string;
  disabled?: boolean;
  children?: React.ReactNode;
  style?: CSSProperties;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  id?: string;
  /** Allows you to replace the component's HTML element with a different tag, or compose it with another component. Accepts a */
  render?: ReactElement<unknown, string | JSXElementConstructor<any>> | ComponentRenderFn<HTMLProps<any>, TextField.State>;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  type?: "text" | "email" | "password";
  className?: string | ((state: TextField.State) => string);
}
```

## Examples

### Text

```jsx
() => (
  <Field label="Store name">
    <TextField>
      <TextFieldInput placeholder="Acme Store" />
    </TextField>
  </Field>
)
```

### Email

```jsx
() => (
  <Field label="Email">
    <TextField type="email">
      <TextFieldInput placeholder="jane@acmestore.com" />
    </TextField>
  </Field>
)
```

### Password

```jsx
() => (
  <Field label="Password">
    <TextField type="password" defaultValue="supersecret">
      <TextFieldInput />
      <TextFieldMaskToggle />
    </TextField>
  </Field>
)
```

### Disabled

```jsx
() => (
  <Field label="Plan (locked)">
    <TextField disabled defaultValue="Enterprise">
      <TextFieldInput />
    </TextField>
  </Field>
)
```
