# Checkbox

A binary choice control that can be checked or unchecked.

## Installation

```bash
bun add @zenncore/web
```

## Usage

```tsx
import { Checkbox, CheckboxGroup } from '@zenncore/web';
```

## Components

### Checkbox

The individual checkbox.

```tsx
<Checkbox>Remember me</Checkbox>
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `checked` | `boolean` | Controlled checked state |
| `defaultChecked` | `boolean` | Initial checked state |
| `onCheckedChange` | `(checked: boolean) => void` | Change callback |
| `classList` | `ClassList` | Style `root` and `indicator` parts |

### CheckboxGroup

A group of related checkboxes.

```tsx
<CheckboxGroup>
  <Checkbox value="apple">Apple</Checkbox>
  <Checkbox value="banana">Banana</Checkbox>
</CheckboxGroup>
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `value` | `string[]` | Selected values |
| `defaultValue` | `string[]` | Initial values |
| `onValueChange` | `(value: string[]) => void` | Change callback |

---

## Examples

### Basic Checkbox

```tsx
const [checked, setChecked] = useState(false);

<Checkbox
  checked={checked}
  onCheckedChange={setChecked}
>
  I agree to the terms
</Checkbox>
```

### Checkbox Group

```tsx
const [fruits, setFruits] = useState(['apple']);

<CheckboxGroup value={fruits} onValueChange={setFruits}>
  <Checkbox value="apple">Apple</Checkbox>
  <Checkbox value="banana">Banana</Checkbox>
  <Checkbox value="orange">Orange</Checkbox>
</CheckboxGroup>
```

### With Custom Styles

```tsx
<Checkbox
  classList={{
    root: 'border-2 border-primary',
    indicator: { root: 'text-primary' }
  }}
>
  Custom styled
</Checkbox>
```

---

## Notes

- Built on `@base-ui/react/checkbox`
- Uses `CheckIcon` for the checkmark
- Supports indeterminate state (via `checked="mixed"`)
