import { createHash } from "node:crypto";

/** A reviewed listing must still match its original product before any write. */
export const productRevision = (product: {
  id: string;
  title: string;
  description: string | null;
  rawData: string | null;
  structuredData?: string | null;
}) =>
  createHash("sha256")
    .update(
      JSON.stringify([
        product.id,
        product.title,
        product.description,
        product.rawData,
        product.structuredData,
      ]),
    )
    .digest("hex");
