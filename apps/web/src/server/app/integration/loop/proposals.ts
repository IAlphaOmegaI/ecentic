/** Loop proposals use only one merchant's evidence and require review before publication. */
import { createHash } from "node:crypto";
import { resultify, unwrapResult } from "@zenncore/utils";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import * as Shopify from "@/server/app/integration/shopify";
import * as Store from "@/server/app/store";
import { db, schema } from "@/server/database";
import { resultifyRead } from "@/server/utils/repository";
import * as AnalysisModel from "./analysis-model";
import * as Measurement from "./measurement";
import * as Model from "./model";
import { feedbackDiff, productFingerprint, reasonFingerprint } from "./signals";

export const createProposal = async (
  input: AnalysisModel.Scope & { gap: string },
) => {
  const context = await AnalysisModel.readContext(input);
  const gap = context.gaps.find((entry) => entry.id === input.gap);
  if (!gap || gap.status === "dismissed" || gap.status === "fix_published")
    return null;
  const product = context.products.find((entry) => entry.id === gap.productId);
  if (!product) return null;
  const checks = await unwrapResult(
    resultifyRead(() =>
      db
        .select()
        .from(schema.loopSignalCheck)
        .where(
          and(
            eq(schema.loopSignalCheck.storeId, input.store),
            eq(schema.loopSignalCheck.gapId, input.gap),
          ),
        )
        .orderBy(desc(schema.loopSignalCheck.createdAt)),
    ),
  );
  const fingerprint = productFingerprint(input.store, product);
  const reasons = reasonFingerprint(
    input.store,
    product.id,
    context.lines,
    context.mappings,
  );
  const evidenceFingerprint = createHash("sha256")
    .update(
      JSON.stringify([
        gap.attribute,
        gap.count,
        gap.share,
        gap.evidence["comments"],
        gap.evidence["attributes"],
      ]),
    )
    .digest("hex");
  const evidence = checks.filter(
    (check) =>
      check.expected["fingerprint"] === fingerprint &&
      !["pending", "running", "failed"].includes(check.status),
  );
  if (!evidence.length) return null;
  const comments =
    Array.isArray(gap.evidence["attributes"]) &&
    gap.evidence["attributes"].length
      ? gap.evidence["attributes"]
      : gap.evidence["comments"];
  const diff = feedbackDiff({
    store: input.store,
    product,
    attribute: gap.attribute,
    count: gap.count,
    comments: Array.isArray(comments)
      ? comments.filter(
          (comment): comment is string => typeof comment === "string",
        )
      : [],
  });
  return AnalysisModel.withScope(input, async (transaction) => {
    const mappings = await transaction
      .select()
      .from(schema.loopReasonMapping)
      .where(eq(schema.loopReasonMapping.storeId, input.store));
    if (
      reasonFingerprint(input.store, product.id, context.lines, mappings) !==
      reasons
    )
      return null;
    const [currentGap] = await transaction
      .select()
      .from(schema.returnExpectationGap)
      .where(
        and(
          eq(schema.returnExpectationGap.storeId, input.store),
          eq(schema.returnExpectationGap.id, gap.id),
        ),
      );
    if (
      !currentGap ||
      currentGap.status === "dismissed" ||
      currentGap.status === "fix_published"
    )
      return null;
    const previous = await transaction
      .select()
      .from(schema.loopProposal)
      .where(
        and(
          eq(schema.loopProposal.storeId, input.store),
          eq(schema.loopProposal.gapId, input.gap),
        ),
      )
      .orderBy(desc(schema.loopProposal.revision))
      .limit(1);
    if (
      previous[0]?.status === "published" ||
      previous[0]?.status === "publishing"
    )
      return previous[0];
    if (
      previous[0]?.original["fingerprint"] === fingerprint &&
      previous[0]?.original["reasons"] === reasons &&
      previous[0]?.original["evidenceFingerprint"] === evidenceFingerprint &&
      previous[0]?.status !== "superseded"
    ) {
      if (previous[0].status === "pending")
        await transaction
          .update(schema.loopProposal)
          .set({
            evidence: {
              ...gap.evidence,
              count: gap.count,
              share: gap.share,
              checks: evidence.map((check) => ({
                id: check.id,
                surface: check.surface,
                status: check.status,
                evidence: check.evidence,
                observed: check.observed,
              })),
            },
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(schema.loopProposal.id, previous[0].id),
              eq(schema.loopProposal.storeId, input.store),
            ),
          );
      return previous[0];
    }
    if (previous[0])
      await transaction
        .update(schema.loopProposal)
        .set({ status: "superseded", updatedAt: new Date() })
        .where(
          and(
            eq(schema.loopProposal.id, previous[0].id),
            eq(schema.loopProposal.storeId, input.store),
          ),
        );
    const [proposal] = await transaction
      .insert(schema.loopProposal)
      .values({
        storeId: input.store,
        generation: input.generation,
        gapId: gap.id,
        productId: product.id,
        revision: (previous[0]?.revision ?? 0) + 1,
        original: {
          fingerprint,
          reasons,
          evidenceFingerprint,
          description: product.description,
        },
        proposed: { description: diff[0]!.after },
        diff: { fields: diff },
        evidence: {
          ...gap.evidence,
          attribute: gap.attribute,
          count: gap.count,
          share: gap.share,
          checks: evidence.map((check) => ({
            id: check.id,
            surface: check.surface,
            status: check.status,
            evidence: check.evidence,
            observed: check.observed,
          })),
        },
        requiresMerchantApproval: true,
      })
      .returning();
    if (!proposal) throw new Error("Proposal could not be saved");
    await transaction
      .update(schema.returnExpectationGap)
      .set({
        status: "fix_proposed",
        optimizationId: proposal.id,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.returnExpectationGap.storeId, input.store),
          eq(schema.returnExpectationGap.id, gap.id),
        ),
      );
    return proposal;
  });
};

