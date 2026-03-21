# Preview Card

A card that reveals additional content on hover or focus, similar to a tooltip but with richer content.

## Installation

```bash
bun add @zenncore/web
```

## Usage

```tsx
import {
  PreviewCard,
  PreviewCardTrigger,
  PreviewCardPositioner,
  PreviewCardPopup,
  PreviewCardArrow,
} from '@zenncore/web';
```

## Components

### PreviewCard

Root component.

### PreviewCardTrigger

Element that triggers the card.

### PreviewCardPositioner

Positions the popup.

### PreviewCardPopup

The card content.

### PreviewCardArrow

Arrow pointing to trigger.

---

## Examples

### Basic Preview Card

```tsx
<PreviewCard>
  <PreviewCardTrigger>Hover me</PreviewCardTrigger>
  <PreviewCardPositioner>
    <PreviewCardPopup>
      <h4>Preview Title</h4>
      <p>Additional content here...</p>
    </PreviewCardPopup>
  </PreviewCardPositioner>
</PreviewCard>
```

---

## Notes

- Built on `@base-ui/react/preview-card`
- Opens on hover/focus
- Richer content than Tooltip
- Arrow indicates trigger position
