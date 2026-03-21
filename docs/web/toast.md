# Toast

A notification component that appears temporarily and can be dismissed.

## Installation

```bash
bun add @zenncore/web
```

## Usage

```tsx
import {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastAction,
  ToastClose,
  useToastManager,
} from '@zenncore/web';
```

## Components

### ToastProvider

Context provider for toasts.

```tsx
<ToastProvider>
  <App />
  <ToastViewport />
</ToastProvider>
```

### ToastViewport

Container for toast notifications.

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `container` | `HTMLElement` | Portal container |

### Toast

Individual toast.

### ToastTitle

Toast title.

### ToastDescription

Toast description.

### ToastAction

Action button.

### ToastClose

Close/dismiss button.

---

## Hooks

### useToastManager

Manages toast state.

```tsx
const { addToast, removeToast } = useToastManager();
addToast({ title: 'Saved', description: 'Changes saved' });
```

### createToastManager

Creates toast manager instance.

---

## Examples

### Basic Toast

```tsx
<ToastProvider>
  <MyApp />
  <ToastViewport />
</ToastProvider>

// In component:
const { addToast } = useToastManager();

<Button onClick={() => addToast({ title: 'Success!' })}>
  Show Toast
</Button>
```

### Toast with Action

```tsx
addToast({
  title: 'Update available',
  description: 'A new version is ready',
  action: <Button>Update</Button>,
});
```

---

## Notes

- Built on `@base-ui/react/toast`
- Swipe to dismiss gesture
- Includes open/close animations
- `useToastManager` for programmatic control
