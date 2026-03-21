# Combobox

A text input with a dropdown that supports searching, multiple selection via chips, and custom item rendering.

## Installation

```bash
bun add @zenncore/web
```

## Usage

```tsx
import {
  Combobox,
  ComboboxInput,
  ComboboxTrigger,
  ComboboxPositioner,
  ComboboxPopup,
  ComboboxItem,
  ComboboxChips,
  ComboboxChip,
} from '@zenncore/web';
```

## Components

### Combobox

The root component managing state.

### ComboboxInput

The text input field.

### ComboboxTrigger

The clickable trigger.

### ComboboxPositioner

Positions the popup.

### ComboboxPopup

The dropdown menu.

### ComboboxItem

An option in the dropdown.

### ComboboxChips

Container for selected chips (multi-select).

### ComboboxChip

Individual chip for selected item.

### ComboboxChipRemove

Remove button on chip.

### ComboboxGroup / ComboboxGroupLabel

Group items with label.

### ComboboxEmpty

Shown when no results.

---

## Examples

### Single Select

```tsx
const [value, setValue] = useState('');

<Combobox value={value} onValueChange={setValue}>
  <ComboboxInput placeholder="Select..." />
  <ComboboxPositioner>
    <ComboboxPopup>
      <ComboboxItem value="apple">Apple</ComboboxItem>
      <ComboboxItem value="banana">Banana</ComboboxItem>
    </ComboboxPopup>
  </ComboboxPositioner>
</Combobox>
```

### Multi-Select with Chips

```tsx
const [values, setValues] = useState<string[]>([]);

<Combobox multiple value={values} onValueChange={setValues}>
  <ComboboxChips>
    {values.map(v => (
      <ComboboxChip value={v}>
        {v}
        <ComboboxChipRemove />
      </ComboboxChip>
    ))}
  </ComboboxChips>
  <ComboboxPositioner>
    <ComboboxPopup>
      <ComboboxItem value="a">Apple</ComboboxItem>
      <ComboboxItem value="b">Banana</ComboboxItem>
    </ComboboxPopup>
  </ComboboxPositioner>
</Combobox>
```

---

## Notes

- Built on `@base-ui/react/combobox`
- Supports `multiple` prop for multi-select
- Chips display selected items
- Uses `CheckIcon` for selected item indicator
- Integrates with `useFilter` hook
