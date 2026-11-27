import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { resultify } from "@zenncore/utils";
import { and, eq, getTableColumns, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import {
  normalizeDomain,
  type Playbook,
  playbookSchema,
  prospectSchema,
  senderIdentity,
  settingsForSender,
} from "@/lib/outbound";
import { canonicalSequenceInput } from "@/lib/outbound-composition";
import {
  copyVerdictProblem,
  deterministicCopyIssues,
} from "@/lib/outbound-copy-quality";
import {
  REPLACEMENT_EARLIEST,
  REPLACEMENT_HOLD,
  REPLACEMENT_MANIFEST_HASH,
  REPLACEMENT_SENDER,
  replacementAuthorizationSchema,
  replacementRequestSchema,
} from "@/lib/outbound-replacements";
import { REVIEWED_COPY_RULES_VERSION } from "@/lib/outbound-round3-copy";
import { shoppingResearchSchema } from "@/lib/outbound-shopping-research";
import { db, schema, type TransactionScope } from "@/server/database";
import { ConflictError } from "@/server/utils/error";
import { heldReviewPreviewSchema } from "@/server/utils/outbound/held-review-contract";
import {
  aiCaptureSchema,
  browserResearchSchema,
  shopperQueryReviewSchema,
} from "@/server/utils/outbound/live-shopping-contract";
import * as Assessment from "@/server/utils/outbound/shopping-assessment";
import { researchCaptureProof } from "@/server/utils/outbound/shopping-capture-proof";
import {
  compositionProspectHash,
  writingPolicyHash,
} from "@/server/utils/outbound/shopping-policy";
import * as Store from "./store";

type Prospect = typeof schema.outboundProspect.$inferSelect;
export const replacementHash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const fullHash = (
  table:
    | typeof schema.outboundProspect
    | typeof schema.outboundIntegrationJob
    | typeof schema.outboundSendAttempt
    | typeof schema.outboundRevision,
) =>
  sql<string>`encode(sha256(convert_to(to_jsonb(${table})::text,'UTF8')),'hex')`;
const legacyHash = sql<string>`encode(sha256(convert_to((to_jsonb(${schema.outboundProspect}) - 'replacement_of' - 'replacement_authorization')::text,'UTF8')),'hex')`;
const plain = (messages: Prospect["messages"]) =>
  messages.map(({ step, afterDays, subject, body }) => ({
    step,
    afterDays,
    subject,
    body,
  }));
const assertReplacement: (
  condition: unknown,
  reason: string,
) => asserts condition = (condition, reason) => {
  if (!condition) throw new ConflictError(reason);
};
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const bindingSchema = z.object({
  prospectId: z.string().uuid(),
  prospectRowHash: digest,
  firstAttemptHash: digest,
  firstRevisionHash: digest,
  prospectRevision: z.number().int(),
  campaignRevision: z.number().int().nullable(),
  details: prospectSchema,
  manifestItem: z.object({
    prospectId: z.string().uuid(),
    company: z.string(),
    firstAttemptId: z.string().uuid(),
    firstSentRevision: z.number().int(),
    firstContentHash: digest,
    holdEligible: z.literal(true),
  }),
});
export const replacementPreviewBatchSchema = z
  .object({
    version: z.literal(1),
    manifestHash: z.literal(REPLACEMENT_MANIFEST_HASH),
    actor: z.string().min(1),
    policyRevision: z.literal(15),
    policyHash: digest,
    settings: playbookSchema,
    sender: z.literal(REPLACEMENT_SENDER),
    earliest: z.literal(REPLACEMENT_EARLIEST),
    maxQueries: z.literal(50),
    maxPerLead: z.literal(2),
    rows: z.array(bindingSchema).length(46),
  })
  .strict();
const inputSchema = z.object({
  operation: z.literal("badEmailFreshPreviewV1"),
  batchId: z.string().uuid(),
  requestHash: digest,
  binding: bindingSchema,
});
const contactIdentity = (details: Prospect["details"]) => ({
  company: details.company,
  domain: normalizeDomain(details.domain),
  email: details.email.toLowerCase(),
  name: details.name,
  first: details.first,
  title: details.title,
  linkedinUrl: details.linkedinUrl,
  emailStatus: details.emailStatus,
  emailSource: details.emailSource,
  emailVerifiedAt: details.emailVerifiedAt,
  roleSource: details.roleSource,
  roleCheckedAt: details.roleCheckedAt,
  savedContactVerificationId: details.savedContactVerificationId,
  automationEvidenceId: details.automationEvidenceId,
});

export const familyIdsWithin = async (
  scope: TransactionScope,
  prospect: Prospect,
) => {
  const root = prospect.replacementOf ?? prospect.id;
  return (
    await scope
      .select({ id: schema.outboundProspect.id })
      .from(schema.outboundProspect)
      .where(
        or(
          eq(schema.outboundProspect.id, root),
          eq(schema.outboundProspect.replacementOf, root),
        ),
      )
  ).map((row) => row.id);
};

/** Human replies count even when their original provider thread was archived. */
const assertStops = async (
  scope: TransactionScope,
  original: Prospect,
  ids: string[],
) => {
  const email = original.details.email.toLowerCase();
  const domains = [
    normalizeDomain(original.details.domain),
    normalizeDomain(email.split("@")[1] ?? ""),
  ];
  const [company] = await scope
    .select()
    .from(schema.outboundCompany)
    .where(eq(schema.outboundCompany.id, original.companyId));
  assertReplacement(
    company?.relationship === "cold",
    "The company is no longer cold.",
  );
  const [stop] = await scope
    .select({ id: schema.outboundProspect.id })
    .from(schema.outboundProspect)
    .where(
      and(
        or(
          eq(schema.outboundProspect.companyId, original.companyId),
          sql`lower(${schema.outboundProspect.details}->>'email')=${email}`,
        ),
        inArray(schema.outboundProspect.status, [
          "replied",
          "optedOut",
          "bounced",
        ]),
      ),
    )
    .limit(1);
  const [suppressed] = await scope
    .select({ id: schema.outboundSuppression.id })
    .from(schema.outboundSuppression)
    .where(
      sql`(${schema.outboundSuppression.scope}='email' and lower(${schema.outboundSuppression.value})=${email}) or (${schema.outboundSuppression.scope}='domain' and lower(regexp_replace(${schema.outboundSuppression.value},'^www\\.','')) in ${domains})`,
    )
    .limit(1);
  const [inbound] = await scope
    .select({ id: schema.outboundConversationMessage.id })
    .from(schema.outboundConversationMessage)
    .innerJoin(
      schema.outboundConversation,
      eq(
        schema.outboundConversation.id,
        schema.outboundConversationMessage.conversationId,
      ),
    )
    .innerJoin(
      schema.outboundProspect,
      eq(schema.outboundProspect.id, schema.outboundConversation.prospectId),
    )
    .where(
      and(
        or(
          eq(schema.outboundProspect.companyId, original.companyId),
          sql`lower(${schema.outboundProspect.details}->>'email')=${email}`,
        ),
        eq(schema.outboundConversationMessage.direction, "inbound"),
        eq(schema.outboundConversationMessage.isAutomated, false),
      ),
    )
    .limit(1);
  const [uncertain] = await scope
    .select({ id: schema.outboundSendAttempt.id })
    .from(schema.outboundSendAttempt)
    .innerJoin(
      schema.outboundProspect,
      eq(schema.outboundProspect.id, schema.outboundSendAttempt.prospectId),
    )
    .where(
      and(
        or(
          eq(schema.outboundProspect.companyId, original.companyId),
          sql`lower(${schema.outboundProspect.details}->>'email')=${email}`,
        ),
        // The replacement's own committed claim is checked by the normal dispatch gate.
        or(
          eq(schema.outboundSendAttempt.status, "uncertain"),
          and(
            eq(schema.outboundSendAttempt.status, "claimed"),
            eq(schema.outboundSendAttempt.prospectId, original.id),
          ),
        ),
      ),
    )
    .limit(1);
  const [unresolved] = await scope
    .select({ id: schema.outboundConversationSend.id })
    .from(schema.outboundConversationSend)
    .innerJoin(
      schema.outboundConversation,
      eq(
        schema.outboundConversation.id,
        schema.outboundConversationSend.conversationId,
      ),
    )
    .where(
      and(
        inArray(schema.outboundConversation.prospectId, ids),
        inArray(schema.outboundConversationSend.status, [
          "starting",
          "uncertain",
        ]),
      ),
    )
    .limit(1);
  const [linkedin] = await scope
    .select({ id: schema.outboundIntegrationJob.id })
    .from(schema.outboundIntegrationJob)
    .where(
      and(
        inArray(schema.outboundIntegrationJob.prospectId, ids),
        eq(schema.outboundIntegrationJob.provider, "linkedin"),
        inArray(schema.outboundIntegrationJob.status, [
          "starting",
          "uncertain",
        ]),
      ),
    )
    .limit(1);
  assertReplacement(
    !stop && !suppressed && !inbound && !uncertain && !unresolved && !linkedin,
    "A reply, suppression or unresolved delivery in this contact's history stops the fresh sequence.",
  );
  return company;
};

/** This projection authorizes a new sequence only from the exact, completed reviewed sidecar. */
export const loadReplacementPreviewWithin = async (
  scope: TransactionScope,
  request: z.infer<typeof replacementRequestSchema>,
  policy: { settings: Playbook; revision: number },
) => {
  const [source] = await scope
    .select({
      ...getTableColumns(schema.outboundIntegrationJob),
      rowHash: fullHash(schema.outboundIntegrationJob),
    })
    .from(schema.outboundIntegrationJob)
    .where(eq(schema.outboundIntegrationJob.id, request.previewJobId));
  assertReplacement(
    source &&
      source.rowHash === request.previewJobHash &&
      source.provider === "automation" &&
      source.status === "complete" &&
      !source.error,
    "The reviewed fresh preview changed or is incomplete.",
  );
  const input = inputSchema.parse(source.input);
  const output = source.output ?? {};
  assertReplacement(
    source.prospectId === request.sourceProspectId &&
      input.binding.prospectId === request.sourceProspectId &&
      input.binding.prospectRevision === request.expectedRevision &&
      output["stage"] === "complete" &&
      output["lease"] === null &&
      !output["heldReason"] &&
      !output["unappliedResult"],
    "The reviewed preview belongs to another source or remains held.",
  );
  const [batch] = await scope
    .select()
    .from(schema.outboundIntegrationJob)
    .where(eq(schema.outboundIntegrationJob.id, input.batchId));
  assertReplacement(
    batch?.provider === "automation" &&
      batch.input["operation"] === "badEmailFreshPreviewBatchV1",
    "The authorized fresh outreach batch is missing.",
  );
  const { operation: _operation, ...batchFields } = batch.input;
  const batchRequest = replacementPreviewBatchSchema.parse(batchFields);
  // policyHash is the producer's SQL hash of the complete historical Playbook row.
  // Its immutable request binding is retained; it is not a hash of settings alone.
  const rows = z.array(bindingSchema).length(46).parse(batchRequest["rows"]);
  assertReplacement(
    batchRequest["manifestHash"] === REPLACEMENT_MANIFEST_HASH &&
      batchRequest["sender"] === REPLACEMENT_SENDER &&
      replacementHash(batchRequest) === input.requestHash &&
      new Set(rows.map((row) => row.prospectId)).size === 46 &&
      rows.filter((row) => row.prospectId === request.sourceProspectId)
        .length === 1 &&
      isDeepStrictEqual(
        rows.find((row) => row.prospectId === request.sourceProspectId),
        input.binding,
      ),
    "The original 46-contact authorization or source binding changed.",
  );
  const preview = heldReviewPreviewSchema.parse(output["preview"]);
  assertReplacement(
    preview.playbookRevision === batchRequest.policyRevision &&
      preview.prospectRevision === input.binding.prospectRevision &&
      isDeepStrictEqual(preview.proposedPolicy, batchRequest.settings),
    "The saved preview policy or prospect revision changed.",
  );
  const receipt = shoppingResearchSchema.parse(output["shoppingReceipt"]);
  const answer = aiCaptureSchema.parse(output["answer"]);
  const browser = browserResearchSchema.parse(output["browser"]);
  assertReplacement(
    browser.status === "captured",
    "The saved browser capture is incomplete.",
  );
  const proof = researchCaptureProof(
    source.id,
    {
      answer,
      browser,
      ...(output["queryReview"]
        ? { queryReview: shopperQueryReviewSchema.parse(output["queryReview"]) }
        : {}),
    },
    receipt,
    output,
  );
  const problem = Assessment.validateAutomaticResearch(
    proof,
    receipt,
    policy.settings.verificationDays,
    policy.settings,
  );
  assertReplacement(
    !problem,
    problem ?? "The reviewed evidence is no longer valid.",
  );
  const writing = preview.messages[0]?.writing;
  const settings = settingsForSender(policy.settings, REPLACEMENT_SENDER);
  const canonical = canonicalSequenceInput(preview.messages, {
    copyRulesVersion: REVIEWED_COPY_RULES_VERSION,
  });
  assertReplacement(
    writing?.version === "discovery-email-v2" &&
      writing.copyRulesVersion === REVIEWED_COPY_RULES_VERSION &&
      !writing.openingRuleException &&
      !copyVerdictProblem(writing.quality) &&
      canonical.status === "ready" &&
      writing.contentHash ===
        createHash("sha256").update(canonical.canonicalText).digest("hex") &&
      preview.receiptHash === replacementHash(receipt) &&
      writing.receiptHash === preview.receiptHash &&
      isDeepStrictEqual(preview.parts, writing.parts) &&
      preview.messages[0]?.subject === request.reviewedSubject &&
      preview.prospect.id === request.sourceProspectId &&
      isDeepStrictEqual(preview.prospect, input.binding.details) &&
      preview.prospectHash === compositionProspectHash(preview.prospect) &&
      preview.writingPolicyHash ===
        writingPolicyHash(settings, {
          globalVoiceNotes: policy.settings.voiceNotes,
          copyRulesVersion: REVIEWED_COPY_RULES_VERSION,
        }) &&
      writing.writingPolicyHash === preview.writingPolicyHash &&
      preview.globalVoiceNotes === policy.settings.voiceNotes,
    "The reviewed subject, text, verdict, sender or policy no longer matches.",
  );
  const issues = deterministicCopyIssues({
    prospect: preview.prospect,
    receipt,
    playbook: settings,
    parts: preview.parts,
    messages: preview.messages,
    peers: preview.peers,
    copyRulesVersion: REVIEWED_COPY_RULES_VERSION,
  });
  assertReplacement(
    !issues.length,
    `The fresh preview needs review: ${issues.join(" ")}`,
  );
  return { input, preview, receipt, proof };
};

/** Locks are owned by callers, so replies/holds cannot interleave with approval or transport. */
export const assertSequenceFamilyWithin = async (
  scope: TransactionScope,
  prospect: Prospect,
  settings: Playbook,
  options: { reviewedCopy?: boolean; dispatch?: boolean } = {},
) => {
  const ids = await familyIdsWithin(scope, prospect);
  if (!prospect.replacementOf) {
    assertReplacement(
      ids.length === 1,
      "This historical sequence has a replacement and cannot resume.",
    );
    return null;
  }
  const authorization = replacementAuthorizationSchema.parse(
    prospect.replacementAuthorization,
  );
  const [row] = await scope
    .select({
      row: schema.outboundProspect,
      rowHash: fullHash(schema.outboundProspect),
      legacyHash,
    })
    .from(schema.outboundProspect)
    .where(eq(schema.outboundProspect.id, prospect.replacementOf));
  assertReplacement(
    row &&
      !row.row.replacementOf &&
      row.row.id === authorization.sourceProspectId &&
      row.row.status === "held" &&
      row.row.sentStep > 0 &&
      !row.row.approvedAt &&
      !row.row.approvedBy &&
      !row.row.approvalHash &&
      !row.row.nextSendAt &&
      row.row.companyId === prospect.companyId &&
      row.row.personId === prospect.personId &&
      isDeepStrictEqual(
        contactIdentity(row.row.details),
        contactIdentity(prospect.details),
      ) &&
      (authorization.sourceRowProjection === "full"
        ? row.rowHash
        : row.legacyHash) === authorization.sourceRowHash,
    "The original held recipient or immutable source changed.",
  );
  const original = row.row;
  const [attempt] = await scope
    .select({
      row: schema.outboundSendAttempt,
      hash: fullHash(schema.outboundSendAttempt),
    })
    .from(schema.outboundSendAttempt)
    .where(eq(schema.outboundSendAttempt.id, authorization.sourceAttemptId));
  const [revision] = await scope
    .select({ hash: fullHash(schema.outboundRevision) })
    .from(schema.outboundRevision)
    .where(
      and(
        eq(schema.outboundRevision.prospectId, original.id),
        eq(schema.outboundRevision.revision, authorization.sourceRevision),
      ),
    );
  assertReplacement(
    attempt?.row.status === "accepted" &&
      attempt.hash === authorization.sourceAttemptHash &&
      revision?.hash === authorization.sourceRevisionHash,
    "The original accepted email evidence changed.",
  );
  const company = await assertStops(scope, original, ids);
  assertReplacement(
    prospect.sentStep > 0 ||
      company.lastContactedAt?.toISOString() ===
        authorization.companyLastContactedAt,
    "New company contact history requires review before the fresh first email.",
  );
  assertReplacement(
    prospect.details.assignedSenderEmail === authorization.senderEmail &&
      replacementHash(senderIdentity(authorization.senderEmail, settings)) ===
        authorization.senderHash &&
      Date.parse(authorization.notBefore) >= Date.parse(REPLACEMENT_EARLIEST),
    "The authorized fresh sender or release date changed.",
  );
  if (options.dispatch && !prospect.sentStep)
    assertReplacement(
      company.lastContactedAt &&
        Date.now() - company.lastContactedAt.getTime() >= 86_400_000,
      "Wait at least 24 hours after the original company contact before starting the fresh sequence.",
    );
  if (options.dispatch)
    assertReplacement(
      Date.now() >= Date.parse(authorization.notBefore),
      "The fresh sequence cannot start before its authorized release date.",
    );
  if (options.reviewedCopy) {
    assertReplacement(
      replacementHash(plain(prospect.messages)) ===
        authorization.reviewedMessagesHash &&
        prospect.messages[0]?.subject === authorization.reviewedSubject,
      "The fresh sequence differs from the owner's reviewed subject or messages.",
    );
    if (!prospect.sentStep)
      await loadReplacementPreviewWithin(scope, authorization, {
        settings,
        revision: prospect.playbookRevision,
      });
    else {
      const [preview] = await scope
        .select({ hash: fullHash(schema.outboundIntegrationJob) })
        .from(schema.outboundIntegrationJob)
        .where(
          eq(schema.outboundIntegrationJob.id, authorization.previewJobId),
        );
      assertReplacement(
        preview?.hash === authorization.previewJobHash,
        "The original reviewed preview changed after the first email.",
      );
    }
  }
  return { original, authorization };
};

/** No model, provider, approval or delivery. Creates one empty held sequence; originals are never updated. */
export const createReplacement = (actor: string, requestInput: unknown) =>
  resultify(() =>
    db.transaction(async (scope) => {
      await scope.execute(
        sql`select pg_advisory_xact_lock(hashtext('ecentic-outbound-workspace'))`,
      );
      const request = replacementRequestSchema.parse(requestInput);
      assertReplacement(
        actor.trim(),
        "Record the owner's authorization before creating a replacement.",
      );
      const policy = await Store.policy(scope);
      const [original] = await scope
        .select({
          row: schema.outboundProspect,
          rowHash: fullHash(schema.outboundProspect),
          legacyHash,
        })
        .from(schema.outboundProspect)
        .where(eq(schema.outboundProspect.id, request.sourceProspectId));
      assertReplacement(
        original && !original.row.replacementOf,
        "A replacement must refer to the original prospect, never another replacement.",
      );
      const [existing] = await scope
        .select()
        .from(schema.outboundProspect)
        .where(eq(schema.outboundProspect.replacementOf, original.row.id));
      if (existing) {
        const authorization = replacementAuthorizationSchema.parse(
          existing.replacementAuthorization,
        );
        assertReplacement(
          Object.entries(request).every(
            ([key, value]) =>
              authorization[key as keyof typeof authorization] === value,
          ),
          "This original already has a different authorized replacement.",
        );
        await assertSequenceFamilyWithin(scope, existing, policy.settings);
        return { prospectId: existing.id, repeated: true };
      }
      const reviewed = await loadReplacementPreviewWithin(
        scope,
        request,
        policy,
      );
      assertReplacement(
        original.row.revision === request.expectedRevision &&
          original.row.status === "held" &&
          original.row.sentStep > 0 &&
          !original.row.approvedAt &&
          !original.row.approvedBy &&
          !original.row.approvalHash &&
          !original.row.nextSendAt &&
          reviewed.input.binding.manifestItem.prospectId === original.row.id,
        "The original copy-review hold is no longer eligible.",
      );
      const company = await assertStops(scope, original.row, [original.row.id]);
      const bound = reviewed.input.binding;
      assertReplacement(
        isDeepStrictEqual(
          bound.details,
          prospectSchema.parse({
            ...original.row.details,
            id: original.row.id,
            assignedSenderEmail: REPLACEMENT_SENDER,
          }),
        ),
        "The fresh preview no longer represents the exact original contact and product.",
      );
      assertReplacement(
        bound.prospectRowHash === original.rowHash ||
          bound.prospectRowHash === original.legacyHash,
        "The original prospect changed after preview research.",
      );
      const [attempt] = await scope
        .select({
          row: schema.outboundSendAttempt,
          hash: fullHash(schema.outboundSendAttempt),
        })
        .from(schema.outboundSendAttempt)
        .where(
          eq(schema.outboundSendAttempt.id, bound.manifestItem.firstAttemptId),
        );
      const [revision] = await scope
        .select({
          row: schema.outboundRevision,
          hash: fullHash(schema.outboundRevision),
        })
        .from(schema.outboundRevision)
        .where(
          and(
            eq(schema.outboundRevision.prospectId, original.row.id),
            eq(
              schema.outboundRevision.revision,
              bound.manifestItem.firstSentRevision,
            ),
          ),
        );
      assertReplacement(
        attempt?.row.status === "accepted" &&
          !attempt.row.test &&
          attempt.row.step === 1 &&
          attempt.row.prospectId === original.row.id &&
          attempt.hash === bound.firstAttemptHash &&
          revision?.hash === bound.firstRevisionHash &&
          revision.row.contentHash === bound.manifestItem.firstContentHash &&
          attempt.row.contentHash === revision.row.contentHash &&
          revision.row.manifest.recipient.toLowerCase() ===
            original.row.details.email.toLowerCase(),
        "The authorized accepted first email does not match.",
      );
      const identity = senderIdentity(REPLACEMENT_SENDER, policy.settings);
      assertReplacement(
        identity &&
          identity.signature.trim() === "Xhurian" &&
          !/\bIseld\b|Shopify Plus/i.test(
            `${identity.founderLine} ${identity.productCheckIntro}`,
          ) &&
          revision.row.manifest.sender.toLowerCase() !== REPLACEMENT_SENDER &&
          company.lastContactedAt,
        "The replacement needs the truthful new Xhurian sender and original contact history.",
      );
      const identifier = randomUUID();
      const notBefore = new Date(
        Math.max(
          Date.parse(REPLACEMENT_EARLIEST),
          Date.parse(policy.settings.outreachNotBefore ?? REPLACEMENT_EARLIEST),
        ),
      ).toISOString();
      const authorization = replacementAuthorizationSchema.parse({
        ...request,
        version: "fresh-sequence-v1",
        manifestHash: REPLACEMENT_MANIFEST_HASH,
        sourceRowHash: bound.prospectRowHash,
        sourceRowProjection:
          bound.prospectRowHash === original.rowHash
            ? "full"
            : "before-replacements",
        sourceAttemptId: attempt.row.id,
        sourceAttemptHash: attempt.hash,
        sourceRevision: revision.row.revision,
        sourceRevisionHash: revision.hash,
        previewReceiptHash: replacementHash(reviewed.receipt),
        reviewedMessagesHash: replacementHash(plain(reviewed.preview.messages)),
        senderEmail: REPLACEMENT_SENDER,
        senderHash: replacementHash(identity),
        companyLastContactedAt: company.lastContactedAt.toISOString(),
        notBefore,
        authorizedBy: actor,
        authorizedAt: new Date().toISOString(),
      });
      await scope.insert(schema.outboundProspect).values({
        id: identifier,
        replacementOf: original.row.id,
        replacementAuthorization: authorization,
        campaignId: original.row.campaignId,
        companyId: original.row.companyId,
        personId: original.row.personId,
        details: prospectSchema.parse({
          ...original.row.details,
          id: identifier,
          assignedSenderEmail: REPLACEMENT_SENDER,
          shoppingResearchId: "",
          shoppingFinding: null,
          findingReviewed: false,
          automationRefreshId: "",
        }),
        status: "held",
        holdReason: REPLACEMENT_HOLD,
        linkedinStatus: "closed",
        linkedinNote:
          "Fresh replacement is email-only; original LinkedIn history is retained.",
        createdBy: actor,
        playbookRevision: policy.revision,
      });
      return { prospectId: identifier, repeated: false };
    }),
  );

/** Normal research and durable composition remain the sole writers of child evidence and copy. */
export const prepareReplacement = async (
  actor: string,
  input: { prospectId: string; expectedRevision: number },
  dependencies: import("./sequence-composition").CompositionDependencies = {},
) =>
  resultify(async () => {
    const prepared = await db.transaction(async (scope) => {
      await scope.execute(
        sql`select pg_advisory_xact_lock(hashtext('ecentic-outbound-workspace'))`,
      );
      const [prospect] = await scope
        .select()
        .from(schema.outboundProspect)
        .where(eq(schema.outboundProspect.id, input.prospectId));
      assertReplacement(
        prospect &&
          prospect.revision === input.expectedRevision &&
          !prospect.sentStep &&
          prospect.status === "held" &&
          prospect.holdReason === REPLACEMENT_HOLD,
        "Choose the unchanged held replacement.",
      );
      const policy = await Store.policy(scope);
      const family = await assertSequenceFamilyWithin(
        scope,
        prospect,
        policy.settings,
      );
      assertReplacement(
        family,
        "This prospect is not an authorized replacement.",
      );
      const reviewed = await loadReplacementPreviewWithin(
        scope,
        family.authorization,
        policy,
      );
      return {
        reviewed,
        policy,
        authorization: family.authorization,
        prospect,
      };
    });
    const Research = await import("./lead-research");
    const saved = prepared.prospect.details.shoppingResearchId
      ? {
          success: true as const,
          data: { revision: prepared.prospect.revision },
        }
      : await Research.saveAndApply(actor, {
          requestId: input.prospectId,
          prospectId: input.prospectId,
          expectedRevision: input.expectedRevision,
          expectedPlaybookRevision: prepared.policy.revision,
          receipt: prepared.reviewed.receipt,
          captureJobId: prepared.authorization.previewJobId,
        });
    if (!saved.success) throw saved.error;
    const Composition = await import("./sequence-composition");
    const composed = await Composition.composeForProspect(
      actor,
      {
        prospectId: input.prospectId,
        expectedRevision: saved.data.revision,
        expectedPlaybookRevision: prepared.policy.revision,
        suppliedParts: prepared.reviewed.preview.parts,
      },
      dependencies,
    );
    if (!composed.success) throw composed.error;
    const result = await Store.saveComposedDraft(actor, {
      prospect: input.prospectId,
      revision: saved.data.revision,
      compositionJobId: composed.data.composition.jobId,
    });
    if (!result.success) throw result.error;
    return result.data;
  });
