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
| `access(source, path)` | Read a typed dot-separated path, numeric key, or symbol key |
| `merge(target, source)` | Deep merge into a clone of the target |
| `removeUndefinedEntries(object)` | Remove `undefined`, `null`, and empty strings while retaining `false` and `0` |

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
import { useControlled, createContext } from '@zenncore/utils/hooks';
```

---

## Examples

### Async actions

```tsx
import { useAsyncAction } from '@zenncore/utils/hooks';

const [save, pending] = useAsyncAction(saveProduct);
const product = await save(values);
```

Each call resolves with that action's result or rejects with its failure.
`pending` remains true while an action is outstanding and clears after success
or failure; overlapping calls are tracked independently. Transition mode is on
by default. Passing `false` as the second argument disables the transition while
keeping the same completion and pending-state contract. Callers that handle
failures through `Result` can use `resultify(() => save(values))`.

### Object helpers

`access(source, "merchant.address.country")` follows every segment and returns
`undefined` if a parent is absent. `merge` keeps es-toolkit's merge semantics and
return type, including array entries and defined target values when the source
contains `undefined`, while leaving the target unchanged.

`removeUndefinedEntries` only removes top-level `undefined`, `null`, and `""`
entries. It preserves `false`, `0`, empty arrays, and empty objects.

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