const proposalInput = z.object({
  store: z.string().min(1),
  proposal: z.string().min(1),
  revision: z.number().int().positive(),
  user: z.string().min(1),
});
/** Only the authenticated merchant action calls this; no automatic worker can approve a fit claim. */
export const approve = async (input: z.infer<typeof proposalInput>) => {
  const parsed = proposalInput.parse(input);
  await Model.requireStore(parsed);
  const connection = await Model.requireActive(parsed);
  const scope = { store: parsed.store, generation: connection.generation };
  const context = await AnalysisModel.readContext(scope);
  const proposal = context.proposals.find(
    (entry) =>
      entry.id === parsed.proposal && entry.revision === parsed.revision,
  );
  if (!proposal || proposal.status !== "pending")
    throw new Error("Proposal is no longer awaiting review");
  const product = context.products.find(
    (entry) => entry.id === proposal.productId,
  );
  if (
    !product ||
    productFingerprint(parsed.store, product) !==
      proposal.original["fingerprint"]
  )
    throw new Error(
      "Product data changed. Run a new check before reviewing this fix.",
    );
  if (
    reasonFingerprint(
      parsed.store,
      product.id,
      context.lines,
      context.mappings,
    ) !== proposal.original["reasons"]
  )
    throw new Error(
      "Return reason mappings changed. Wait for the refreshed proposal before reviewing this fix.",
    );
  const at = new Date();
  const baseline = await Measurement.freezeBaseline({
    ...scope,
    product: product.id,
    attribute: String(proposal.evidence["attribute"]),
    at,
  });
  // Keep a durable publication claim if the request dies during the platform call.
  await Model.withActive(scope, async (transaction) => {
    const mappings = await transaction
      .select()
      .from(schema.loopReasonMapping)
      .where(eq(schema.loopReasonMapping.storeId, parsed.store));
    if (
      reasonFingerprint(parsed.store, product.id, context.lines, mappings) !==
      proposal.original["reasons"]
    )
      throw new Error("Return reason mappings changed during review");
    const [claimed] = await transaction
      .update(schema.loopProposal)
      .set({
        status: "publishing",
        approvedAt: at,
        evidence: { ...proposal.evidence, publicationBaseline: baseline },
        updatedAt: at,
      })
      .where(
        and(
          eq(schema.loopProposal.id, parsed.proposal),
          eq(schema.loopProposal.storeId, parsed.store),
          eq(schema.loopProposal.revision, parsed.revision),
          eq(schema.loopProposal.status, "pending"),
        ),
      )
      .returning();
    if (!claimed) throw new Error("Proposal was already approved or changed");
  });
  const publication = await resultify(() =>
    Model.withActive(scope, async (transaction) => {
      const [claim] = await transaction
        .select()
        .from(schema.loopProposal)
        .where(
          and(
            eq(schema.loopProposal.id, parsed.proposal),
            eq(schema.loopProposal.storeId, parsed.store),
          ),
        );
      if (
        !claim ||
        claim.status !== "publishing" ||
        claim.approvedAt?.getTime() !== at.getTime()
      )
        throw new Error("Publication claim changed");
      const mappings = await transaction
        .select()
        .from(schema.loopReasonMapping)
        .where(eq(schema.loopReasonMapping.storeId, parsed.store));
      if (
        reasonFingerprint(parsed.store, product.id, context.lines, mappings) !==
        proposal.original["reasons"]
      )
        throw new Error("Return reason mappings changed during review");
      const [current] = await transaction
        .select()
        .from(schema.product)
        .where(
          and(
            eq(schema.product.id, product.id),
            eq(schema.product.storeId, parsed.store),
          ),
        );
      if (
        !current ||
        productFingerprint(parsed.store, current) !==
          proposal.original["fingerprint"]
      )
        throw new Error("Product changed during review; run a new check");
      const description = z
        .string()
        .min(1)
        .max(100_000)
        .parse(proposal.proposed["description"]);
      // Publication goes through the existing authenticated store adapter. It publishes
      // exactly the stored diff; no model regeneration is allowed after approval.
      const pushed = await Store.publishProductListing({
        product: product.id,
        data: { body_html: description },
        expectedFingerprint: String(proposal.original["fingerprint"]),
      });
      if (!pushed.success) throw pushed.error;
      await transaction
        .update(schema.loopProposal)
        .set({ status: "published", publishedAt: at, updatedAt: new Date() })
        .where(
          and(
            eq(schema.loopProposal.id, parsed.proposal),
            eq(schema.loopProposal.storeId, parsed.store),
            eq(schema.loopProposal.status, "publishing"),
          ),
        );
      await transaction
        .update(schema.returnExpectationGap)
        .set({ status: "fix_published", updatedAt: new Date() })
        .where(
          and(
            eq(schema.returnExpectationGap.id, proposal.gapId),
            eq(schema.returnExpectationGap.storeId, parsed.store),
          ),
        );
      await transaction.insert(schema.loopMeasurement).values({
        storeId: parsed.store,
        proposalId: proposal.id,
        productId: product.id,
        publishedAt: at,
        windowDays: baseline.windowDays,
        baseline: baseline.baseline,
        controlProductIds: baseline.controls,
        snapshot: {
          after: Measurement.emptyMetric(parsed.store, at, at),
          controlAfter: Measurement.emptyMetric(parsed.store, at, at),
          collecting: true,
        },
      });
      return { id: proposal.id, publishedAt: at };
    }),
  );
  // A failed or interrupted response can follow a successful remote write. Keep
  // the claim visible for reconciliation instead of silently replaying a write.
  if (!publication.success)
    throw new Error(
      "Publication could not be confirmed. Check the store before retrying this proposal.",
    );
  return publication.data;
};

