import { FileUpload, FileUploadInput, FileUploadPreview } from "@zenncore/web";

// Single-file drop zone for uploading a product image. The input shows the
// dashed drop target with an upload icon and prompt.
export const Single = () => (
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
export const Multiple = () => (
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
);
