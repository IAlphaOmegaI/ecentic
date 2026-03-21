# Inferred Form

A form component that automatically generates form fields based on Zod schema inference.

## Installation

```bash
bun add @zenncore/web @zenncore/inferred-form
```

## Usage

```tsx
import { InferredForm, InferredFormField, field } from '@zenncore/web';
import { z } from 'zod';
```

## Components

### InferredForm

The main form component that generates fields from a Zod schema.

```tsx
const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  age: z.number().min(18),
});

<InferredForm
  schema={schema}
  defaultValues={{ name: '', email: '', age: 0 }}
  onSubmit={(data) => console.log(data)}
>
  {/* fields generated automatically */}
</InferredForm>
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `schema` | `ZodSchema` | Zod schema for inference |
| `defaultValues` | `object` | Initial form values |
| `onSubmit` | `(values) => void` | Submit handler |
| `config` | `object` | Field configurations |
| `onBlur` | `(e) => void` | Blur event handler |
| `onChange` | `(e) => void` | Change event handler |

### InferredFormField

Individual field override (for custom rendering).

### field()

Creates field configuration for custom fields.

```tsx
field({
  type: 'text',
  component: TextField,
  props: { placeholder: 'Enter name' },
});
```

---

## Field Type Mapping

The form automatically maps Zod types to components:

| Zod Type | Form Component |
|----------|----------------|
| `z.string()` | TextField |
| `z.number()` | NumberField |
| `z.boolean()` | Checkbox |
| `z.enum()` / `ZodEnum` | Select |
| `ZodLiteral` | Select |
| `z.string().phone()` | PhoneField |
| `file` | FileUpload |

---

## Examples

### Basic Inferred Form

```tsx
const userSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email'),
  role: z.enum(['admin', 'user', 'guest']),
});

<InferredForm
  schema={userSchema}
  defaultValues={{ name: '', email: '', role: 'user' }}
  onSubmit={handleSubmit}
>
  <Button type="submit">Submit</Button>
</InferredForm>
```

### With Field Config

```tsx
<InferredForm
  schema={schema}
  config={{
    name: {
      component: TextField,
      props: { placeholder: 'Enter your name' },
    },
    email: {
      component: TextField,
      props: { type: 'email' },
    },
  }}
>
  {/* fields */}
</InferredForm>
```

### With Custom Fields

```tsx
import { field } from '@zenncore/web';

const schema = z.object({
  name: z.string(),
  description: z.string(),
});

<InferredForm schema={schema}>
  <InferredFormField
    name="description"
    render={(fieldProps) => (
      <Textarea {...fieldProps} />
    )}
  />
</InferredForm>
```

---

## Notes

- Built on `@zenncore/inferred-form`
- Infers field types from Zod schema
- Supports custom field configurations
- Integrates with react-hook-form
- Maps Zod validation errors to field errors
