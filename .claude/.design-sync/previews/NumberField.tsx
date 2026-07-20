import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@zenncore/web";

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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

// Hero: stepper with decrement / input / increment.
export const Stepper = () => (
  <Field label="Competitors to track">
    <NumberField defaultValue={8} min={1} max={50}>
      <NumberFieldGroup>
        <NumberFieldDecrement />
        <NumberFieldInput />
        <NumberFieldIncrement />
      </NumberFieldGroup>
    </NumberField>
  </Field>
);

export const Plain = () => (
  <Field label="Daily scan limit">
    <NumberField defaultValue={24} min={1} max={96}>
      <NumberFieldGroup>
        <NumberFieldInput />
      </NumberFieldGroup>
    </NumberField>
  </Field>
);

export const Disabled = () => (
  <Field label="Enterprise seat count (locked)">
    <span style={{ display: "flex", opacity: 0.5 }}>
      <NumberField defaultValue={50} disabled>
        <NumberFieldGroup>
          <NumberFieldDecrement />
          <NumberFieldInput />
          <NumberFieldIncrement />
        </NumberFieldGroup>
      </NumberField>
    </span>
  </Field>
);
