# Switch

A toggle switch for boolean on/off states.

## Installation

```bash
bun add @zenncore/web
```

## Usage

```tsx
import { Switch } from '@zenncore/web';
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `checked` | `boolean` | Controlled checked state |
| `defaultChecked` | `boolean` | Initial state |
| `onCheckedChange` | `(checked: boolean) => void` | Change callback |
| `classList` | `ClassList` | Style `root` and `thumb` |

---

## Examples

### Basic Switch

```tsx
const [enabled, setEnabled] = useState(false);

<Switch
  checked={enabled}
  onCheckedChange={setEnabled}
/>
```

### With Label

```tsx
<div className="flex items-center gap-2">
  <Switch checked={enabled} onCheckedChange={setEnabled} />
  <span>Enable notifications</span>
</div>
```

---

## Notes

- Built on `@base-ui/react/switch`
- Animates thumb position
- Shows as on/off toggle
