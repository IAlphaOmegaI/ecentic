# Toolbar

A container for grouping related actions, controls, or content.

## Installation

```bash
bun add @zenncore/web
```

## Usage

```tsx
import {
  Toolbar,
  ToolbarButton,
  ToolbarLink,
  ToolbarSeparator,
  ToolbarGroup,
  ToolbarInput,
} from '@zenncore/web';
```

## Components

### Toolbar

Root container.

```tsx
<Toolbar>
  <ToolbarButton>Cut</ToolbarButton>
  <ToolbarButton>Copy</ToolbarButton>
  <ToolbarSeparator />
  <ToolbarButton>Paste</ToolbarButton>
</Toolbar>
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `orientation` | `"horizontal" \| "vertical"` | Layout direction |

### ToolbarButton

Button in toolbar.

### ToolbarLink

Link in toolbar.

### ToolbarSeparator

Divider between items.

### ToolbarGroup

Groups toolbar items.

### ToolbarInput

Input in toolbar.

---

## Examples

### Text Formatting Toolbar

```tsx
<Toolbar>
  <ToolbarButton><BoldIcon /></ToolbarButton>
  <ToolbarButton><ItalicIcon /></ToolbarButton>
  <ToolbarButton><UnderlineIcon /></ToolbarButton>
  <ToolbarSeparator />
  <ToolbarButton><AlignLeftIcon /></ToolbarButton>
  <ToolbarButton><AlignCenterIcon /></ToolbarButton>
</Toolbar>
```

---

## Notes

- Built on `@base-ui/react/toolbar`
- Groups related actions
- Horizontal by default, can be vertical
