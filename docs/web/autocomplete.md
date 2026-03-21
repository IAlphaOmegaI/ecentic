# Autocomplete

A text input that displays a popup with suggestions that can be filtered by typing.

## Installation

```bash
bun add @zenncore/web
```

## Usage

```tsx
import {
  Autocomplete,
  AutocompleteInput,
  AutocompleteTrigger,
  AutocompletePositioner,
  AutocompletePopup,
  AutocompleteItem,
} from '@zenncore/web';
```

## Components

### Autocomplete

The root component managing state.

```tsx
<Autocomplete
  options={['Apple', 'Banana', 'Orange']}
  onValueChange={console.log}
>
  <AutocompleteInput placeholder="Search..." />
  <AutocompletePositioner>
    <AutocompletePopup>
      <AutocompleteItem value="Apple" />
    </AutocompletePopup>
  </AutocompletePositioner>
</Autocomplete>
```

**Props:** Inherits from Base UI Autocomplete.

### AutocompleteInput

The text input field.

### AutocompleteTrigger

The clickable trigger button.

### AutocompletePositioner

Positions the popup relative to trigger.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `sideOffset` | `number` | 4 | Distance from trigger |

### AutocompletePopup

The dropdown popup container.

### AutocompleteItem

An individual suggestion option.

### AutocompleteGroup / AutocompleteGroupLabel

Group items with a label.

### AutocompleteEmpty

Shown when no options match.

### AutocompleteStatus

Displays input status/metadata.

---

## Examples

### Basic Autocomplete

```tsx
const fruits = ['Apple', 'Banana', 'Orange', 'Mango', 'Grape'];

<Autocomplete options={fruits}>
  <AutocompleteInput placeholder="Select fruit" />
  <AutocompletePositioner>
    <AutocompletePopup>
      {fruits.map(fruit => (
        <AutocompleteItem key={fruit} value={fruit}>
          {fruit}
        </AutocompleteItem>
      ))}
    </AutocompletePopup>
  </AutocompletePositioner>
</Autocomplete>
```

### With Groups

```tsx
<Autocomplete>
  <AutocompleteInput placeholder="Search" />
  <AutocompletePositioner>
    <AutocompletePopup>
      <AutocompleteGroupLabel>Fruits</AutocompleteGroupLabel>
      <AutocompleteItem value="apple">Apple</AutocompleteItem>
      <AutocompleteItem value="banana">Banana</AutocompleteItem>
      <AutocompleteSeparator />
      <AutocompleteGroupLabel>Vegetables</AutocompleteGroupLabel>
      <AutocompleteItem value="carrot">Carrot</AutocompleteItem>
    </AutocompletePopup>
  </AutocompletePositioner>
</Autocomplete>
```

---

## Notes

- Built on `@base-ui/react/autocomplete`
- Supports keyboard navigation (arrow keys, enter, escape)
- Integrates with Combobox's `useFilter` hook for custom filtering
