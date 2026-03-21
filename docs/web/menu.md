# Menu

A dropdown menu for displaying a list of actions or options.

## Installation

```bash
bun add @zenncore/web
```

## Usage

```tsx
import {
  Menu,
  MenuTrigger,
  MenuPositioner,
  MenuPopup,
  MenuItem,
  MenuSeparator,
  MenuGroup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuCheckboxItem,
} from '@zenncore/web';
```

## Components

### Menu

Root component.

### MenuTrigger

Button that opens the menu.

### MenuPositioner

Positions the popup.

### MenuPopup

The menu panel.

### MenuItem

A menu action.

### MenuSeparator

Divider.

### MenuGroup / MenuGroupLabel

Group items.

### MenuRadioGroup / MenuRadioItem

Radio options.

### MenuCheckboxItem

Checkbox option.

### Menubar

Horizontal menu bar.

### SubMenu / SubMenuTrigger

Nested menus.

---

## Examples

### Basic Menu

```tsx
<Menu>
  <MenuTrigger>Actions</MenuTrigger>
  <MenuPositioner>
    <MenuPopup>
      <MenuItem>Copy</MenuItem>
      <MenuItem>Paste</MenuItem>
      <MenuSeparator />
      <MenuItem>Delete</MenuItem>
    </MenuPopup>
  </MenuPositioner>
</Menu>
```

### With Radio Group

```tsx
<Menu>
  <MenuTrigger>Sort By</MenuTrigger>
  <MenuPositioner>
    <MenuPopup>
      <MenuRadioGroup value={sort} onValueChange={setSort}>
        <MenuRadioItem value="name">Name</MenuRadioItem>
        <MenuRadioItem value="date">Date</MenuRadioItem>
      </MenuRadioGroup>
    </MenuPopup>
  </MenuPositioner>
</Menu>
```

---

## Notes

- Built on `@base-ui/react/menu`
- Opens on click (use Tooltip for hover)
- Keyboard navigable
