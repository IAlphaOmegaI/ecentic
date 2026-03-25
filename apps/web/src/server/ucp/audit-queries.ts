import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/server/database";
import { schema } from "@/server/database";

/**
 * Latest compliance score per product for the current page of catalog rows.
 */
export const fetchLatestUcpAuditScoresForProducts = async (
  userId: string,
  productIds: string[],
): Promise<Map<string, number>> => {
  const map = new Map<string, number>();
  if (productIds.length === 0) return map;

  const rows = await db
    .select()
    .from(schema.ucpAudit)
    .where(
      and(
        eq(schema.ucpAudit.userId, userId),
        inArray(schema.ucpAudit.productId, productIds),
      ),
    )
    .orderBy(desc(schema.ucpAudit.createdAt));

  for (const row of rows) {
    if (!map.has(row.productId)) {
      map.set(row.productId, row.score);
    }
  }

  return map;
};
