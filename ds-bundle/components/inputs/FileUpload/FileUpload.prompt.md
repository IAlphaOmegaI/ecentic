FileUpload from @zenncore/web. Use via `window.ZennWeb.FileUpload` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface FileUploadProps {
  children: React.ReactNode;
  accept?: Accept[];
  disabled?: boolean;
  className?: string;
  mode: "multiple" | "single";
  value?: File | File[];
  onValueChange?: ((value: File[]) => void) | ((value: File | null) => void);
}
```

## Examples

### Single

```jsx
() => (
  <div style={{ width: 360 }}>
    <span
      style={{
        fontSize: 13,
        fontWeight: 500,
        color: "var(--color-foreground)",
        display: "block",
        marginBottom: 8,
      }}
    >
      Product image
    </span>
    <FileUpload mode="single" accept={["image/png", "image/jpeg"]}>
      <FileUploadInput />
    </FileUpload>
  </div>
);

// Multiple-file drop zone for bulk-uploading a CSV product feed plus assets.
```

### Multiple

```jsx
() => (
  <div style={{ width: 360 }}>
    <span
      style={{
        fontSize: 13,
        fontWeight: 500,
        color: "var(--color-foreground)",
        display: "block",
        marginBottom: 8,
      }}
    >
      Catalog import
    </span>
    <FileUpload mode="multiple" max={10} accept={[".csv", ".png", ".jpg"]}>
      <FileUploadInput />
      <FileUploadPreview />
    </FileUpload>
  </div>
)
```
