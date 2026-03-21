# File Upload

A drag-and-drop file upload component with preview support.

## Installation

```bash
bun add @zenncore/web
```

## Usage

```tsx
import { FileUpload, FileUploadInput, FileUploadPreview } from '@zenncore/web';
```

## Components

### FileUpload

The root provider component.

```tsx
<FileUpload
  mode="single" // or "multiple"
  accept={['image/*', 'application/pdf']}
  onValueChange={(file) => console.log(file)}
>
  <FileUploadInput />
  <FileUploadPreview />
</FileUpload>
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `mode` | `"single" \| "multiple"` | Upload mode |
| `accept` | `Accept[]` | Accepted file types |
| `value` | `File \| File[]` | Controlled value |
| `onValueChange` | `(File\|File[]) => void` | Change callback |
| `disabled` | `boolean` | Disabled state |
| `max` | `number` | Max files (multi mode) |

### FileUploadInput

The drop zone and file picker.

### FileUploadPreview

Shows uploaded file(s) as preview cards.

---

## Accepted File Types

```tsx
type Accept =
  | "audio/*"
  | "image/*"
  | "video/*"
  | "text/plain"
  | "text/csv"
  | "application/pdf"
  | "application/json"
  | "image/png"
  | "image/jpeg"
  | "image/gif"
  | "video/mp4"
  | "video/webm"
  | "audio/mpeg"
  | "audio/wav"
  | ".pdf"
  | ".csv"
  | ".doc"
  | ".docx"
  | ".png"
  | ".jpeg"
  | ".jpg"
  | ".mp4"
  | ".mp3"
  | ".zip";
```

---

## Examples

### Single File Upload

```tsx
const [file, setFile] = useState<File | null>(null);

<FileUpload
  mode="single"
  accept={['image/*']}
  value={file}
  onValueChange={setFile}
>
  <FileUploadInput />
  {file && <FileUploadPreview />}
</FileUpload>
```

### Multiple File Upload

```tsx
const [files, setFiles] = useState<File[]>([]);

<FileUpload
  mode="multiple"
  accept={['image/*', 'application/pdf']}
  max={5}
  value={files}
  onValueChange={setFiles}
>
  <FileUploadInput />
  {files.length > 0 && <FileUploadPreview />}
</FileUpload>
```

---

## Notes

- Uses controlled component pattern
- Supports drag-and-drop
- Shows file type icon in preview
- Integrates with ScrollArea for overflow
- TODO: Implement `useRender` for more composability
