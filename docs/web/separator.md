# Separator

A visual divider that separates content.

## Installation

```bash
bun add @zenncore/web
```

## Usage

```tsx
import { Separator } from '@zenncore/web';
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `orientation` | `"horizontal" \| "vertical"` | Divider direction |
| `decorative` | `boolean` | If true, hidden from accessibility tree |

---

## Examples

### Horizontal Separator

```tsx
<div>
  <p>Content above</p>
  <Separator className="my-4" />
  <p>Content below</p>
</div>
```

### Vertical Separator

```tsx
<div className="flex gap-4">
  <div>Left</div>
  <Separator orientation="vertical" className="h-auto" />
  <div>Right</div>
</div>
```

---

## Notes

- Built on `@base-ui/react/separator`
- Horizontal: border-b style
- Use `decorative` for purely visual dividers
