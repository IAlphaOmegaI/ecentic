"use server";

// Loop data is available only to its consenting merchant and is never pooled.
import { resultify, unwrapResult } from "@zenncore/utils";
import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/server/database";
import { withAuthentication } from "@/server/utils/authentication";
import { withSubscription } from "@/server/utils/entitlement";
import { resultifyRead } from "@/server/utils/repository";
import { categories } from "./analysis";
import * as AnalysisModel from "./analysis-model";
import * as Checks from "./checks";
import * as Measurement from "./measurement";
import * as Model from "./model";
import * as Proposals from "./proposals";
import type { FieldDiff, ReturnSignals, SignalMetric } from "./signal-types";
import { productFingerprint } from "./signals";

const refresh = () => {
  revalidatePath("/dashboard/[store]/products", "page");
  revalidatePath("/dashboard/[store]/products/[id]", "page");
  revalidatePath("/dashboard/[store]/products/return-signals", "page");
  revalidatePath("/dashboard/[store]/optimize", "page");
  revalidatePath("/dashboard/settings", "page");
};
const strings = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];

export const getSignals = withAuthentication(
  async (context, input: { store: string; product?: string }) =>
    resultify(async (): Promise<ReturnSignals> => {
      const parsed = z
        .object({
          store: z.string().min(1),
          product: z.string().min(1).optional(),
        })
        .parse(input);
      await Model.requireStore({
        store: parsed.store,
        user: context.session.user.id,
      });
      const connection = await Model.getConnection(parsed);
      const connected = Boolean(
        connection &&
          !connection.disconnectedAt &&
          (connection.apiKey || connection.accessToken),
      );
      const [
        gaps,
        products,
        checks,
        proposals,
        measurements,
        mappings,
        orders,
      ] = await Promise.all([
        unwrapResult(
          resultifyRead(() =>
            db
              .select()
              .from(schema.returnExpectationGap)
              .where(
                and(
                  eq(schema.returnExpectationGap.storeId, parsed.store),
                  parsed.product
                    ? eq(schema.returnExpectationGap.productId, parsed.product)
                    : undefined,
                ),
              ),
          ),
        ),
        unwrapResult(
          resultifyRead(() =>
            db
              .select()
              .from(schema.product)
              .where(
                and(
                  eq(schema.product.storeId, parsed.store),
                  parsed.product
                    ? eq(schema.product.id, parsed.product)
                    : undefined,
                ),
              ),
          ),
        ),
        connected
          ? unwrapResult(
              resultifyRead(() =>
                db
                  .select()
                  .from(schema.loopSignalCheck)
                  .where(eq(schema.loopSignalCheck.storeId, parsed.store))
                  .orderBy(desc(schema.loopSignalCheck.createdAt)),
              ),
            )
          : [],
        connected
          ? unwrapResult(
              resultifyRead(() =>
                db
                  .select()
                  .from(schema.loopProposal)
                  .where(eq(schema.loopProposal.storeId, parsed.store))
                  .orderBy(desc(schema.loopProposal.revision)),
              ),
            )
          : [],
        unwrapResult(
          resultifyRead(() =>
            db
              .select()
              .from(schema.loopMeasurement)
              .where(eq(schema.loopMeasurement.storeId, parsed.store))
              .orderBy(desc(schema.loopMeasurement.publishedAt)),
          ),
        ),
        connected
          ? unwrapResult(
              resultifyRead(() =>
                db
                  .select()
                  .from(schema.loopReasonMapping)
                  .where(eq(schema.loopReasonMapping.storeId, parsed.store)),
              ),
            )
          : [],
        connected
          ? unwrapResult(
              resultifyRead(() =>
                db
                  .select({
                    storeId: schema.aiOrderAttribution.storeId,
                    shopifyOrderId: schema.aiOrderAttribution.shopifyOrderId,
                    orderedAt: schema.aiOrderAttribution.orderedAt,
                  })
                  .from(schema.aiOrderAttribution)
                  .where(eq(schema.aiOrderAttribution.storeId, parsed.store)),
              ),
            )
          : [],
      ]);
      const lines =
        connected && connection
          ? (
              await AnalysisModel.readContext({
                store: parsed.store,
                generation: connection.generation,
              })
            ).lines
          : [];
      const signals: ReturnSignals["signals"] = gaps
        .filter((gap) => gap.status !== "dismissed")
        .flatMap((gap) => {
          const product = products.find((entry) => entry.id === gap.productId);
          if (!product) return [];
          const proposal = proposals.find((entry) => entry.gapId === gap.id);
          const measurement = measurements.find(
            (entry) =>
              entry.productId === gap.productId &&
              entry.baseline["attribute"] === gap.attribute,
          );
          const fingerprint = productFingerprint(parsed.store, product);
          const recent = checks
            .filter(
              (check) =>
                check.gapId === gap.id &&
                check.expected["fingerprint"] === fingerprint,
            )
            .filter(
              (check, index, entries) =>
                entries.findIndex(
                  (entry) => entry.surface === check.surface,
                ) === index,
            );
          const exchanges = gap.evidence["exchanges"] as
            | {
                up?: number;
                down?: number;
                same?: number;
                oneSizeUp?: number;
                known?: number;
              }
            | undefined;
          return [
            {
              id: gap.id,
              productId: product.id,
              title: product.title,
              attribute: gap.attribute,
              direction: gap.direction,
              count: gap.count,
              share: gap.share,
              refundValue: gap.refundValue ?? "0",
              refundEstimated: gap.evidence["refundEstimated"] === true,
              currency: gap.currency ?? "MIXED",
              status: gap.status,
              windowStart: gap.windowStart.toISOString(),
              windowEnd: gap.windowEnd.toISOString(),
              comments: strings(gap.evidence["comments"]),
              attributes: strings(gap.evidence["attributes"]),
              exchanges: {
                up: exchanges?.up ?? 0,
                down: exchanges?.down ?? 0,
                same: exchanges?.same ?? 0,
                oneSizeUp: exchanges?.oneSizeUp ?? 0,
                known: exchanges?.known ?? 0,
              },
              checks: recent.map((check) => ({
                id: check.id,
                surface: check.surface,
                status: check.status,
                prompt: check.prompt,
                answer:
                  typeof check.observed?.["answer"] === "string"
                    ? check.observed["answer"]
                    : null,
                verdict:
                  typeof check.observed?.["explanation"] === "string"
                    ? check.observed["explanation"]
                    : check.error,
                evidence: check.evidence,
                checkedAt: check.checkedAt?.toISOString() ?? null,
              })),
              proposal: proposal
                ? {
                    id: proposal.id,
                    revision: proposal.revision,
                    status: proposal.status,
                    diff: Array.isArray(proposal.diff["fields"])
                      ? (proposal.diff["fields"] as FieldDiff[])
                      : [],
                    requiresMerchantApproval: proposal.requiresMerchantApproval,
                    publishedAt: proposal.publishedAt?.toISOString() ?? null,
                  }
                : null,
              measurement:
                measurement &&
                measurement.baseline["before"] &&
                measurement.baseline["controlBefore"] &&
                measurement.snapshot["after"] &&
                measurement.snapshot["controlAfter"]
                  ? {
                      before: measurement.baseline["before"] as SignalMetric,
                      after: measurement.snapshot["after"] as SignalMetric,
                      controlBefore: (measurement.snapshot["controlBefore"] ??
                        measurement.baseline["controlBefore"]) as SignalMetric,
                      controlAfter: measurement.snapshot[
                        "controlAfter"
                      ] as SignalMetric,
                      controlProducts:
                        typeof measurement.snapshot["controlProducts"] ===
                        "number"
                          ? measurement.snapshot["controlProducts"]
                          : measurement.controlProductIds.length,
                      excludedControls:
                        typeof measurement.snapshot["excludedControls"] ===
                        "number"
                          ? measurement.snapshot["excludedControls"]
                          : 0,
                      collecting: measurement.snapshot["collecting"] !== false,
                    }
                  : null,
              aiStarted: Measurement.knownAiReturns({
                store: parsed.store,
                lines,
                mappings,
                product: product.id,
                attribute: gap.attribute,
                orders,
                start: gap.windowStart,
                end: gap.windowEnd,
              }),
            },
          ];
        })
        .sort(
          (first, second) =>
            first.currency.localeCompare(second.currency) ||
            Number(second.refundValue) - Number(first.refundValue) ||
            first.title.localeCompare(second.title),
        );
      return {
        connected,
        signals,
        mappings: mappings.map(
          ({ id, reason, parentReason, category, dataFixable, source }) => ({
            id,
            reason,
            parentReason,
            category,
            dataFixable,
            source,
          }),
        ),
        captureConfigured: Boolean(process.env.SCRAPELLM_API_KEY),
        orderedUnitsAvailable: false,
        aiAttributionCoverage: "verified_checkout_receipts_only",
      };
    }),
  "LoopSignals.getSignals",
);

