import { eq } from "drizzle-orm";
import { schema } from "@/server/database";
import type { ExecuteOptions } from "@/server/utils/repository";
import * as Product from "@/server/app/product";
import { Environment } from "@/server/utils/environment";
import { mapProductRowToUcpOffer } from "./map-from-product";
import { ucpProductOfferSchema } from "./schema";

/**
 * Recomputes and persists `ucpOfferJson` for every product in a store after catalog sync.
 */
export const refreshUcpOffersForStore = async (
  environment: typeof Environment.SERVER,
  storeId: string,
  exec?: ExecuteOptions,
): Promise<void> => {
  const found = await Product.find(
    environment,
    {
      where: eq(schema.product.storeId, storeId),
    },
    exec,
  );

  if (!found.success) return;

  for (const row of found.data) {
    const draft = mapProductRowToUcpOffer(row);
    const parsed = ucpProductOfferSchema.safeParse(draft);
    if (!parsed.success) continue;

    await Product.update(
      environment,
      row.id,
      {
        ucpOfferJson: parsed.data as unknown as Record<string, unknown>,
        updatedAt: new Date(),
      },
      exec,
    );
  }
};
