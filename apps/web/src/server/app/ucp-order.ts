import { and, eq } from "drizzle-orm";
import { schema } from "../database";
import { Environment } from "../utils/environment";
import type { Document } from "../utils/repository";
import { repository } from "../utils/repository";

export const { get, paginate, create, update, destroy, exists, count, find } =
  repository(schema.ucpOrder);

export type Type = Document<typeof schema.ucpOrder>;

export const getForStoreOrder = async ({
  store: storeId,
  externalOrderId,
}: {
  store: string;
  externalOrderId: string;
}) => {
  const rows = await find(Environment.SERVER, {
    where: and(
      eq(schema.ucpOrder.storeId, storeId),
      eq(schema.ucpOrder.externalOrderId, externalOrderId),
    ),
    limit: 1,
  });
  if (!rows.success) return rows;

  return { success: true as const, data: rows.data[0] };
};
