/** Loop data belongs to one consenting merchant and is never pooled across merchants. */
import { assertMerchant, normalizeReason } from "@ecentic/loop";
import { unwrapResult } from "@zenncore/utils";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { db, schema, type TransactionScope } from "@/server/database";
import { resultifyRead } from "@/server/utils/repository";
import * as Model from "./model";
import type { ReasonCategory } from "./signal-types";
import type { Connection, Lease } from "./types";

export type Scope = { store: string; generation: number; lease?: Lease };
const validScope = (input: Scope) => {
  assertMerchant(input.store);
  if (
    input.lease &&
    (input.lease.store !== input.store ||
      input.lease.generation !== input.generation)
  )
    throw new Error(
      "Loop lease must belong to the requested merchant generation",
    );
};
export const requireScope = async (input: Scope) => {
  validScope(input);
  return input.lease
    ? Model.fenced(input.lease, async (_, connection) => connection)
    : Model.requireActive(input);
};
export const withScope = async <T>(
  input: Scope,
  callback: (
    transaction: TransactionScope,
    connection: Connection,
  ) => Promise<T>,
) => {
  validScope(input);
  return input.lease
    ? Model.fenced(input.lease, callback)
    : Model.withActive(input, callback);
};
export const readContext = async (input: Scope) => {
  const { store, generation } = input;
  assertMerchant(store);
  await requireScope(input);
  const [lines, mappings, products, gaps, proposals] = await Promise.all([
    unwrapResult(
      resultifyRead(() =>
        db
          .select()
          .from(schema.loopReturnLine)
          .where(
            and(
              eq(schema.loopReturnLine.storeId, store),
              eq(schema.loopReturnLine.generation, generation),
              gte(
                schema.loopReturnLine.createdAt,
                new Date(Date.now() - 180 * 864e5),
              ),
            ),
          ),
      ),
    ),
    unwrapResult(
      resultifyRead(() =>
        db
          .select()
          .from(schema.loopReasonMapping)
          .where(eq(schema.loopReasonMapping.storeId, store)),
      ),
    ),
    unwrapResult(
      resultifyRead(() =>
        db
          .select()
          .from(schema.product)
          .where(eq(schema.product.storeId, store)),
      ),
    ),
    unwrapResult(
      resultifyRead(() =>
        db
          .select()
          .from(schema.returnExpectationGap)
          .where(
            and(
              eq(schema.returnExpectationGap.storeId, store),
              eq(schema.returnExpectationGap.generation, generation),
            ),
          ),
      ),
    ),
    unwrapResult(
      resultifyRead(() =>
        db
          .select()
          .from(schema.loopProposal)
          .where(
            and(
              eq(schema.loopProposal.storeId, store),
              eq(schema.loopProposal.generation, generation),
            ),
          )
          .orderBy(desc(schema.loopProposal.revision)),
      ),
    ),
  ]);
  return { lines, mappings, products, gaps, proposals };
};

export const assertNoUnreviewedProposal = async ({
  store,
  product,
}: {
  store: string;
  product: string;
}) => {
  assertMerchant(store);
  const pending = await unwrapResult(
    resultifyRead(() =>
      db
        .select({ id: schema.loopProposal.id })
        .from(schema.loopProposal)
        .where(
          and(
            eq(schema.loopProposal.storeId, store),
            eq(schema.loopProposal.productId, product),
            inArray(schema.loopProposal.status, ["pending", "publishing"]),
          ),
        )
        .limit(1),
    ),
  );
  if (pending.length)
    throw new Error(
      "Review this product's Return signals proposal before publishing another rewrite.",
    );
};

export const hasUnreviewedProposals = async ({ store }: { store: string }) => {
  assertMerchant(store);
  const rows = await unwrapResult(
    resultifyRead(() =>
      db
        .select({ id: schema.loopProposal.id })
        .from(schema.loopProposal)
        .where(
          and(
            eq(schema.loopProposal.storeId, store),
            inArray(schema.loopProposal.status, ["pending", "publishing"]),
          ),
        )
        .limit(1),
    ),
  );
  return rows.length > 0;
};

export const overrideReasonMapping = async (
  input: Scope & {
    mapping: string;
    category: ReasonCategory;
    dataFixable: boolean;
  },
) =>
  withScope(input, async (transaction) => {
    const [mapping] = await transaction
      .update(schema.loopReasonMapping)
      .set({
        category: input.category,
        dataFixable: input.dataFixable,
        source: "merchant",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.loopReasonMapping.id, input.mapping),
          eq(schema.loopReasonMapping.storeId, input.store),
        ),
      )
      .returning();
    if (!mapping) throw new Error("Reason mapping not found");
    const lines = await transaction
      .select()
      .from(schema.loopReturnLine)
      .where(
        and(
          eq(schema.loopReturnLine.storeId, input.store),
          eq(schema.loopReturnLine.generation, input.generation),
        ),
      );
    const affected = [
      ...new Set(
        lines.flatMap((line) => {
          const normalized = normalizeReason(
            input.store,
            line.returnReason,
            line.parentReturnReason,
          );
          return line.productId &&
            normalized.reason === mapping.reason &&
            (normalized.parent ?? "") === mapping.parentReason
            ? [line.productId]
            : [];
        }),
      ),
    ];
    if (affected.length) {
      await transaction
        .update(schema.loopProposal)
        .set({ status: "superseded", updatedAt: new Date() })
        .where(
          and(
            eq(schema.loopProposal.storeId, input.store),
            inArray(schema.loopProposal.productId, affected),
            eq(schema.loopProposal.status, "pending"),
          ),
        );
      await transaction
        .update(schema.returnExpectationGap)
        .set({ status: "open", updatedAt: new Date() })
        .where(
          and(
            eq(schema.returnExpectationGap.storeId, input.store),
            inArray(schema.returnExpectationGap.productId, affected),
            eq(schema.returnExpectationGap.status, "fix_proposed"),
          ),
        );
    }
    await Model.enqueue(
      {
        store: input.store,
        generation: input.generation,
        kind: "analysis",
        key: `analysis:override:${mapping.id}:${Date.now()}`,
      },
      transaction,
    );
  });
