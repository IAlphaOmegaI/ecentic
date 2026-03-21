# Radio

A set of radio buttons for selecting one option from a group.

## Installation

```bash
bun add @zenncore/web
```

## Usage

```tsx
import { Radio, RadioGroup } from '@zenncore/web';
```

## Components

### Radio

Individual radio button.

```tsx
<Radio value="option1" />
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `value` | `string` | Radio value |
| `checked` | `boolean` | Controlled checked state |
| `onCheckedChange` | `(checked: boolean) => void` | Change callback |
| `classList` | `ClassList` | Style `root` and `indicator` |

### RadioGroup

Container for grouped radios.

```tsx
<RadioGroup value={selected} onValueChange={setSelected}>
  <Radio value="a">Option A</Radio>
  <Radio value="b">Option B</Radio>
</RadioGroup>
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `value` | `string` | Selected value |
| `defaultValue` | `string` | Initial value |
| `onValueChange` | `(value: string) => void` | Change callback |

---

## Examples

### Basic Radio Group

```tsx
const [choice, setChoice] = useState('a');

<RadioGroup value={choice} onValueChange={setChoice}>
  <Radio value="a">Option A</Radio>
  <Radio value="b">Option B</Radio>
  <Radio value="c">Option C</Radio>
</RadioGroup>
```

---

## Notes

- Built on `@base-ui/react/radio-group`
- Radio: unchecked has gray-300 border
- Radio: checked has primary color background
- Indicator shows white/gray dot in center
