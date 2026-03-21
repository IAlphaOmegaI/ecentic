# Collapsible

A container that can expand/collapse to reveal or hide content.

## Installation

```bash
bun add @zenncore/web
```

## Usage

```tsx
import { Collapsible, CollapsibleTrigger, CollapsiblePanel } from '@zenncore/web';
```

## Components

### Collapsible

The root container.

```tsx
<Collapsible open={open} onOpenChange={setOpen}>
  <CollapsibleTrigger>Toggle</CollapsibleTrigger>
  <CollapsiblePanel>Hidden content</CollapsiblePanel>
</Collapsible>
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `open` | `boolean` | Controlled open state |
| `defaultOpen` | `boolean` | Initial open state |
| `onOpenChange` | `(open: boolean) => void` | Change callback |

### CollapsibleTrigger

The button that toggles the panel.

### CollapsiblePanel

The collapsible content area.

---

## Examples

### Basic Collapsible

```tsx
const [open, setOpen] = useState(false);

<Collapsible open={open} onOpenChange={setOpen}>
  <CollapsibleTrigger>
    {open ? 'Hide' : 'Show'} Details
  </CollapsibleTrigger>
  <CollapsiblePanel>
    <p>This content can be shown or hidden.</p>
  </CollapsiblePanel>
</Collapsible>
```

### With Animation

```tsx
<Collapsible>
  <CollapsibleTrigger>Click to expand</CollapsibleTrigger>
  <CollapsiblePanel className="transition-all duration-300">
    Content animates in/out smoothly.
  </CollapsiblePanel>
</Collapsible>
```

---

## Notes

- Built on `@base-ui/react/collapsible`
- Panel height animates using CSS transitions
- Uses `data-ending-style` and `data-starting-style` for enter/exit animations
