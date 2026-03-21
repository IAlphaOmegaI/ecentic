# Dialog

A modal window that appears on top of the page content, requiring user interaction to dismiss.

## Installation

```bash
bun add @zenncore/web
```

## Usage

```tsx
import {
  Dialog,
  DialogTrigger,
  DialogPopup,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@zenncore/web';
```

## Components

### Dialog

The root component managing dialog state.

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger>Open</DialogTrigger>
  <DialogPopup>
    <DialogTitle>Title</DialogTitle>
    <DialogDescription>Description</DialogDescription>
    <DialogClose>Close</DialogClose>
  </DialogPopup>
</Dialog>
```

### DialogTrigger

The button that opens the dialog.

### DialogPopup

The modal container with backdrop.

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `container` | `HTMLElement` | Portal container |
| `keepMounted` | `boolean` | Keep in DOM when hidden |
| `classList` | `ClassList` | Style `root` and `backdrop` |

### DialogTitle

The dialog heading.

### DialogDescription

Supporting description text.

### DialogClose

Button to close the dialog.

---

## Examples

### Basic Dialog

```tsx
const [open, setOpen] = useState(false);

<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger>Edit Profile</DialogTrigger>
  <DialogPopup>
    <DialogTitle>Edit Profile</DialogTitle>
    <DialogDescription>
      Update your profile information below.
    </DialogDescription>
    {/* form */}
    <DialogClose>Cancel</DialogClose>
    <DialogClose>Save</DialogClose>
  </DialogPopup>
</Dialog>
```

---

## Notes

- Built on `@base-ui/react/dialog`
- Backdrop with opacity transition
- Popup scales in/out with animation
- Focus trapped within dialog when open
- Closes on Escape key or backdrop click
