# Button

A clickable button component with multiple variants and color options.

## Installation

```bash
bun add @zenncore/web
```

## Usage

```tsx
import { Button, buttonVariants } from '@zenncore/web';
```

## Variants

| Variant | Description |
|---------|-------------|
| `default` | Primary button with gradient and border |
| `soft` | Soft background with backdrop blur |
| `outline` | Outlined button with transparent bg |
| `ghost` | Text-only button |
| `flat` | Flat solid background |

## Colors

| Color | Description |
|-------|-------------|
| `primary` | Primary brand color |
| `secondary` | Secondary brand color |
| `accent` | Accent color |
| `emphasis` | Emphasis color |
| `neutral` | Neutral gray |
| `error` | Error/destructive |
| `success` | Success state |
| `warning` | Warning state |
| `info` | Informational |

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"default" \| "soft" \| "outline" \| "ghost" \| "flat"` | `"default"` | Button style |
| `tone` | `"default" \| "inverse"` | `"default"` | Light text and focus ring for soft buttons on dark surfaces; other variants are unchanged |
| `color` | Color options | `"primary"` | Button color |
| `size` | `"icon"` | - | Icon-only size |
| `disabled` | `boolean` | `false` | Disabled state |
| `render` | `ReactNode` | - | Custom render |

---

## Examples

### Basic Button

```tsx
<Button>Click me</Button>
```

### With Variant

```tsx
<Button variant="soft" color="secondary">Soft Secondary</Button>
<Button variant="outline" color="error">Outline Error</Button>
<Button variant="ghost" color="info">Ghost Info</Button>
```

### Icon Button

```tsx
<Button size="icon" variant="default" color="primary">
  <PlusIcon className="size-4" />
</Button>
```

### On a dark surface

```tsx
<Button variant="soft" tone="inverse">Explore the platform</Button>
```

The inverse tone keeps the selected color's soft fill and hover treatment. It
uses the shared inverse text and focus-ring tokens instead of text colors
designed for a light canvas. Opt in only when the surrounding surface is dark.

### Using buttonVariants (CVA)

```tsx
import { buttonVariants } from '@zenncore/web';

<button className={buttonVariants({ variant: 'soft', color: 'primary' })}>
  Custom Button
</button>
```

### Disabled

```tsx
<Button disabled>Disabled</Button>
```

---

## Notes

- Built on `@base-ui/react/button`
- Uses `class-variance-authority` (cva) for variant management
- Supports custom rendering via `render` prop
- Active state scales down (95%)
- Supports all standard button props (onClick, type, etc.)
