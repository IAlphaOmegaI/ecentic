# Text Field

A styled text input component with support for different types.

## Installation

```bash
bun add @zenncore/web
```

## Usage

```tsx
import { TextField, TextFieldInput, TextFieldMaskToggle } from '@zenncore/web';
```

## Components

### TextField

Root container.

### TextFieldInput

The input element.

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `type` | `"text" \| "email" \| "password"` | Input type |
| `value` | `string` | Controlled value |
| `defaultValue` | `string` | Initial value |
| `onValueChange` | `(value: string) => void` | Change callback |
| `disabled` | `boolean` | Disabled state |

### TextFieldMaskToggle

Password visibility toggle.

**Props (for password type):**

| Prop | Type | Description |
|------|------|-------------|
| `masked` | `boolean` | Controlled masked state |
| `defaultMasked` | `boolean` | Initial masked state |
| `onMaskChange` | `(masked: boolean) => void` | Mask change callback |

---

## Examples

### Basic Text Field

```tsx
<TextField>
  <TextFieldInput placeholder="Enter text..." />
</TextField>
```

### Email Field

```tsx
<TextField>
  <TextFieldInput type="email" placeholder="email@example.com" />
</TextField>
```

### Password with Toggle

```tsx
const [masked, setMasked] = useState(true);

<TextField>
  <TextFieldInput
    type="password"
    masked={masked}
    onMaskChange={setMasked}
  />
  <TextFieldMaskToggle />
</TextField>
```

---

## Notes

- Built on Base UI input primitive
- `TextFieldMaskToggle` only works with `type="password"`
- Integrates with Form component for validation
