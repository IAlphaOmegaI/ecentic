# Fieldset

A semantic wrapper for form fields that groups related inputs.

## Installation

```bash
bun add @zenncore/web
```

## Usage

```tsx
import { Fieldset, FieldsetLegend } from '@zenncore/web';
```

## Components

### Fieldset

Groups multiple form controls.

```tsx
<Fieldset>
  <FieldsetLegend>Personal Information</FieldsetLegend>
  {/* form fields */}
</Fieldset>
```

### FieldsetLegend

The title/label for the fieldset group.

---

## Examples

### Grouping Related Fields

```tsx
<Fieldset>
  <FieldsetLegend>Contact Details</FieldsetLegend>
  
  <Field>
    <FieldLabel>Email</FieldLabel>
    <FieldControl type="email" />
    <FieldError />
  </Field>
  
  <Field>
    <FieldLabel>Phone</FieldLabel>
    <FieldControl type="tel" />
  </Field>
</Fieldset>
```

---

## Notes

- Built on `@base-ui/react/fieldset`
- Provides semantic grouping for accessibility
- Legend serves as the group heading
