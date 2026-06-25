import { TextField, TextFieldInput, TextFieldMaskToggle } from "@zenncore/web";

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div style={{ width: 320, display: "flex", flexDirection: "column", gap: 6 }}>
    <span
      style={{
        fontSize: 13,
        fontWeight: 500,
        color: "var(--color-foreground)",
      }}
    >
      {label}
    </span>
    {children}
  </div>
);

export const Text = () => (
  <Field label="Store name">
    <TextField>
      <TextFieldInput placeholder="Acme Store" />
    </TextField>
  </Field>
);

export const Email = () => (
  <Field label="Email">
    <TextField type="email">
      <TextFieldInput placeholder="jane@acmestore.com" />
    </TextField>
  </Field>
);

export const Password = () => (
  <Field label="Password">
    <TextField type="password" defaultValue="supersecret">
      <TextFieldInput />
      <TextFieldMaskToggle />
    </TextField>
  </Field>
);

export const Disabled = () => (
  <Field label="Plan (locked)">
    <TextField disabled defaultValue="Enterprise">
      <TextFieldInput />
    </TextField>
  </Field>
);
