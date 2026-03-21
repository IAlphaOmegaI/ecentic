# Number Field

A numeric input with increment/decrement buttons and scrub area for adjusting values.

## Installation

```bash
bun add @zenncore/web
```

## Usage

```tsx
import {
  NumberField,
  NumberFieldInput,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldScrubArea,
} from '@zenncore/web';
```

## Components

### NumberField

Root component.

```tsx
<NumberField
  value={value}
  onValueChange={setValue}
  min={0}
  max={100}
  step={1}
>
  <NumberFieldDecrement />
  <NumberFieldInput />
  <NumberFieldIncrement />
</NumberField>
```

### NumberFieldInput

The number input field.

### NumberFieldDecrement

Button to decrease value (shows MinusIcon).

### NumberFieldIncrement

Button to increase value (shows PlusIcon).

### NumberFieldScrubArea

Draggable area to adjust value.

### NumberFieldGroup

Groups input elements.

---

## Props

| Prop | Type | Description |
|------|------|-------------|
| `value` | `number` | Controlled value |
| `defaultValue` | `number` | Initial value |
| `onValueChange` | `(value: number) => void` | Change callback |
| `min` | `number` | Minimum value |
| `max` | `number` | Maximum value |
| `step` | `number` | Increment step |
| `disabled` | `boolean` | Disabled state |

---

## Examples

### Basic Number Field

```tsx
const [value, setValue] = useState(0);

<NumberField value={value} onValueChange={setValue}>
  <NumberFieldDecrement />
  <NumberFieldInput />
  <NumberFieldIncrement />
</NumberField>
```

### With Constraints

```tsx
<NumberField
  value={value}
  onValueChange={setValue}
  min={0}
  max={100}
  step={5}
>
  <NumberFieldDecrement />
  <NumberFieldInput />
  <NumberFieldIncrement />
</NumberField>
```

### With Scrub Area

```tsx
<NumberField value={value} onValueChange={setValue}>
  <NumberFieldScrubArea>
    <NumberFieldInput />
  </NumberFieldScrubArea>
  <NumberFieldDecrement />
  <NumberFieldIncrement />
</NumberField>
```

---

## Notes

- Built on `@base-ui/react/number-field`
- Keyboard: Arrow Up/Down to adjust
- Scrub area: drag vertically to change
- Respects min/max bounds
