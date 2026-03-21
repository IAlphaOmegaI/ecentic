# @zenncore/web

React components for web applications built on [Base UI](https://base-ui.com/) primitives.

## Installation

```bash
bun add @zenncore/web
```

## Categories

### Layout
- [Accordion](./accordion.md) - Expandable sections
- [Collapsible](./collapsible.md) - Toggleable panels
- [Sheet](./sheet.md) - Slide-in panels
- [Separator](./separator.md) - Visual dividers

### Overlays
- [Alert Dialog](./alert-dialog.md) - Modal for decisions
- [Dialog](./dialog.md) - General modal
- [Popover](./popover.md) - Floating panels
- [Preview Card](./preview-card.md) - Hover cards
- [Tooltip](./tooltip.md) - Hover hints
- [Toast](./toast.md) - Notifications

### Forms
- [Autocomplete](./autocomplete.md) - Input with suggestions
- [Checkbox](./checkbox.md) - Checkboxes
- [Combobox](./combobox.md) - Searchable select
- [Fieldset](./fieldset.md) - Field grouping
- [File Upload](./file-upload.md) - Drag-drop uploads
- [Form](./form.md) - React Hook Form
- [Inferred Form](./inferred-form.md) - Schema-based forms
- [Number Field](./number-field.md) - Numeric input
- [Phone Field](./phone-field.md) - Phone input
- [Radio](./radio.md) - Radio buttons
- [Select](./select.md) - Dropdown select
- [Slider](./slider.md) - Range slider
- [Switch](./switch.md) - Toggle switch
- [Text Field](./text-field.md) - Text input

### Data Display
- [Avatar](./avatar.md) - User images
- [Calendar](./calendar.md) - Date picker
- [Data Table](./data-table.md) - Tables
- [Meter](./meter.md) - Gauge
- [Progress](./progress.md) - Progress bar
- [Table](./table.md) - Table components
- [Tabs](./tabs.md) - Tabbed panels

### Navigation
- [Context Menu](./context-menu.md) - Right-click menus
- [Menu](./menu.md) - Dropdown menus
- [Navigation Menu](./navigation-menu.md) - Nav with dropdowns
- [Pagination](./pagination.md) - Page navigation
- [Toolbar](./toolbar.md) - Action toolbars

### Actions
- [Button](./button.md) - Clickable buttons
- [Toggle](./toggle.md) - Toggle buttons
- [Scroll Area](./scroll-area.md) - Custom scroll

---

## Quick Start

```tsx
import { Button, Dialog, DialogTrigger, DialogPopup } from '@zenncore/web';

function Example() {
  return (
    <Dialog>
      <DialogTrigger>Open</DialogTrigger>
      <DialogPopup>
        <h2>Title</h2>
        <p>Content</p>
      </DialogPopup>
    </Dialog>
  );
}
```

## Theming

Components use Tailwind CSS classes. Customize with:
- `className` - Additional styles
- `classList` - Style internal parts (where supported)
