# @zenncore/phone

Phone number utilities for validation, formatting, and country detection.

## Installation

```bash
bun add @zenncore/phone
```

## Usage

```tsx
import {
  formatPhone,
  normalizePhone,
  isValidPhone,
  validatePhone,
  getSignificantNumber,
  inferPhoneCountryConfig,
  countries,
  PhoneCountryConfig,
} from '@zenncore/phone';
```

## Functions

### formatPhone(phone, country)

Formats a phone number according to country rules.

```tsx
formatPhone('5551234567', 'US'); // '(555) 123-4567'
formatPhone('5551234567', 'DE'); // +49 555 1234567
```

### normalizePhone(phone)

Normalizes phone number (removes extra characters).

```tsx
normalizePhone('+1 (555) 123-4567'); // '+15551234567'
```

### isValidPhone(phone, country?)

Checks if phone number is valid.

```tsx
isValidPhone('5551234567', 'US'); // true
isValidPhone('invalid', 'US'); // false
```

### validatePhone(phone, country?)

Returns validation result with details.

```tsx
validatePhone('5551234567', 'US');
// { valid: true, phone: '5551234567', country: 'US' }
```

### getSignificantNumber(phone)

Gets the significant part of the number (without country code).

```tsx
getSignificantNumber('+15551234567'); // '5551234567'
```

### inferPhoneCountryConfig(phone)

Infers country from phone number.

```tsx
inferPhoneCountryConfig('+15551234567');
// { country: 'US', code: '+1' }
```

---

## Types

### Countries

```ts
type Countries = 'AL' | 'DE' | 'US' | // ...
```

### PhoneCountryConfig

```ts
type PhoneCountryConfig = {
  country: Countries;
  code: string; // e.g., '+1', '+49'
  pattern: string; // phone pattern
  length: number;
};
```

---

## Examples

### Validating a Phone Number

```tsx
const result = validatePhone('+1 555 123 4567', 'US');

if (result.valid) {
  console.log('Valid phone');
} else {
  console.log('Invalid:', result.error);
}
```

### Formatting for Display

```tsx
const formatted = formatPhone(phone, country);
return <PhoneFieldValue>{formatted}</PhoneFieldValue>;
```

### Country Detection

```tsx
const config = inferPhoneCountryConfig(userInput);
if (config) {
  setCountry(config.country);
  setPhone(config.code + ' ' + userInput);
}
```

---

## Supported Countries

| Country | Code |
|---------|------|
| Albania | +355 |
| Germany | +49 |
| United States | +1 |
| (more...) | |

---

## Notes

- Country detection based on phone prefix
- Formatting rules per country
- Validation using regex patterns
- Works with `PhoneField` component
