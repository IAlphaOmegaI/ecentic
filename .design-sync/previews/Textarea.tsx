import { Textarea, TextareaInput } from "@zenncore/web";

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div style={{ width: 360, display: "flex", flexDirection: "column", gap: 8 }}>
    <span
      style={{ fontSize: 13, fontWeight: 500, color: "var(--color-foreground)" }}
    >
      {label}
    </span>
    {children}
  </div>
);

// Hero: a listing description editor with realistic content.
export const ListingDescription = () => (
  <Field label="Product description">
    <Textarea defaultValue="Wireless noise-cancelling headphones with 40-hour battery life, adaptive EQ, and multipoint Bluetooth. Optimized for AI shopping-agent comparisons.">
      <TextareaInput rows={4} />
    </Textarea>
  </Field>
);

export const Placeholder = () => (
  <Field label="Optimization notes">
    <Textarea>
      <TextareaInput
        rows={4}
        placeholder="Describe how this listing should beat competitors…"
      />
    </Textarea>
  </Field>
);

export const Disabled = () => (
  <Field label="Generated rewrite (locked)">
    <Textarea
      disabled
      defaultValue="Claude rewrote this listing to highlight battery life and price — projected win-rate lift +14%."
    >
      <TextareaInput rows={4} />
    </Textarea>
  </Field>
);
