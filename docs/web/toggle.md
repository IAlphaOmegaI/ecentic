# Toggle

A two-state button that can be pressed to toggle on/off.

## Installation

```bash
bun add @zenncore/web
```

## Usage

```tsx
import { Toggle, ToggleGroup } from '@zenncore/web';
```

## Components

### Toggle

Single toggle button.

```tsx
<Toggle pressed={pressed} onPressedChange={setPressed}>
  Bold
</Toggle>
```

### ToggleGroup

Group of toggle buttons.

```tsx
<ToggleGroup type="multiple" value={values} onValueChange={setValues}>
  <Toggle value="bold">Bold</Toggle>
  <Toggle value="italic">Italic</Toggle>
</ToggleGroup>
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `type` | `"single" \| "multiple"` | Selection mode |
| `value` | `string \| string[]` | Selected value(s) |
| `defaultValue` | `string \| string[]` | Initial value |
| `onValueChange` | `(value) => void` | Change callback |

---

## Examples

### Basic Toggle

```tsx
const [pressed, setPressed] = useState(false);

<Toggle pressed={pressed} onPressedChange={setPressed}>
  <BoldIcon />
</Toggle>
```

### Toggle Group

```tsx
const [formats, setFormats] = useState<string[]>([]);

<ToggleGroup type="multiple" value={formats} onValueChange={setFormats}>
  <Toggle value="bold"><BoldIcon /></Toggle>
  <Toggle value="italic"><ItalicIcon /></Toggle>
  <Toggle value="underline"><UnderlineIcon /></Toggle>
</ToggleGroup>
```

---

## Notes

- Built on `@base-ui/react/toggle`
- `ToggleGroup` with `type="single"` acts like radio buttons
- `ToggleGroup` with `type="multiple"` allows multiple selections
