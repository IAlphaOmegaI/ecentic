/** Only one merchant's products can participate in a return measurement or control set. */
import { unwrapResult } from "@zenncore/utils";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/server/database";
import { resultifyRead } from "@/server/utils/repository";
import * as AnalysisModel from "./analysis-model";
import type { SignalMetric } from "./signal-types";
import {
  combineMetrics,
  measure,
  measurementMappings,
  selectControls,
} from "./signals";

export const freezeBaseline = async ({
  store,
  generation,
  product,
  attribute,
  at,
}: AnalysisModel.Scope & { product: string; attribute: string; at: Date }) => {
  const context = await AnalysisModel.readContext({ store, generation });
  const target = context.products.find((entry) => entry.id === product);
  if (!target) throw new Error("Product unavailable");
  const published = await unwrapResult(
    resultifyRead(() =>
      db
        .select({ productId: schema.listingOptimization.productId })
        .from(schema.listingOptimization)
        .innerJoin(
          schema.product,
          eq(schema.product.id, schema.listingOptimization.productId),
        )
        .where(
          and(
            eq(schema.product.storeId, store),
            eq(schema.listingOptimization.status, "published"),
          ),
        ),
    ),
  );
  const controls = selectControls({
    store,
    product: target,
    products: context.products,
    excluded: [
      ...context.proposals
        .filter((entry) => entry.status !== "dismissed")
        .map((entry) => entry.productId),
      ...published.map((entry) => entry.productId),
    ],
  });
  const windowDays = Number(process.env["LOOP_GAP_WINDOW_DAYS"] ?? "60");
  const start = new Date(at.getTime() - windowDays * 864e5);
  return {
    controls,
    windowDays,
    baseline: {
      attribute,
      before: measure({
        store,
        lines: context.lines,
        mappings: context.mappings,
        products: [product],
        attribute,
        start,
        end: at,
      }),
      controlBefore: measure({
        store,
        lines: context.lines,
        mappings: context.mappings,
        products: controls,
        attribute,
        start,
        end: at,
      }),
      perControl: controls.map((id) => ({
        product: id,
        metric: measure({
          store,
          lines: context.lines,
          mappings: context.mappings,
          products: [id],
          attribute,
          start,
          end: at,
        }),
      })),
      mappings: context.mappings.map(
        ({ storeId, reason, parentReason, category, dataFixable }) => ({
          storeId,
          reason,
          parentReason,
          category,
          dataFixable,
        }),
      ),
    },
  };
};

export const refreshMeasurements = async (input: AnalysisModel.Scope) => {
  const context = await AnalysisModel.readContext(input);
  const published = await unwrapResult(
    resultifyRead(() =>
      db
        .select({
          productId: schema.listingOptimization.productId,
          publishedAt: schema.listingOptimization.publishedAt,
        })
        .from(schema.listingOptimization)
        .innerJoin(
          schema.product,
          eq(schema.product.id, schema.listingOptimization.productId),
        )
        .where(
          and(
            eq(schema.product.storeId, input.store),
            eq(schema.listingOptimization.status, "published"),
          ),
        ),
    ),
  );
  const measurements = await unwrapResult(
    resultifyRead(() =>
      db
        .select()
        .from(schema.loopMeasurement)
        .where(eq(schema.loopMeasurement.storeId, input.store)),
    ),
  );
  for (const measurement of measurements) {
    if (
      measurement.snapshot["collecting"] === false ||
      typeof measurement.baseline["attribute"] !== "string" ||
      !Array.isArray(measurement.baseline["mappings"])
    )
      continue;
    const frozen = measurement.baseline["mappings"] as typeof context.mappings;
    const mappings = measurementMappings(input.store, frozen, context.mappings);
    const retained = Array.isArray(measurement.snapshot["eligibleControlIds"])
      ? (measurement.snapshot["eligibleControlIds"] as string[])
      : measurement.controlProductIds;
    const controls = retained.filter(
      (id) =>
        !published.some(
          (entry) =>
            entry.productId === id &&
            entry.publishedAt &&
            entry.publishedAt >= measurement.publishedAt,
        ) &&
        !context.proposals.some(
          (entry) =>
            entry.productId === id &&
            entry.publishedAt &&
            entry.publishedAt >= measurement.publishedAt,
        ),
    );
    const end = new Date(
      Math.min(
        Date.now(),
        measurement.publishedAt.getTime() + measurement.windowDays * 864e5,
      ),
    );
    const attribute = measurement.baseline["attribute"];
    const after = measure({
      store: input.store,
      lines: context.lines,
      mappings,
      products: [measurement.productId],
      attribute,
      start: measurement.publishedAt,
      end,
    });
    const controlAfter = measure({
      store: input.store,
      lines: context.lines,
      mappings,
      products: controls,
      attribute,
      start: measurement.publishedAt,
      end,
    });
    const perControl = Array.isArray(measurement.baseline["perControl"])
      ? (measurement.baseline["perControl"] as {
          product: string;
          metric: SignalMetric;
        }[])
      : [];
    const controlBefore = combineMetrics(
      input.store,
      perControl
        .filter((entry) => controls.includes(entry.product))
        .map((entry) => entry.metric),
      new Date(
        measurement.publishedAt.getTime() - measurement.windowDays * 864e5,
      ),
      measurement.publishedAt,
    );
    await AnalysisModel.withScope(input, async (transaction) => {
      await transaction
        .update(schema.loopMeasurement)
        .set({
          snapshot: {
            after,
            controlAfter,
            controlBefore,
            controlProducts: controls.length,
            excludedControls:
              measurement.controlProductIds.length - controls.length,
            eligibleControlIds: controls,
            collecting:
              end.getTime() <
              measurement.publishedAt.getTime() +
                measurement.windowDays * 864e5,
          },
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.loopMeasurement.id, measurement.id),
            eq(schema.loopMeasurement.storeId, input.store),
          ),
        );
    });
  }
};

export { emptyMetric, knownAiReturns } from "./signals";
