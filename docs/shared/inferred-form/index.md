# @zenncore/inferred-form

Zod schema to form field inference and generation.

## Public field contracts

`GenericField<Interface>` is the discriminated union of the interface's field
shapes, including custom fields. `RefinedProps<Value>` is exported for custom
controls with a typed value and change callback. Field labels and descriptions
accept a string or a render callback receiving `{ isFieldRequired, name }`.

The web `InferredForm` callbacks receive values and a React Hook Form controller
typed from the final schema returned by `extend`. An OTP field can supply its
own `render` callback; otherwise the web renderer supplies the standard slots.

## Installation

```bash
bun add @zenncore/inferred-form
```

## Usage

```tsx
import { 
  Interface, 
  applyFormOptions, 
  field, 
  createToastManager 
} from '@zenncore/inferred-form';
import { z } from 'zod';
```

## Functions

### Interface

Maps Zod types to form components.

```tsx
const MyInterface: Interface<MySchema> = {
  name: { type: 'text', component: TextField },
  age: { type: 'number', component: NumberField },
  role: { type: 'select', component: Select, options: [...] },
};
```

### applyFormOptions()

Applies form options to schema.

```tsx
const schemaWithOptions = applyFormOptions(schema, {
  name: { required: true },
  age: { min: 18 },
});
```

### field()

Creates field configuration.

```tsx
const myField = field({
  type: 'text',
  component: CustomInput,
  props: { placeholder: 'Enter value' },
  validation: { required: true },
});
```

### createToastManager()

Creates toast manager for form notifications.

```tsx
const toastManager = createToastManager();
```

---

## Type Mapping

The package maps Zod types to UI components:

| Zod Type | Form Component |
|----------|----------------|
| `z.string()` | TextField |
| `z.number()` | NumberField |
| `z.boolean()` | Checkbox |
| `z.enum()` | Select |
| `ZodLiteral` | Select |
| `phone` | PhoneField |
| `file` | FileUpload |

---

## Schema Helpers

### Field Props

```tsx
type FieldProps<T> = {
  type: 'text' | 'number' | 'select' | 'phone' | 'file' | 'checkbox';
  component: React.ComponentType<any>;
  props?: Record<string, any>;
  validation?: ZodValidationOptions;
};
```

---

## Examples

### Basic Schema Inference

```tsx
import { Interface } from '@zenncore/inferred-form';
import { z } from 'zod';

const schema = z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number(),
});

// Interface is inferred from schema
function getInterface(schema: typeof schema): Interface<typeof schema> {
  return {
    name: { type: 'text', component: TextField },
    email: { type: 'text', component: TextField },
    age: { type: 'number', component: NumberField },
  };
}
```

### With Validation Options

```tsx
const enhancedSchema = applyFormOptions(schema, {
  name: { required: 'Name is required' },
  email: { required: 'Email is required', pattern: 'email' },
  age: { required: false, min: 18 },
});
```

---

## Notes

- Used by `InferredForm` component in `@zenncore/web`
- Infers form components from Zod schema
- Supports custom field configurations
- Type-safe with TypeScript generics
