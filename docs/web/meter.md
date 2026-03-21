# Meter

Displays a value within a known range, like a gauge or progress indicator.

## Installation

```bash
bun add @zenncore/web
```

## Usage

```tsx
import { Meter, MeterLabel, MeterValue } from '@zenncore/web';
```

## Components

### Meter

The root component with track and indicator.

```tsx
<Meter value={75} min={0} max={100} />
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `value` | `number` | Current value |
| `min` | `number` | Minimum value |
| `max` | `number` | Maximum value |
| `classList` | `ClassList` | Style `root`, `track`, `indicator` |

### MeterLabel

Label text.

### MeterValue

Displays the numeric value.

---

## Examples

### Basic Meter

```tsx
<Meter value={65} min={0} max={100}>
  <MeterLabel>Storage</MeterLabel>
  <MeterValue />
</Meter>
```

### With Custom Range

```tsx
<Meter value={500} min={0} max={1000}>
  <MeterLabel>Memory Usage</MeterLabel>
  <MeterValue>500 MB</MeterValue>
</Meter>
```

---

## Notes

- Built on `@base-ui/react/meter`
- Visual indicator fills proportionally
- Accessibility: announced to screen readers
