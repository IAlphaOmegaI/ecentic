# @zenncore/icons

SVG icon components.

## Installation

```bash
bun add @zenncore/icons
```

## Usage

```tsx
import { 
  ArrowRightIcon,
  CheckIcon,
  ChevronDownIcon,
  PlusIcon,
  XIcon,
} from '@zenncore/icons';
```

## Available Icons

| Icon | Description |
|------|-------------|
| `ArrowRightIcon` | Arrow pointing right |
| `CheckIcon` | Checkmark |
| `CheckBadgeIcon` | Badge with check |
| `ChevronDownIcon` | Chevron down |
| `ChevronLeftIcon` | Chevron left |
| `ChevronRightIcon` | Chevron right |
| `ChevronYIcon` | Vertical chevron |
| `CursorGrowIcon` | Cursor grow |
| `DocumentDocxIcon` | Word document |
| `DocumentJpgIcon` | JPG document |
| `DocumentPdfIcon` | PDF document |
| `DocumentPngIcon` | PNG document |
| `DoubleChevronLeftIcon` | Double chevron left |
| `DoubleChevronRightIcon` | Double chevron right |
| `DownloadIcon` | Download |
| `EyeIcon` | Eye (show) |
| `EyeClosedIcon` | Eye closed (hide) |
| `FileIcon` | Generic file |
| `HandleYIcon` | Horizontal handle |
| `LoaderIcon` | Loading spinner |
| `MenuIcon` | Menu/hamburger |
| `MinusIcon` | Minus |
| `PhoneIcon` | Phone |
| `PhotoIcon` | Photo/image |
| `PlusIcon` | Plus |
| `SendMessageIcon` | Send message |
| `SquareChartIcon` | Square chart |
| `SunsetIcon` | Sunset |
| `SupportIcon` | Support |
| `UploadIcon` | Upload |
| `XIcon` | Close/X |

---

## Examples

### Basic Usage

```tsx
import { CheckIcon, PlusIcon } from '@zenncore/icons';

<Button>
  <PlusIcon className="mr-2" />
  Add Item
</Button>

{isValid && <CheckIcon className="text-green-500" />}
```

### With ClassName

```tsx
<ChevronDownIcon className="size-4 rotate-180" />
```

---

## Notes

- All icons are SVG components
- Support `className` for styling
- Can be sized with Tailwind (size-4, size-6, etc.)
- Can be animated with CSS transforms
