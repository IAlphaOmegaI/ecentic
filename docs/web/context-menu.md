# Context Menu

A menu that appears on right-click or long-press, providing quick actions for the selected content.

## Installation

```bash
bun add @zenncore/web
```

## Usage

```tsx
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuPositioner,
  ContextMenuPopup,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuGroup,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuCheckboxItem,
} from '@zenncore/web';
```

## Components

### ContextMenu

The root component.

### ContextMenuTrigger

The element that triggers the menu on right-click.

### ContextMenuPositioner

Positions the popup.

### ContextMenuPopup

The menu container.

### ContextMenuItem

A menu action item.

### ContextMenuSeparator

Divider between items.

### ContextMenuGroup

Groups items together.

### ContextMenuRadioGroup

Radio button group for mutually exclusive options.

### ContextMenuRadioItem

Radio option item.

### ContextMenuCheckboxItem

Checkbox option item.

---

## Examples

### Basic Context Menu

```tsx
<ContextMenu>
  <ContextMenuTrigger className="p-4 border rounded">
    Right-click here
  </ContextMenuTrigger>
  <ContextMenuPositioner>
    <ContextMenuPopup>
      <ContextMenuItem>Copy</ContextMenuItem>
      <ContextMenuItem>Paste</ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem>Delete</ContextMenuItem>
    </ContextMenuPopup>
  </ContextMenuPositioner>
</ContextMenu>
```

### With Radio Group

```tsx
<ContextMenu>
  <ContextMenuTrigger>...</ContextMenuTrigger>
  <ContextMenuPositioner>
    <ContextMenuPopup>
      <ContextMenuRadioGroup value={sortBy} onValueChange={setSortBy}>
        <ContextMenuRadioItem value="name">Name</ContextMenuRadioItem>
        <ContextMenuRadioItem value="date">Date</ContextMenuRadioItem>
        <ContextMenuRadioItem value="size">Size</ContextMenuRadioItem>
      </ContextMenuRadioGroup>
    </ContextMenuPopup>
  </ContextMenuPositioner>
</ContextMenu>
```

---

## Notes

- Built on `@base-ui/react/context-menu`
- Opens on right-click and long-press (mobile)
- Arrow indicates position relative to trigger
- Supports nested submenus
