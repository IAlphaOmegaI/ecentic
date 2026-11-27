import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { prospectSchema, settingsForProspect } from "@/lib/outbound";
import {
  HELD_REVIEW_REASON,
  heldReviewPreviewContextSchema,
  heldReviewPreviewSchema,
} from "@/server/utils/outbound/held-review-contract";
import {
  HELD_THIRD_REVIEW_INSTRUCTION_HASH,
  heldThirdReviewInputSchema,
  heldThirdReviewStateSchema,
} from "@/server/utils/outbound/held-third-review-contract";
import { projectRound3CopyProof } from "@/server/utils/outbound/round3-copy-evidence";
import {
  compositionProspectHash,
  writingPolicyHash,
} from "@/server/utils/outbound/shopping-policy";
import { projectProductListingProof } from "@/server/utils/outbound/shopping-product-listings";
import {
  researchHash,
  researchPolicyHash,
} from "@/server/utils/outbound/shopping-research";
import { requireTestDatabase } from "./database";
import { prepareSyntheticShoppingEvidence } from "./outbound-shopping-db-fixture";
import {
  buildSyntheticShoppingEvidence,
  syntheticWriterParts,
} from "./outbound-shopping-fixture";
import { passingCopyJudge } from "./outbound-writer-fixture";

const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const value = <T>(
  result: { success: true; data: T } | { success: false; error: Error },
): T => {
  if (!result.success) throw result.error;
  return result.data;
};

