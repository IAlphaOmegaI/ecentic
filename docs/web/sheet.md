# Sheet

A slide-in panel that appears from the edge of the screen.

## Installation

```bash
bun add @zenncore/web
```

## Usage

```tsx
import {
  Sheet,
  SheetTrigger,
  SheetPopup,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@zenncore/web';
```

## Components

### Sheet

Root component.

### SheetTrigger

Button that opens the sheet.

### SheetPopup

The sliding panel.

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `side` | `"top" \| "right" \| "bottom" \| "left"` | Which edge it slides from |
| `classList` | `ClassList` | Style `root`, `backdrop`, `close` |

### SheetHeader

Header section.

### SheetTitle

Title text.

### SheetDescription

Description text.

### SheetFooter

Footer section.

### SheetClose

Close button.

---

## Examples

### Right Sheet

```tsx
const [open, setOpen] = useState(false);

<Sheet open={open} onOpenChange={setOpen}>
  <SheetTrigger>Open</SheetTrigger>
  <SheetPopup side="right">
    <SheetHeader>
      <SheetTitle>Edit Settings</SheetTitle>
      <SheetDescription>
        Make changes to your settings here.
      </SheetDescription>
    </SheetHeader>
    {/* content */}
    <SheetFooter>
      <SheetClose>Cancel</SheetClose>
      <SheetClose>Save</SheetClose>
    </SheetFooter>
  </SheetPopup>
</Sheet>
```

### Bottom Sheet (mobile)

```tsx
<Sheet>
  <SheetTrigger>Open</SheetTrigger>
  <SheetPopup side="bottom">
    <SheetTitle>Options</SheetTitle>
    {/* content */}
  </SheetPopup>
</Sheet>
```

---

## Notes

- Built on `@base-ui/react/dialog`
- Slides in from specified edge
- Includes backdrop
- Focus trapped within sheet
