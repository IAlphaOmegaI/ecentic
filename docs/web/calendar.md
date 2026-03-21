# Calendar

A date picker calendar component for selecting dates or date ranges.

## Installation

```bash
bun add @zenncore/web
```

## Usage

```tsx
import { Calendar, CalendarHeader, CalendarBody } from '@zenncore/web';
```

## Components

### Calendar

The main calendar container.

```tsx
<Calendar
  selected={new Date()}
  onDatePick={(date) => console.log(date)}
/>
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `selected` | `Date \| Date[] \| Period` | Selected date(s) |
| `onDatePick` | `(date: Date) => void` | Date selection callback |
| `viewing` | `Date` | Currently viewed month |
| `onViewingChange` | `(date: Date) => void` | Viewing change callback |
| `period` | `Period` | Selectable date range |
| `disabled` | `Disabled` | Disabled dates config |
| `locale` | `Locale` | Custom localization |

### CalendarHeader

Month/year selector header.

```tsx
<CalendarHeader viewing={date} onViewingChange={setDate} />
```

### CalendarBody

The day grid container.

---

## Types

```tsx
type Period = { start: Date; end: Date };

type Disabled = {
  before?: Date | string;
  after?: Date | string;
  days?: number[]; // 0-6, Sunday-Saturday
  range?: Period;
};

type Locale = {
  days: Tuple<string, 7>;
  months: Tuple<string, 12>;
};
```

---

## Examples

### Basic Calendar

```tsx
const [selected, setSelected] = useState(new Date());

<Calendar
  selected={selected}
  onDatePick={(date) => setSelected(date)}
/>
```

### With Date Range

```tsx
const [selected, setSelected] = useState({ start: new Date(), end: new Date() });

<Calendar
  selected={selected}
  onDatePick={(date) => setSelected(date)}
/>
```

### Disabled Dates

```tsx
<Calendar
  selected={new Date()}
  disabled={{
    before: new Date(), // Disable past dates
    days: [0, 6], // Disable Sundays and Saturdays
  }}
/>
```

### Custom Locale

```tsx
<Calendar
  locale={{
    days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  }}
/>
```

---

## Notes

- Uses `date-fns` for date manipulation
- Integrates with `Select` component for month/year dropdowns
- Supports keyboard navigation
