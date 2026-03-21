# Accordion

A vertically stacked set of interactive headings that expand/collapse to reveal content.

## Installation

```bash
bun add @zenncore/web
```

## Usage

```tsx
import {
  Accordion,
,
  AccordionTrigger,
  Accord  AccordionItemionPanel,
} from '@zenncore/web';
```

## Components

### Accordion

The root container for the accordion component.

```tsx
<Accordion defaultValue={['item-1']} multiple>
  <AccordionItem value="item-1">
    <AccordionTrigger>What is this?</AccordionTrigger>
    <AccordionPanel>Content goes here...</AccordionPanel>
  </AccordionItem>
</Accordion>
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `defaultValue` | `string \| string[]` | Initial open item(s) |
| `value` | `string \| string[]` | Controlled value |
| `onValueChange` | `(value: string[]) => void` | Value change callback |
| `multiple` | `boolean` | Allow multiple items open |
| `collapsible` | `boolean` | Allow all items to be closed |

### AccordionItem

A single accordion section.

```tsx
<AccordionItem value="item-1">
  <AccordionTrigger>Section Title</AccordionTrigger>
  <AccordionPanel>Your content here</AccordionPanel>
</AccordionItem>
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `value` | `string` | Unique identifier for the item |
| `disabled` | `boolean` | Disable the item |

### AccordionTrigger

The clickable header that toggles the panel.

```tsx
<AccordionTrigger>Click to expand</AccordionTrigger>
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `classList` | `ClassList` | Customize `root` and `trigger.icon` styles |

### AccordionPanel

The collapsible content panel.

```tsx
<AccordionPanel>Hidden content revealed on expand</AccordionPanel>
```

**Props:** Inherits from Base UI Accordion Panel.

---

## Examples

### Basic Accordion

```tsx
<Accordion defaultValue={['item-1']}>
  <AccordionItem value="item-1">
    <AccordionTrigger>What is React?</AccordionTrigger>
    <AccordionPanel>
      React is a JavaScript library for building user interfaces.
    </AccordionPanel>
  </AccordionItem>
  <AccordionItem value="item-2">
    <AccordionTrigger>What is TypeScript?</AccordionTrigger>
    <AccordionPanel>
      TypeScript is a typed superset of JavaScript.
    </AccordionPanel>
  </AccordionItem>
</Accordion>
```

### Multiple Open Items

```tsx
<Accordion multiple defaultValue={['item-1', 'item-2']}>
  <AccordionItem value="item-1">
    <AccordionTrigger>First Section</AccordionTrigger>
    <AccordionPanel>Content...</AccordionPanel>
  </AccordionItem>
  <AccordionItem value="item-2">
    <AccordionTrigger>Second Section</AccordionTrigger>
    <AccordionPanel>Content...</AccordionPanel>
  </AccordionItem>
</Accordion>
```

---

## Notes

- Built on top of `@base-ui/react/accordion`
- Uses `ChevronDownIcon` for the expand indicator
- Supports keyboard navigation (Enter/Space to toggle)
