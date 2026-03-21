# Tooltip

A small popup that appears on hover or focus to provide additional information.

## Installation

```bash
bun add @zenncore/web
```

## Usage

```tsx
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipPositioner,
  TooltipPopup,
  TooltipArrow,
} from '@zenncore/web';
```

## Components

### TooltipProvider

Context provider (optional, for nested tooltips).

### Tooltip

Root component.

### TooltipTrigger

Element that triggers the tooltip.

### TooltipPositioner

Positions the popup.

### TooltipPopup

The tooltip content.

### TooltipArrow

Arrow pointing to trigger.

---

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `sideOffset` | `number` | 10 | Distance from trigger |
| `container` | `HTMLElement` | - | Portal container |
| `keepMounted` | `boolean` | - | Keep in DOM when hidden |
| `classList` | `ClassList` | - | Style `positioner`, `portal`, `arrow` |

---

## Examples

### Basic Tooltip

```tsx
<Tooltip>
  <TooltipTrigger>Hover me</TooltipTrigger>
  <TooltipPositioner>
    <TooltipPopup>
      This is a tooltip
    </TooltipPopup>
  </TooltipPositioner>
</Tooltip>
```

### With Arrow

```tsx
<Tooltip>
  <TooltipTrigger>Info</TooltipTrigger>
  <TooltipPositioner>
    <TooltipPopup>
      <TooltipArrow />
      Helpful information
    </TooltipPopup>
  </TooltipPositioner>
</Tooltip>
```

### With Provider

```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger>Button</TooltipTrigger>
    <TooltipPositioner>
      <TooltipPopup>Tooltip text</TooltipPopup>
    </TooltipPositioner>
  </Tooltip>
</TooltipProvider>
```

---

## Notes

- Built on `@base-ui/react/tooltip`
- Opens on hover and focus
- Arrow indicates position
- Default side offset is 10px
