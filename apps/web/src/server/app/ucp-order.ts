import { resultify } from "@zenncore/utils";
import { db, schema } from "../database";
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
  return await resultify(
    async () =>
      await db.query.ucpOrder.findFirst({
        where: { storeId, externalOrderId },
      }),
  );
};
