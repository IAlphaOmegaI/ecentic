# Popover

A floating panel that appears relative to a trigger element.

## Installation

```bash
bun add @zenncore/web
```

## Usage

```tsx
import {
  Popover,
  PopoverTrigger,
  PopoverPositioner,
  PopoverPopup,
  PopoverArrow,
  PopoverTitle,
  PopoverDescription,
} from '@zenncore/web';
```

## Components

### Popover

Root component.

### PopoverTrigger

Element that opens the popover.

### PopoverPositioner

Positions the popup.

### PopoverPopup

The floating panel.

### PopoverArrow

Arrow pointing to trigger.

### PopoverTitle

Title heading.

### PopoverDescription

Description text.

---

## Examples

### Basic Popover

```tsx
<Popover>
  <PopoverTrigger>Edit</PopoverTrigger>
  <PopoverPositioner>
    <PopoverPopup>
      <PopoverTitle>Edit Item</PopoverTitle>
      <PopoverDescription>
        Make changes to your item here.
      </PopoverDescription>
      {/* content */}
    </PopoverPopup>
  </PopoverPositioner>
</Popover>
```

---

## Notes

- Built on `@base-ui/react/popover`
- Opens on click
- Closes on outside click or Escape
- Arrow indicates position
