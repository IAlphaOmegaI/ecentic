# Form

A form component with React Hook Form integration and Base UI field primitives.

## Installation

```bash
bun add @zenncore/web
```

## Usage

```tsx
import {
  Form,
  FieldController,
  Field,
  FieldLabel,
  FieldControl,
  FieldDescription,
  FieldError,
} from '@zenncore/web';
import { useForm } from 'react-hook-form';
```

## Components

### Form

The root form component.

```tsx
const form = useForm({ defaultValues: { name: '' } });

<Form form={form} onSubmit={onSubmit}>
  {/* fields */}
</Form>
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `form` | `UseFormReturn` | React Hook Form instance |
| `onSubmit` | `(values) => void` | Submit handler |

### FieldController

Wraps a field with react-hook-form Controller.

```tsx
<FieldController
  name="email"
  control={form.control}
  render={({ field }) => (
    <Field>
      <FieldLabel>Email</FieldLabel>
      <FieldControl {...field} />
    </Field>
  )}
/>
```

### Field

The field container.

### FieldLabel

The field label.

### FieldControl

The input control.

### FieldDescription

Helper text below the field.

### FieldError

Validation error message.

### FieldValidity

Shows validity state.

---

## Examples

### Basic Form

```tsx
const form = useForm({
  defaultValues: { name: '', email: '' },
});

<Form form={form} onSubmit={form.handleSubmit(onSubmit)}>
  <FieldController
    name="name"
    control={form.control}
    render={({ field }) => (
      <Field>
        <FieldLabel>Name</FieldLabel>
        <FieldControl {...field} placeholder="Enter name" />
        <FieldError />
      </Field>
    )}
  />
  
  <FieldController
    name="email"
    control={form.control}
    render={({ field }) => (
      <Field>
        <FieldLabel>Email</FieldLabel>
        <FieldControl {...field} type="email" />
        <FieldError />
      </Field>
    )}
  />
  
  <Button type="submit">Submit</Button>
</Form>
```

### With Descriptions

```tsx
<FieldController
  name="password"
  control={form.control}
  render={({ field }) => (
    <Field>
      <FieldLabel>Password</FieldLabel>
      <FieldControl {...field} type="password" />
      <FieldDescription>Must be at least 8 characters</FieldDescription>
      <FieldError />
    </Field>
  )}
/>
```

---

## Notes

- Built on `@base-ui/react/form` and `@base-ui/react/field`
- Integrates with `react-hook-form`
- Provides field state (invalid, touched, dirty)
- Error messages via `getErrorMessage` utility
