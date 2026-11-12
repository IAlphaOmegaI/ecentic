# Scroll Area

A scrollable container with custom styled scrollbars.

## Installation

```bash
bun add @zenncore/web
```

## Usage

```tsx
import { ScrollArea, ScrollBar } from '@zenncore/web';
```

## Components

### ScrollArea

Main container with viewport.

```tsx
<ScrollArea className="h-48">
  <div>Long content...</div>
</ScrollArea>
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `className` | `string` | Root container class |
| `classList` | `ClassList` | Style `root`, `viewport`, `scrollBar` |
| `viewportProps` | Native viewport props, excluding `children` and `className` | Forward accessibility attributes, focus behavior, and event handlers to the element that scrolls. Use `classList.viewport` for its styles. |

### ScrollBar

Custom scrollbar with thumb.

```tsx
<ScrollArea>
  <div>Content</div>
  <ScrollBar orientation="horizontal" />
</ScrollArea>
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `orientation` | `"horizontal" \| "vertical"` | Scrollbar orientation |

---

## Examples

### Basic Scroll Area

```tsx
<ScrollArea className="h-48 p-4">
  <p>Long content that scrolls...</p>
</ScrollArea>
```

### With Horizontal Scroll

```tsx
<ScrollArea>
  <div className="flex gap-4">
    {items.map(item => <Card key={item.id} {...item} />)}
  </div>
  <ScrollBar orientation="horizontal" />
</ScrollArea>
```

---

## Notes

- Built on `@base-ui/react/scroll-area`
- Custom styled scrollbars
- Supports both horizontal and vertical scrolling
- For code or tables that scroll without containing interactive controls, pass `viewportProps={{ role: 'region', tabIndex: 0, 'aria-label': label }}`. This puts the labeled viewport in the Tab order so arrow keys can scroll it. The optional prop does not change existing callers' defaults.
