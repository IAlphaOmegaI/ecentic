# Avatar

Displays a user avatar image or fallback initials.

## Installation

```bash
bun add @zenncore/web
```

## Usage

```tsx
import { Avatar, AvatarImage, AvatarFallback } from '@zenncore/web';
```

## Components

### Avatar

The root container.

```tsx
<Avatar>
  <AvatarImage src="/user.jpg" alt="User" />
  <AvatarFallback>JD</AvatarFallback>
</Avatar>
```

**Props:** Inherits from Base UI Avatar Root.

### AvatarImage

The image element. Shows fallback while loading.

```tsx
<AvatarImage src="https://example.com/photo.jpg" alt="Profile" />
```

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `src` | `string` | Image source URL |
| `alt` | `string` | Alt text for accessibility |

### AvatarFallback

Displayed when image fails to load or is not provided.

```tsx
<AvatarFallback>JD</AvatarFallback> // Shows "JD"
```

---

## Examples

### Basic Avatar

```tsx
<Avatar>
  <AvatarImage src="/avatar.jpg" alt="John Doe" />
  <AvatarFallback>JD</AvatarFallback>
</Avatar>
```

### With Different Sizes

```tsx
// Small
<Avatar className="w-8 h-8">
  <AvatarImage src="/img.jpg" />
  <AvatarFallback>AB</AvatarFallback>
</Avatar>

// Large
<Avatar className="w-16 h-16">
  <AvatarImage src="/img.jpg" />
  <AvatarFallback>AB</AvatarFallback>
</Avatar>
```

### Avatar Group (multiple)

```tsx
<div className="flex -space-x-2">
  <Avatar><AvatarImage src="/1.jpg" /><AvatarFallback>A</AvatarFallback></Avatar>
  <Avatar><AvatarImage src="/2.jpg" /><AvatarFallback>B</AvatarFallback></Avatar>
  <Avatar><AvatarImage src="/3.jpg" /><AvatarFallback>C</AvatarFallback></Avatar>
</div>
```

---

## Notes

- Built on `@base-ui/react/avatar`
- Shows fallback while image loads
- Supports lazy loading of images
