# Progress

A component that displays the progress of an operation.

## Installation

```bash
bun add @zenncore/web
```

## Usage

```tsx
import { Progress, ProgressLabel, ProgressValue } from '@zenncore/web';
```

## Components

### Progress

Root component with track and indicator.

```tsx
<Progress value={65} min={0} max={100} />
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `value` | `number` | Current value |
| `min` | `number` | Minimum (default: 0) |
| `max` | `number` | Maximum (default: 100) |
| `classList` | `ClassList` | Style `root`, `track`, `indicator` |

### ProgressLabel

Label text.

### ProgressValue

Displays the current value.

---

## Examples

### Basic Progress

```tsx
<Progress value={65}>
  <ProgressLabel>Loading</ProgressLabel>
  <ProgressValue>65%</ProgressValue>
</Progress>
```

### Determinate

```tsx
<Progress value={progress} max={100}>
  <ProgressValue>{progress}%</ProgressValue>
</Progress>
```

---

## Notes

- Built on `@base-ui/react/progress`
- Indicator has smooth 500ms transition
- Accessibility: announces to screen readers
