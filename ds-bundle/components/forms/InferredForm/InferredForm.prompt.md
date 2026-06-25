InferredForm from @zenncore/web. Use via `window.ZennWeb.InferredForm` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface InferredFormProps {
  defaultValues?: Partial<z.core.$InferObjectOutput<{ [K in keyof Form]: Form[K]["validator"]; }, {}>>;
  config: Form;
  extend?: (schema: InferredSchema<Form>) => Schema;
  transform?: (value: z.core.output<Schema>) => z.core.output<Schema>;
  children?: React.ReactNode;
  className?: string;
  renderFields?: boolean;
  custom?: { error?: FieldError.Props["render"]; };
  onSubmit?: (data: z.core.$InferObjectOutput<{ [K in keyof Form]: Form[K]["validator"]; }, {}>, form: UseFormReturn<z.core.$InferObjectOutput<{ [K in keyof Form]: Form[K]["validator"]; }, {}>>) => void;
  onBlur?: (event: FocusEvent<HTMLFormElement, Element>, form: UseFormReturn<z.core.$InferObjectOutput<{ [K in keyof Form]: Form[K]["validator"]; }, {}>>) => void;
  onChange?: (data: z.core.$InferObjectOutput<{ [K in keyof Form]: Form[K]["validator"]; }, {}>, form: UseFormReturn<z.core.$InferObjectOutput<{ [K in keyof Form]: Form[K]["validator"]; }, {}>>) => void;
}
```

## Examples

### ConnectStore

```jsx
() => (
  <div style={{ width: 360 }}>
    <InferredForm config={connectConfig} onSubmit={() => {}} />
  </div>
);

// A competitor-tracking form mixing text + a select.
const competitorConfig = {
  competitor: field({
    shape: "text",
    validator: z.string().min(1),
    label: "Competitor brand",
    placeholder: "Anker",
  }),
  marketplace: field({
    shape: "select",
    validator: z.enum(["amazon", "walmart", "shopify"]),
    label: "Marketplace",
    placeholder: "Choose marketplace",
    items: { amazon: "Amazon US", walmart: "Walmart", shopify: "Shopify" },
  }),
}
```

### TrackCompetitor

```jsx
() => (
  <div style={{ width: 360 }}>
    <InferredForm config={competitorConfig} onSubmit={() => {}} />
  </div>
)
```
