"use server";

import { resultify } from "@zenncore/utils";
import { withAuthentication } from "@/server/utils/authentication";
import { Environment } from "@/server/utils/environment";
import { NotFoundError } from "@/server/utils/error";
import * as Product from "../product";
import { computeProductAudit } from "./audit-compute";
import { checkProductPageSchema } from "./page-schema";

export type { Type } from "./audit-compute";

export const auditProduct = withAuthentication(
  async (context, { product: id }: { product: string }) => {
    const product = await Product.get(Environment.SERVER, id);
    if (!product.success) return product;
    if (!product.data || product.data.userId !== context.session.user.id)
      return { success: false as const, error: new NotFoundError("Product") };

    const record = product.data;

    // Verify schema.org markup on the live product page — agents read the
    // rendered HTML, not the synced structuredData column.
    const pageSchema = record.url
      ? await checkProductPageSchema(record.url)
      : ("no-url" as const);

    const audit = await resultify(() =>
      computeProductAudit({
        pageSchema,
        product: record.id,
        updatedAt: record.updatedAt.toISOString(),
        title: record.title,
        description: record.description,
        price: record.price,
        currency: record.currency,
        sku: record.sku,
        structuredData: record.structuredData,
        images: record.images,
      }),
    );
    if (!audit.success) return audit;

    return { success: true as const, data: audit.data };
  },
  "Audit.auditProduct",
);
