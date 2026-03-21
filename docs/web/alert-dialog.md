# Alert Dialog

A modal dialog that interrupts the user with important information or requires a decision.

## Installation

```bash
bun add @zenncore/web
```

## Usage

```tsx
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogClose,
} from '@zenncore/web';
```

## Components

### AlertDialog

The root component that manages the dialog state.

```tsx
<AlertDialog open={open} onOpenChange={setOpen}>
  <AlertDialogTrigger>Delete</AlertDialogTrigger>
  <AlertDialogPopup>
    <AlertDialogTitle>Delete Item?</AlertDialogTitle>
    <AlertDialogDescription>
      This action cannot be undone.
    </AlertDialogDescription>
    <AlertDialogClose>Cancel</AlertDialogClose>
    <AlertDialogClose>Delete</AlertDialogClose>
  </AlertDialogPopup>
</AlertDialog>
```

**Props:** Inherits from Base UI AlertDialog Root.

### AlertDialogTrigger

The button that opens the dialog.

**Props:** Inherits from Base UI AlertDialog Trigger.

### AlertDialogPopup

The modal dialog container with backdrop.

```tsx
<AlertDialogPopup>
  <AlertDialogTitle>Title</AlertDialogTitle>
  <AlertDialogDescription>Description</AlertDialogDescription>
  <AlertDialogClose>Action</AlertDialogClose>
</AlertDialogPopup>
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `container` | `HTMLElement` | Portal container |
| `keepMounted` | `boolean` | Keep in DOM when hidden |
| `classList` | `ClassList` | Customize `root` and `backdrop` |

### AlertDialogTitle

The dialog title/heading.

```tsx
<AlertDialogTitle>Are you sure?</AlertDialogTitle>
```

**Props:** Inherits from Base UI AlertDialog Title.

### AlertDialogDescription

The dialog description text.

```tsx
<AlertDialogDescription>
  This will permanently delete your account.
</AlertDialogDescription>
```

**Props:** Inherits from Base UI AlertDialog Description.

### AlertDialogClose

The action button that closes the dialog.

```tsx
<AlertDialogClose>Cancel</AlertDialogClose>
<AlertDialogClose>Confirm</AlertDialogClose>
```

**Props:** Inherits from Base UI AlertDialog Close.

---

## Examples

### Delete Confirmation

```tsx
function DeleteButton() {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger className="text-red-600">
        Delete Account
      </AlertDialogTrigger>
      <AlertDialogPopup>
        <AlertDialogTitle>Delete Account?</AlertDialogTitle>
        <AlertDialogDescription>
          This action is permanent. All your data will be lost forever.
        </AlertDialogDescription>
        <div className="flex gap-2 justify-end">
          <AlertDialogClose>Cancel</AlertDialogClose>
          <AlertDialogClose>Delete</AlertDialogClose>
        </div>
      </AlertDialogPopup>
    </AlertDialog>
  );
}
```

---

## Notes

- Built on `@base-ui/react/alert-dialog`
- Includes backdrop with opacity transition
- Popup scales in/out with opacity animation
- Focus is trapped within the dialog when open
