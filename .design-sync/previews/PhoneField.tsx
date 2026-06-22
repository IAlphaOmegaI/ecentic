import { PhoneField, PhoneFieldCountryCombobox, PhoneFieldInput } from "@zenncore/web";

// PhoneField is an inline composite (grid): a country-code combobox + a tel
// input, sharing context from the PhoneField root. Give it a value so the
// formatted significant number shows. PhoneFieldFlag is a placeholder stub in
// the source, so it is intentionally omitted here.
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ width: 320, display: "flex", flexDirection: "column", gap: 6 }}>
    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-foreground)" }}>{label}</span>
    {children}
  </div>
);

export const Default = () => (
  <Field label="Store contact number">
    <PhoneField defaultValue="+12025550147" style={{ width: 320 }}>
      <PhoneFieldCountryCombobox />
      <PhoneFieldInput />
    </PhoneField>
  </Field>
);

export const Disabled = () => (
  <Field label="Verified number (locked)">
    <PhoneField disabled defaultValue="+4915123456789" style={{ width: 320 }}>
      <PhoneFieldCountryCombobox />
      <PhoneFieldInput />
    </PhoneField>
  </Field>
);