export const overrideReason = withAuthentication(
  async (
    context,
    input: {
      store: string;
      mapping: string;
      category: string;
      dataFixable: boolean;
    },
  ) =>
    resultify(async () => {
      const parsed = z
        .object({
          store: z.string().min(1),
          mapping: z.string().min(1),
          category: z.enum(categories),
          dataFixable: z.boolean(),
        })
        .parse(input);
      await Model.requireStore({
        store: parsed.store,
        user: context.session.user.id,
      });
      const connection = await Model.requireActive(parsed);
      await AnalysisModel.overrideReasonMapping({
        ...parsed,
        generation: connection.generation,
      });
      refresh();
      return { updated: true };
    }),
  "LoopSignals.overrideReason",
);

export const requestChecks = withSubscription(
  async (context, input: { store: string }) =>
    resultify(async () => {
      await Model.requireStore({
        store: input.store,
        user: context.session.user.id,
      });
      const connection = await Model.requireActive(input);
      const queued = await Checks.queueChecks({
        store: input.store,
        generation: connection.generation,
      });
      refresh();
      return queued;
    }),
  "LoopSignals.requestChecks",
);

export const approveProposal = withSubscription(
  async (
    context,
    input: { store: string; proposal: string; revision: number },
  ) =>
    resultify(async () => {
      const published = await Proposals.approve({
        ...input,
        user: context.session.user.id,
      });
      refresh();
      return published;
    }),
  "LoopSignals.approveProposal",
);

export const recoverProposal = withSubscription(
  async (
    context,
    input: { store: string; proposal: string; revision: number },
  ) =>
    resultify(async () => {
      const recovered = await Proposals.recover({
        ...input,
        user: context.session.user.id,
      });
      refresh();
      return recovered;
    }),
  "LoopSignals.recoverProposal",
);

export const dismissProposal = withAuthentication(
  async (
    context,
    input: { store: string; proposal: string; revision: number },
  ) =>
    resultify(async () => {
      const dismissed = await Proposals.dismiss({
        ...input,
        user: context.session.user.id,
      });
      refresh();
      return dismissed;
    }),
  "LoopSignals.dismissProposal",
);
