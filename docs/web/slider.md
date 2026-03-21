# Slider

A range input component for selecting numeric values.

## Installation

```bash
bun add @zenncore/web
```

## Usage

```tsx
import { Slider } from '@zenncore/web';
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `value` | `number \| number[]` | Current value(s) |
| `defaultValue` | `number \| number[]` | Initial value |
| `onValueChange` | `(value: number \| number[]) => void` | Change callback |
| `min` | `number` | Minimum value |
| `max` | `number` | Maximum value |
| `step` | `number` | Increment step |
| `classList` | `ClassList` | Style `root`, `control`, `track`, `indicator`, `thumb` |
| `inputRef` | `RefObject` | Reference to input |
| `onThumbBlur` | `() => void` | Thumb blur callback |

---

## Examples

### Basic Slider

```tsx
const [value, setValue] = useState([50]);

<Slider
  value={value}
  onValueChange={setValue}
  min={0}
  max={100}
/>
```

### Range Slider

```tsx
const [range, setRange] = useState([20, 80]);

<Slider
  value={range}
  onValueChange={setRange}
  min={0}
  max={100}
/>
```

### With Steps

```tsx
<Slider
  value={[25]}
  onValueChange={setValue}
  min={0}
  max={100}
  step={5}
/>
```

---

## Notes

- Built on `@base-ui/react/slider`
- Single value or range (array of 2)
- Keyboard: Arrow keys adjust value
- Click and drag thumb to change
