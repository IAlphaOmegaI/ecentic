# Phone Field

An international phone number input with automatic country detection and formatting.

## Installation

```bash
bun add @zenncore/web @zenncore/phone
```

## Usage

```tsx
import { PhoneField, PhoneFieldInput, PhoneFieldCountryCombobox } from '@zenncore/web';
```

## Components

### PhoneField

Root component managing phone number and country state.

```tsx
<PhoneField
  value={phone}
  onValueChange={setPhone}
  defaultCountry="US"
  onCountryChange={setCountry}
/>
```

### PhoneFieldInput

The telephone input field.

### PhoneFieldCountryCombobox

Country code selector dropdown.

### PhoneFieldFlag

Flag display (TODO).

---

## Props

| Prop | Type | Description |
|------|------|-------------|
| `value` | `string` | Phone number value |
| `onValueChange` | `(value: string) => void` | Phone change callback |
| `defaultCountry` | `ISO` | Default country (e.g., "US", "AL") |
| `onCountryChange` | `(country: ISO) => void` | Country change callback |
| `disabled` | `boolean` | Disabled state |

---

## Examples

### Basic Phone Field

```tsx
const [phone, setPhone] = useState('');
const [country, setCountry] = useState('US');

<PhoneField
  value={phone}
  onValueChange={setPhone}
  defaultCountry={country}
  onCountryChange={setCountry}
>
  <PhoneFieldCountryCombobox />
  <PhoneFieldInput placeholder="Enter phone number" />
</PhoneField>
```

---

## Notes

- Built on `@zenncore/phone` utilities
- Auto-detects country from phone number
- Formats based on country rules
- Includes country prefix (+1, etc.)
- Handles paste of full international numbers
