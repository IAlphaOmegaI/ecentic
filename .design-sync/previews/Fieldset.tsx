import {
  Fieldset,
  FieldsetLegend,
  TextField,
  TextFieldInput,
} from "@zenncore/web";

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-foreground)" }}>
      {label}
    </span>
    {children}
  </div>
);

// Fieldset groups related inputs under a titled legend — here, the store
// details captured during onboarding.
export const StoreDetails = () => (
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
export const Competitors = () => (
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
);
