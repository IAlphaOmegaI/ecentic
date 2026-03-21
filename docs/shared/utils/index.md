# @zenncore/utils

Utility functions, hooks, and type helpers.

## Installation

```bash
bun add @zenncore/utils
```

## Exports

### Helpers

| Helper | Description |
|--------|-------------|
| `cn()` | Merge class names (from `clsx`) |
| `cva()` | Create variant props (class-variance-authority) |
| `createClassName()` | Create class names with defaults |

### Hooks

| Hook | Description |
|------|-------------|
| `useControlled` | Manage controlled/uncontrolled state |
| `useStableCallback` | Create stable callback reference |
| `useMergedRefs` | Merge multiple refs |
| `useIsoLayoutEffect` | Iso layout effect |
| `createContext` | Create typed React context |
| `useSlot` | Slot pattern hook |
| `useAsyncAction` | Handle async actions with loading state |
| `useDebounceCallback` | Debounce a callback |
| `useThrottleCallback` | Throttle a callback |
| `usePrevious` | Get previous value |

### Types

| Type | Description |
|------|-------------|
| `ClassList` | Type for component class lists |
| `ComponentState` | Type for component state |
| `Nullable<T>` | Type that can be T or null |
| `Prettify<T>` | Flatten type for readability |
| `StrictOmit<T, K>` | Omit with strict typing |

---

## Usage

```tsx
import { cn, cva, createClassName } from '@zenncore/utils';
import { useControlled, createContext } from '@zenncore/utils';
```

---

## Examples

### Using cn()

```tsx
import { cn } from '@zenncore/utils';

<div className={cn('base-class', condition && 'conditional-class')} />
```

### Using cva()

```tsx
import { cva } from '@zenncore/utils';

const buttonVariants = cva('btn', {
  variants: {
    variant: {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
    },
  },
});
```

### Using createContext

```tsx
import { createContext } from '@zenncore/utils';

const [MyContext, useMyContext] = createContext<MyValueType>({
  name: 'MyContext',
});
```

### Using useControlled

```tsx
import { useControlled } from '@zenncore/utils';

function MyComponent({ value, defaultValue }) {
  const [controlledValue, setValue] = useControlled({
    controlled: value,
    default: defaultValue,
    name: 'MyComponent',
  });
}
```

---

## Notes

- Exports from `@base-ui/utils` (useControlled, useStableCallback, etc.)
- `cn` wraps `clsx` and `tailwind-merge`
- `cva` is class-variance-authority
- All hooks are typed with TypeScript
