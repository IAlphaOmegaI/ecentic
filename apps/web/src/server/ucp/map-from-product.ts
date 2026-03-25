import type { product } from "@/server/database/schema";
import type { UcpProductOffer } from "./schema";

type ProductRow = typeof product.$inferSelect;

const availabilityForStatus = (status: string | null | undefined) =>
  status === "active"
    ? "https://schema.org/InStock"
    : "https://schema.org/OutOfStock";

/**
 * Maps a catalog `product` row to a Schema.org Product + Offer object for UCP catalogs.
 */
export const mapProductRowToUcpOffer = (row: ProductRow): UcpProductOffer => {
  const price = row.price?.trim() || "0";
  const currency = row.currency?.trim() || "USD";

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: row.title,
    description: row.description ?? undefined,
    sku: row.sku ?? undefined,
    url: row.url ?? undefined,
    offers: {
      "@type": "Offer",
      price,
      priceCurrency: currency,
      availability: availabilityForStatus(row.status),
      url: row.url ?? undefined,
    },
  };
};