/** Synthetic, fully raw-backed earlier and broader captures; no real review or provider is represented. */
export const seedReviewedPreview = async (prospectId: string) => {
  requireTestDatabase(process.env.OUTBOUND_TEST_DATABASE_URL);
  const [{ db, schema }, Store, Draft, Discovery] = await Promise.all([
    import("@/server/database"),
    import("@/server/app/outbound/store"),
    import("@/server/utils/outbound/draft"),
    import("@/server/utils/outbound/shopping-discovery-review"),
  ]);
  const actor = "synthetic-reviewed-adoption";
  const first = value(await Store.getProspect(prospectId));
  assert(first);
  const pageText = `${first.details.product} is a large linen carry bag.`;
  const earlier = await buildSyntheticShoppingEvidence({
    prospect: first.details,
    pageText,
    answerText: `1. ${first.details.company} — ${pageText}`,
    listed: [first.details.company],
    select: (base, capture) => ({
      ...base,
      correctness: {
        answerQuoteId: capture.answerQuoteId,
        productQuoteId: capture.productQuoteId,
        answerText: pageText,
        pageText,
      },
    }),
  });
  assert.equal(earlier.receipt.selected.kind, "no-gap");
  const prepared = value(
    await prepareSyntheticShoppingEvidence(
      actor,
      { prospect: prospectId },
      { pageText, intent: "unbranded-broad" },
    ),
  );
  const evidence = {
    ...prepared.capture.evidence,
    previous: [earlier.evidence],
  };
  const base = value(
    projectRound3CopyProof(
      evidence,
      Discovery.appendCaptureHistory(prepared.request.receipt, [
        earlier.evidence,
      ]),
    ),
  );
  const projected = projectProductListingProof(evidence, base);
  assert.equal(projected.status, "eligible");
  if (projected.status !== "eligible")
    throw new Error("Synthetic listing proof failed");
  const initial = value(await Store.getProspect(prospectId));
  assert(initial);
  value(
    await Store.reviewProspect(actor, {
      prospect: prospectId,
      revision: initial.revision,
      decision: "hold",
      reason: HELD_REVIEW_REASON,
    }),
  );
  const prospect = value(await Store.getProspect(prospectId));
  assert(prospect);
  const policy = await Store.policy();
  // A real policy write publishes the exact proposal before adoption; this fixture adds no approval bypass.
  value(
    await Store.savePlaybook(actor, {
      ...policy.settings,
      sendingEnabled: false,
      outreachNotBefore: "2026-12-02T00:00:00.000Z",
    }),
  );
  const published = await Store.policy();
  const settings = settingsForProspect(prospect, published.settings);
  const details = prospectSchema.parse({
    ...prospect.details,
    id: prospect.id,
    productCategory: evidence.answer.job.query.category,
    assignedSenderEmail: settings.fromEmail,
  });
  const parts = {
    ...syntheticWriterParts(details, base),
    opening: `Comparing carry bags, I opened Google AI Mode and asked "${evidence.answer.job.query.prompt}".`,
  };
  const original = value(
    await Draft.composeSequence(details, base, settings, {
      suppliedParts: parts,
      copyRulesVersion: "spoken-copy-v3",
      judge: passingCopyJudge,
      globalVoiceNotes: published.settings.voiceNotes,
    }),
  );
  const context = (
    receipt: typeof base,
    version: "spoken-copy-v3" | "spoken-copy-v4",
    exception?: {
      kind: "owner-approved-existing-body";
      opening: string;
      approvedBody: string;
      approvalReference: string;
    },
  ) =>
    heldReviewPreviewContextSchema.parse({
      status: "unapplied",
      prospect: details,
      prospectRevision: prospect.revision,
      playbookRevision: published.revision,
      proposedPolicy: published.settings,
      globalVoiceNotes: published.settings.voiceNotes,
      ...(exception ? { openingRuleException: exception } : {}),
      receiptHash: researchHash(receipt),
      writingPolicyHash: writingPolicyHash(settings, {
        globalVoiceNotes: published.settings.voiceNotes,
        copyRulesVersion: version,
        openingRuleException: exception,
      }),
      baseWritingPolicyHash: writingPolicyHash(settings),
      prospectHash: compositionProspectHash(details),
      peers: [],
    });
  const originalPreview = heldReviewPreviewSchema.parse({
    ...context(base, "spoken-copy-v3"),
    parts,
    ...original,
  });
  const authorizationReference = digest(
    "Synthetic explicit owner authorization for this exact body.",
  );
  const exception = {
    kind: "owner-approved-existing-body" as const,
    opening: parts.opening,
    approvedBody: original.messages[0]!.body,
    approvalReference: authorizationReference,
  };
  const reviewed = value(
    await Draft.composeSequence(details, projected.receipt, settings, {
      suppliedParts: parts,
      copyRulesVersion: "spoken-copy-v4",
      openingRuleException: exception,
      judge: passingCopyJudge,
      globalVoiceNotes: published.settings.voiceNotes,
    }),
  );
  const preview = heldReviewPreviewSchema.parse({
    ...context(projected.receipt, "spoken-copy-v4", exception),
    parts,
    ...reviewed,
  });
  const sourceInput = heldThirdReviewInputSchema.parse({
    operation: "heldDiscoveryRound3",
    batchId: randomUUID(),
    prospectId,
    campaignId: prospect.campaignId,
    campaignRevision: 1,
    playbookRevision: published.revision,
    researchPolicyHash: researchPolicyHash(published.settings),
    manifestHash: digest("synthetic manifest"),
    requestedBy: actor,
    product: base.product,
    category: evidence.answer.job.query.category,
    country: "US",
    merchant: { name: details.company, domain: details.domain },
    reviewRound: 3,
    controlId: randomUUID(),
    instructionHash: HELD_THIRD_REVIEW_INSTRUCTION_HASH,
    action: "broader",
    previousJobId: randomUUID(),
    previousJobHash: digest("synthetic prior job"),
    previousOutputHash: digest("synthetic prior output"),
    parentInputHash: digest("synthetic prior input"),
    originalProspectHash: digest(prospect),
  });
  const history = {
    query: earlier.evidence.answer.job.query,
    shoppingJob: earlier.evidence.answer.job,
    answer: earlier.evidence.answer,
    browser: earlier.evidence.browser,
    shoppingReceipt: earlier.receipt,
    queryReservedAt: earlier.evidence.answer.job.submittedAt,
  };
  const sourceOutput = heldThirdReviewStateSchema.parse({
    stage: "complete",
    prospectRevision: prospect.revision,
    availableAt: new Date().toISOString(),
    lease: null,
    shoppingQueryIntent: "unbranded-broad",
    shoppingQueryCount: 2,
    polls: 1,
    purchaseBaseline: 1,
    priorPurchases: [],
    shoppingJob: evidence.answer.job,
    query: evidence.answer.job.query,
    answer: evidence.answer,
    browser: evidence.browser,
    shoppingReceipt: base,
    shoppingHistory: [history],
    preview: originalPreview,
  });
  const [source] = await db
    .insert(schema.outboundIntegrationJob)
    .values({
      provider: "automation",
      prospectId,
      status: "complete",
      input: sourceInput,
      output: sourceOutput,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();
  assert(source);
  const hashes = await db.execute<{ id: string; hash: string }>(
    sql`select id,encode(sha256(convert_to(to_jsonb(j)::text,'UTF8')),'hex') as hash from outbound_integration_job j where id=${source.id}`,
  );
  const prospectHashes = await db.execute<{ id: string; hash: string }>(
    sql`select id,encode(sha256(convert_to(to_jsonb(p)::text,'UTF8')),'hex') as hash from outbound_prospect p where id=${prospectId}`,
  );
  const plain = (messages: typeof original.messages) =>
    messages.map(({ step, afterDays, subject, body }) => ({
      step,
      afterDays,
      subject,
      body,
    }));
  const {
    parts: _parts,
    messages: _messages,
    generation: _generation,
    issues: _issues,
    ...reviewContext
  } = preview;
  const [review] = await db
    .insert(schema.outboundIntegrationJob)
    .values({
      provider: "automation",
      prospectId,
      status: "complete",
      input: {
        operation: "reviewedElevenCopyPreviewV4",
        sourceJobId: source.id,
        prospectId,
        authorizationReference,
        proposedPolicyRevision: published.revision,
        proposedPolicyHash: digest(published.settings),
        originalPartsHash: digest(parts),
        originalMessagesHash: digest(plain(original.messages)),
        originalVerdictHash: digest(original.messages[0]?.writing?.quality),
        originalReceiptHash: researchHash(base),
        receiptHash: researchHash(projected.receipt),
        contextHash: digest(reviewContext),
        partsHash: digest(parts),
        messagesHash: digest(plain(reviewed.messages)),
        boundary: { prospects: [...prospectHashes], jobs: [...hashes] },
      },
      output: {
        stage: "complete",
        lease: null,
        preview,
        originalPreview,
        shoppingReceipt: projected.receipt,
        parts,
        messages: reviewed.messages,
        writerCalls: 0,
        searchCalls: 0,
        judgeReservations: 1,
        reservedAt: new Date().toISOString(),
      },
      updatedAt: new Date(),
    })
    .returning();
  assert(review);
  const [reviewHash] = await db.execute<{ hash: string }>(
    sql`select encode(sha256(convert_to(to_jsonb(j)::text,'UTF8')),'hex') as hash from outbound_integration_job j where id=${review.id}`,
  );
  assert(reviewHash);
  return {
    actor,
    prospect,
    policy: published,
    preview,
    source,
    review,
    earlier,
    receipt: projected.receipt,
    binding: {
      previewJobId: review.id,
      previewJobHash: reviewHash.hash,
      authorizationReference,
    },
    request: {
      requestId: review.id,
      prospectId,
      expectedRevision: prospect.revision,
      expectedPlaybookRevision: published.revision,
      receipt: projected.receipt,
      captureJobId: review.id,
    },
  };
};
