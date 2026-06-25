import {
  Field,
  FieldControl,
  FieldController,
  FieldDescription,
  FieldLabel,
  Form,
} from "@zenncore/web";
import { useForm } from "react-hook-form";

// The Form primitives wire react-hook-form into the Field anatomy: a Field
// (Label + Control + Description/Error) must live inside a FieldController,
// which lives inside a Form bound to a useForm() instance. (For most forms the
// schema-driven InferredForm is preferred — see its card.)
export const ConnectStore = () => {
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
};

export const SingleField = () => {
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
};
