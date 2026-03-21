# Select

A dropdown selection component for choosing from a list of options.

## Installation

```bash
bun add @zenncore/web
```

## Usage

```tsx
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPositioner,
  SelectPopup,
  SelectItem,
  SelectArrow,
  SelectSeparator,
  SelectGroup,
  SelectGroupLabel,
} from '@zenncore/web';
```

## Components

### Select

Root component.

### SelectTrigger

Clickable trigger button.

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `classList` | `ClassList` | Style `trigger` and `icon` |

### SelectValue

Displays selected value.

### SelectPositioner

Positions the popup.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `sideOffset` | `number` | 8 | Distance from trigger |

### SelectPopup

The dropdown menu.

### SelectItem

Individual option.

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `value` | `string` | Option value |
| `classList` | `ClassList` | Style `item`, `indicator`, `text` |

### SelectArrow

Arrow indicator.

### SelectSeparator

Divider between items.

### SelectGroup / SelectGroupLabel

Group items with label.

---

## Examples

### Basic Select

```tsx
const [value, setValue] = useState('');

<Select value={value} onValueChange={setValue}>
  <SelectTrigger>
    <SelectValue placeholder="Select option" />
  </SelectTrigger>
  <SelectPositioner>
    <SelectPopup>
      <SelectItem value="apple">Apple</SelectItem>
      <SelectItem value="banana">Banana</SelectItem>
      <SelectItem value="orange">Orange</SelectItem>
    </SelectPopup>
  </SelectPositioner>
</Select>
```

### With Groups

```tsx
<Select value={value} onValueChange={setValue}>
  <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
  <SelectPositioner>
    <SelectPopup>
      <SelectGroup>
        <SelectGroupLabel>Fruits</SelectGroupLabel>
        <SelectItem value="apple">Apple</SelectItem>
        <SelectItem value="banana">Banana</SelectItem>
      </SelectGroup>
      <SelectSeparator />
      <SelectGroup>
        <SelectGroupLabel>Vegetables</SelectGroupLabel>
        <SelectItem value="carrot">Carrot</SelectItem>
      </SelectGroup>
    </SelectPopup>
  </SelectPositioner>
</Select>
```

---

## Notes

- Built on `@base-ui/react/select`
- Keyboard navigable
- Closes on outside click
- Supports option groups
