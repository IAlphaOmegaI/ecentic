/**
 * Exports the demo store's products as a Shopify-importable CSV.
 *
 * Reads the products already seeded by `seed-demo.ts` and writes a CSV in
 * Shopify's standard product-import format. Upload it via Shopify Admin →
 * Products → Import. Image URLs must be publicly reachable (the seeded
 * picsum.photos URLs are).
 *
 * Usage:
 *   bun scripts/export-shopify-csv.ts                      # contact@ecentic.ai
 *   bun scripts/export-shopify-csv.ts --email=foo@bar.com --out=products.csv
 */

import { writeFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { db, schema } from "@/server/database";

const parseArgs = () => {
  const args = new Map<string, string>();
  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (match) args.set(match[1]!, match[2]!);
  }
  return {
    email: args.get("email") ?? "contact@ecentic.ai",
    out: args.get("out") ?? "ecentic-shopify-products.csv",
  };
};

// Shopify product-import columns (subset that covers title, body, pricing,
// SKU, images and status). Extra image rows repeat the Handle only.
const COLUMNS = [
  "Handle",
  "Title",
  "Body (HTML)",
  "Vendor",
  "Product Category",
  "Type",
  "Tags",
  "Published",
  "Option1 Name",
  "Option1 Value",
  "Variant SKU",
  "Variant Inventory Tracker",
  "Variant Inventory Qty",
  "Variant Inventory Policy",
  "Variant Fulfillment Service",
  "Variant Price",
  "Variant Compare At Price",
  "Variant Requires Shipping",
  "Variant Taxable",
  "Image Src",
  "Image Position",
  "Status",
] as const;

const cell = (value: string | null | undefined): string => {
  const text = value ?? "";
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
};

const handleFromUrl = (url: string | null, fallback: string) => {
  if (!url) return fallback;
  const match = url.match(/\/products\/([^/?#]+)/);
  return match?.[1] ?? fallback;
};

const parseImages = (value: string | null): string[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((src) => typeof src === "string")
      : [];
  } catch {
    return [];
  }
};

const main = async () => {
  const { email, out } = parseArgs();

  const [user] = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.email, email))
    .limit(1);

  if (!user) {
    console.error(`No user found with email "${email}".`);
    process.exit(1);
  }

  const products = await db
    .select()
    .from(schema.product)
    .where(eq(schema.product.userId, user.id));

  if (products.length === 0) {
    console.error(`No products found for ${email}. Run db:seed:demo first.`);
    process.exit(1);
  }

  const rows: string[][] = [[...COLUMNS]];

  for (const [index, product] of products.entries()) {
    const handle = handleFromUrl(product.url, `ecentic-product-${index + 1}`);
    const allImages = parseImages(product.images);
    const [firstImage, ...restImages] = allImages;

    // Primary row: full product + variant + first image.
    rows.push([
      handle,
      product.title,
      product.description ?? "",
      "Ecentic",
      "Electronics > Audio",
      "Audio & Electronics",
      "demo, ecentic, audio",
      "TRUE",
      "Title",
      "Default Title",
      product.sku ?? "",
      "shopify",
      "100",
      "deny",
      "manual",
      product.price ?? "0.00",
      product.compareAtPrice ?? "",
      "TRUE",
      "TRUE",
      firstImage ?? "",
      firstImage ? "1" : "",
      product.status === "active" ? "active" : "draft",
    ]);

    // Extra image rows: Handle + Image Src + Image Position only.
    restImages.forEach((src, imageIndex) => {
      const row = COLUMNS.map(() => "");
      row[0] = handle; // Handle
      row[19] = src; // Image Src
      row[20] = String(imageIndex + 2); // Image Position
      rows.push(row);
    });
  }

  const csv = rows.map((row) => row.map(cell).join(",")).join("\n");
  const path = `${process.cwd()}/scripts/${out}`;
  writeFileSync(path, `${csv}\n`, "utf8");

  console.log(`Wrote ${products.length} products to ${path}`);
  console.log("Import via Shopify Admin → Products → Import → Upload file.");
  process.exit(0);
};

main().catch((error) => {
  console.error("CSV export failed.");
  console.error(error);
  process.exit(1);
});
