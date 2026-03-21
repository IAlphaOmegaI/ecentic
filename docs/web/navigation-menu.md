# Navigation Menu

A navigation menu with dropdown content panels, typically used for site navigation.

## Installation

```bash
bun add @zenncore/web
```

## Usage

```tsx
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
  NavigationMenuPositioner,
  NavigationMenuPopup,
  NavigationMenuViewport,
} from '@zenncore/web';
```

## Components

### NavigationMenu

Root component.

### NavigationMenuList

List container.

### NavigationMenuItem

Individual item.

### NavigationMenuTrigger

Trigger for dropdown content.

### NavigationMenuContent

The dropdown panel.

### NavigationMenuLink

Navigation link.

### NavigationMenuPositioner

Positions the popup.

### NavigationMenuPopup

The popup container.

### NavigationMenuArrow

Arrow indicator.

### NavigationMenuViewport

Viewport for nested content.

---

## Examples

### Basic Navigation

```tsx
<NavigationMenu>
  <NavigationMenuList>
    <NavigationMenuItem>
      <NavigationMenuTrigger>Products</NavigationMenuTrigger>
      <NavigationMenuPositioner>
        <NavigationMenuPopup>
          <NavigationMenuContent>
            {/* dropdown content */}
          </NavigationMenuContent>
        </NavigationMenuPopup>
      </NavigationMenuPositioner>
    </NavigationMenuItem>
    <NavigationMenuItem>
      <NavigationMenuLink href="/about">About</NavigationMenuLink>
    </NavigationMenuItem>
  </NavigationMenuList>
</NavigationMenu>
```

---

## Notes

- Built on `@base-ui/react/navigation-menu`
- Supports nested content and links
- Arrow rotates on open
- Viewport constrains nested content
