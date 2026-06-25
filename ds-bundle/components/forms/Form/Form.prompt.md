Form from @zenncore/web. Use via `window.ZennWeb.Form` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface FormProps {
  form: UseFormReturn<T>;
  /** Determines when the form should be validated. The `validationMode` prop on `<Field.Root>` takes precedence over this. -  */
  validationMode?: "onBlur" | "onChange" | "onSubmit";
  /** Validation errors returned externally, typically after submission by a server or a form action. This should be an object */
  errors?: Errors;
  /** A ref to imperative actions. - `validate`: Validates all fields when called. Optionally pass a field name to validate a  */
  actionsRef?: RefObject<FormActions>;
  children?: React.ReactNode;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  id?: string;
  /** CSS class applied to the element, or a function that returns a class based on the component's state. */
  className?: string | ((state: FormState) => string | undefined);
  /** Allows you to replace the component's HTML element with a different tag, or compose it with another component. Accepts a */
  render?: ReactElement<unknown, string | JSXElementConstructor<any>> | ComponentRenderFn<HTMLProps, FormState>;
  /** Style applied to the element, or a function that returns a style object based on the component's state. */
  style?: CSSProperties | ((state: FormState) => React.CSSProperties | undefined);
}
```

## Examples

### ConnectStore

```jsx
() => {
  const form = useForm({
    defaultValues: {
      domain: "northwind.myshopify.com",
      email: "ops@northwind.com",
    },
  });
  return (
    <Form
      form={form}
      style={{ width: 360, display: "flex", flexDirection: "column", gap: 16 }}
    >
      <FieldController
        name="domain"
        render={({ field }) => (
          <Field>
            <FieldLabel>Shopify store domain</FieldLabel>
            <FieldControl {...field} />
            <FieldDescription>
              We exchange an OAuth token to sync your catalog.
            </FieldDescription>
          </Field>
        )}
      />
      <FieldController
        name="email"
        render={({ field }) => (
          <Field>
            <FieldLabel>Notification email</FieldLabel>
            <FieldControl type="email" {...field} />
            <FieldDescription>Where win-rate alerts are sent.</FieldDescription>
          </Field>
        )}
      />
    </Form>
  );
}
```

### SingleField

```jsx
() => {
  const form = useForm({
    defaultValues: {
      title: "Wireless Earbuds Pro — 48h Battery, ANC, USB-C",
    },
  });
  return (
    <Form form={form} style={{ width: 360 }}>
      <FieldController
        name="title"
        render={({ field }) => (
          <Field>
            <FieldLabel>Product title</FieldLabel>
            <FieldControl {...field} />
            <FieldDescription>
              Agents cite the title first when comparing products.
            </FieldDescription>
          </Field>
        )}
      />
    </Form>
  );
}
```