/** A read-only reconciliation proves the outcome before allowing any retry. */
export const recover = async (input: z.infer<typeof proposalInput>) => {
  const parsed = proposalInput.parse(input);
  await Model.requireStore(parsed);
  const connection = await Model.requireActive(parsed);
  return Model.withActive(
    { store: parsed.store, generation: connection.generation },
    async (transaction) => {
      const [proposal] = await transaction
        .select()
        .from(schema.loopProposal)
        .where(
          and(
            eq(schema.loopProposal.id, parsed.proposal),
            eq(schema.loopProposal.storeId, parsed.store),
            eq(schema.loopProposal.revision, parsed.revision),
          ),
        )
        .for("update");
      if (!proposal) throw new Error("Proposal not found");
      if (proposal.status === "published")
        return { id: proposal.id, status: "published" };
      if (proposal.status !== "publishing" || !proposal.approvedAt)
        throw new Error("No interrupted publication to check");
      const live = await Shopify.readProductListing({
        product: proposal.productId,
      });
      if (!live.success)
        throw new Error(
          "Could not verify the store listing. No write was retried.",
        );
      const applied =
        live.data.description === proposal.proposed["description"];
      const unchanged =
        live.data.description === (proposal.original["description"] ?? "");
      const status = applied
        ? "published"
        : unchanged
          ? "pending"
          : "superseded";
      const [current] = await transaction
        .select()
        .from(schema.product)
        .where(
          and(
            eq(schema.product.id, proposal.productId),
            eq(schema.product.storeId, parsed.store),
          ),
        )
        .for("update");
      if (!current) throw new Error("Product no longer exists");
      const next = {
        ...current,
        description: live.data.description,
        title: live.data.title,
        rawData: live.data.rawData,
      };
      await transaction
        .update(schema.product)
        .set({
          description: next.description,
          title: next.title,
          rawData: next.rawData,
          syncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.product.id, proposal.productId),
            eq(schema.product.storeId, parsed.store),
          ),
        );
      await transaction
        .update(schema.loopProposal)
        .set({
          status,
          ...(applied
            ? { publishedAt: proposal.approvedAt }
            : { approvedAt: null }),
          ...(unchanged
            ? {
                original: {
                  ...proposal.original,
                  fingerprint: productFingerprint(parsed.store, next),
                },
              }
            : {}),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.loopProposal.id, proposal.id),
            eq(schema.loopProposal.storeId, parsed.store),
          ),
        );
      await transaction
        .update(schema.returnExpectationGap)
        .set({
          status: applied
            ? "fix_published"
            : unchanged
              ? "fix_proposed"
              : "open",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.returnExpectationGap.id, proposal.gapId),
            eq(schema.returnExpectationGap.storeId, parsed.store),
          ),
        );
      if (applied) {
        const baseline = proposal.evidence["publicationBaseline"] as
          | Awaited<ReturnType<typeof Measurement.freezeBaseline>>
          | undefined;
        if (!baseline?.baseline || !Array.isArray(baseline.controls))
          throw new Error(
            "Publication baseline unavailable; retain this report for manual review",
          );
        const [exists] = await transaction
          .select({ id: schema.loopMeasurement.id })
          .from(schema.loopMeasurement)
          .where(
            and(
              eq(schema.loopMeasurement.storeId, parsed.store),
              eq(schema.loopMeasurement.proposalId, proposal.id),
            ),
          );
        if (!exists)
          await transaction.insert(schema.loopMeasurement).values({
            storeId: parsed.store,
            proposalId: proposal.id,
            productId: proposal.productId,
            publishedAt: proposal.approvedAt,
            windowDays: baseline.windowDays,
            baseline: baseline.baseline,
            controlProductIds: baseline.controls,
            snapshot: {
              after: Measurement.emptyMetric(
                parsed.store,
                proposal.approvedAt,
                proposal.approvedAt,
              ),
              controlAfter: Measurement.emptyMetric(
                parsed.store,
                proposal.approvedAt,
                proposal.approvedAt,
              ),
              collecting: true,
            },
          });
      }
      return { id: proposal.id, status };
    },
  );
};

export const dismiss = async (input: z.infer<typeof proposalInput>) => {
  const parsed = proposalInput.parse(input);
  await Model.requireStore(parsed);
  const connection = await Model.requireActive(parsed);
  return Model.withActive(
    { store: parsed.store, generation: connection.generation },
    async (transaction) => {
      const [proposal] = await transaction
        .update(schema.loopProposal)
        .set({ status: "dismissed", updatedAt: new Date() })
        .where(
          and(
            eq(schema.loopProposal.id, parsed.proposal),
            eq(schema.loopProposal.storeId, parsed.store),
            eq(schema.loopProposal.revision, parsed.revision),
            eq(schema.loopProposal.status, "pending"),
          ),
        )
        .returning();
      if (!proposal) throw new Error("Proposal is no longer awaiting review");
      await transaction
        .update(schema.returnExpectationGap)
        .set({ status: "dismissed", updatedAt: new Date() })
        .where(
          and(
            eq(schema.returnExpectationGap.id, proposal.gapId),
            eq(schema.returnExpectationGap.storeId, parsed.store),
          ),
        );
      return { id: proposal.id };
    },
  );
};
