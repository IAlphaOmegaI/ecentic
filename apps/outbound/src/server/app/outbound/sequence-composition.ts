import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { type Result, resultify } from "@zenncore/utils";
import { and, desc, eq, inArray, ne, or, sql } from "drizzle-orm";
import { z } from "zod";
import {
  playbookSchema,
  prospectSchema,
  settingsForProspect,
} from "@/lib/outbound";
import {
  canonicalSequenceInput,
  type WriterParts,
  writerPartsSchema,
  writingSnapshotSchema,
} from "@/lib/outbound-composition";
import { hasCompleteCopyVerdict } from "@/lib/outbound-copy-quality";
import { rebuildWritingProposal } from "@/lib/outbound-rebuild-policy";
import {
  compositionReferenceSchema,
  writerCandidatesSchema,
} from "@/lib/outbound-sequence-composition";
import { shoppingResearchSchema } from "@/lib/outbound-shopping-research";
import type { CompositionPeer } from "@/lib/outbound-writing";
import { db, schema, type TransactionScope } from "@/server/database";
import { Environment } from "@/server/utils/environment";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/server/utils/error";
import * as Draft from "@/server/utils/outbound/draft";
import { IntegrationError } from "@/server/utils/outbound/http";
import * as Policy from "@/server/utils/outbound/shopping-policy";
import * as Research from "@/server/utils/outbound/shopping-research";
import { appendWriterCandidate } from "@/server/utils/outbound/writing-candidates";
import { repository } from "@/server/utils/repository";
import * as Store from "./store";

const Jobs = repository(schema.outboundIntegrationJob);
const Prospects = repository(schema.outboundProspect);
type Prospect = typeof schema.outboundProspect.$inferSelect;
type Job = typeof schema.outboundIntegrationJob.$inferSelect;
const hash = (input: string) =>
  createHash("sha256").update(input).digest("hex");
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const peerSchema = z.object({
  opening: z.string(),
  relationship: z.string().nullable(),
  occasion: z.string().nullable(),
});
const policySchema = playbookSchema;
const inputSchema = z.object({
  operation: z.literal("sequenceComposition"),
  step: z.literal(1),
  key: z.string(),
  prospectId: z.string().uuid(),
  prospectRevision: z.number().int().nonnegative(),
  playbookRevision: z.number().int().nonnegative(),
  campaignId: z.string().uuid().nullable(),
  batchKey: z.string().nullable(),
  receiptHash: digest,
  writingPolicyHash: digest,
  prospectHash: digest,
  actor: z.string().min(1),
  prospect: prospectSchema,
  receipt: shoppingResearchSchema,
  settings: policySchema,
  globalVoiceNotes: z.string(),
  preview: z.boolean().optional(),
  baseWritingPolicyHash: digest.optional(),
  suppliedParts: writerPartsSchema.optional(),
  peers: z.array(peerSchema).max(9),
  requestedAt: z.string().datetime(),
});
const leaseSchema = z.object({
  token: z.string().uuid(),
  expiresAt: z.string().datetime(),
});
const messageSchema = z.object({
  step: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  afterDays: z.number().int().nonnegative(),
  subject: z.string().min(1),
  body: z.string().min(1),
  writing: writingSnapshotSchema.optional(),
});
const outputSchema = z.object({
  messages: z.array(messageSchema).length(3),
  issues: z.array(z.object({ code: z.string(), field: z.string() })).max(100),
  generation: z.object({ attempts: z.number().int().min(1).max(2) }),
  composition: compositionReferenceSchema,
  context: z.object({ batchKey: z.string().nullable(), prospectHash: digest }),
  lease: z.null(),
  completedAt: z.string().datetime(),
  appliedProspectRevision: z.number().int().nonnegative().optional(),
  savedAt: z.string().datetime().optional(),
  writerCandidates: writerCandidatesSchema.optional(),
});
export type CompletedComposition = Pick<
  z.infer<typeof outputSchema>,
  "messages" | "issues" | "generation" | "composition" | "context"
> &
  Pick<z.infer<typeof outputSchema>, "appliedProspectRevision" | "savedAt"> & {
    preview: boolean;
    policySnapshot: z.infer<typeof policySchema>;
    globalVoiceNotes: string;
    baseWritingPolicyHash: string;
  };
export type CompositionDependencies = {
  compose?: typeof Draft.composeSequence;
  generate?: Draft.CompositionDependencies["generate"];
  judge?: Draft.CompositionDependencies["judge"];
  now?: () => number;
  deadline?: number;
};
const requestSchema = z
  .object({
    prospectId: z.string().uuid(),
    expectedRevision: z.number().int().nonnegative().optional(),
    expectedPlaybookRevision: z.number().int().nonnegative().optional(),
    preview: z.boolean().optional(),
    suppliedParts: writerPartsSchema.optional(),
  })
  .strict();
const value = <Data>(response: Result<Data, Error>): Data => {
  if (!response.success) throw response.error;
  return response.data as Data;
};
const transaction = <Data>(
  operation: (scope: TransactionScope) => Promise<Data>,
) =>
  resultify(() =>
    db.transaction(async (scope) => {
      await scope.execute(
        sql`select pg_advisory_xact_lock(hashtext('ecentic-outbound-workspace'))`,
      );
      return operation(scope);
    }),
  );

export const compositionJobKey = (
  prospectId: string,
  receiptHash: string,
  writingPolicyHash: string,
  suppliedParts?: WriterParts,
) =>
  suppliedParts
    ? `sequence-review:${hash(JSON.stringify({ prospectId, receiptHash, writingPolicyHash, step: 1, parts: suppliedParts }))}`
    : `sequence-writing:${hash(JSON.stringify({ prospectId, receiptHash, writingPolicyHash, step: 1 }))}`;

const readCompleted = (job: Job): CompletedComposition => {
  const parsedInput = inputSchema.safeParse(job.input);
  const parsedOutput = outputSchema.safeParse(job.output);
  if (
    job.provider !== "automation" ||
    job.status !== "complete" ||
    !parsedInput.success ||
    !parsedOutput.success
  )
    throw new ValidationError(
      "The writing job has no verified completed sequence.",
    );
  const input = parsedInput.data;
  const output = parsedOutput.data;
  for (const candidate of output.writerCandidates ?? [])
    appendWriterCandidate([], candidate, input);
  const canonical = canonicalSequenceInput(output.messages);
  const writing = output.messages[0]?.writing;
  const key = compositionJobKey(
    input.prospectId,
    input.receiptHash,
    input.writingPolicyHash,
    input.suppliedParts,
  );
  if (
    job.prospectId !== input.prospectId ||
    job.requestId !== key ||
    input.key !== key ||
    input.prospect.id !== input.prospectId ||
    input.prospect.assignedSenderEmail !== input.settings.fromEmail ||
    Research.researchHash(input.receipt) !== input.receiptHash ||
    Policy.writingPolicyHash(input.settings, {
      globalVoiceNotes: input.globalVoiceNotes,
    }) !== input.writingPolicyHash ||
    Policy.compositionProspectHash(input.prospect) !== input.prospectHash ||
    canonical.status !== "ready" ||
    !writing ||
    (writing.compositionJobId !== undefined &&
      writing.compositionJobId !== job.id) ||
    !hasCompleteCopyVerdict(writing.quality) ||
    writing.revision !== null ||
    writing.writingPolicyHash !== input.writingPolicyHash ||
    writing.receiptHash !== input.receiptHash ||
    writing.contentHash !== hash(canonical.canonicalText) ||
    (input.suppliedParts !== undefined &&
      JSON.stringify(input.suppliedParts) !== JSON.stringify(writing.parts)) ||
    output.messages.slice(1).some((message) => message.writing !== undefined) ||
    output.composition.jobId !== job.id ||
    output.composition.key !== key ||
    output.composition.prospectId !== input.prospectId ||
    output.composition.prospectRevision !== input.prospectRevision ||
    output.composition.playbookRevision !== input.playbookRevision ||
    output.composition.receiptHash !== input.receiptHash ||
    output.composition.writingPolicyHash !== input.writingPolicyHash ||
    output.composition.contentHash !== writing.contentHash ||
    output.context.prospectHash !== input.prospectHash ||
    output.context.batchKey !== input.batchKey
  )
    throw new ValidationError(
      "The saved writing result no longer matches its original prospect, policy or text.",
    );
  return {
    messages: output.messages,
    issues: output.issues,
    generation: output.generation,
    composition: output.composition,
    context: output.context,
    preview: input.preview ?? false,
    policySnapshot: input.settings,
    globalVoiceNotes: input.globalVoiceNotes,
    baseWritingPolicyHash:
      input.baseWritingPolicyHash ?? input.writingPolicyHash,
    ...(output.appliedProspectRevision === undefined
      ? {}
      : { appliedProspectRevision: output.appliedProspectRevision }),
    ...(output.savedAt === undefined ? {} : { savedAt: output.savedAt }),
  };
};

/** Store uses the saved provider result, never message metadata supplied by a client. */
export const loadCompletedComposition = (
  scope: TransactionScope | undefined,
  jobId: string,
): Promise<Result<CompletedComposition, Error>> =>
  resultify(async () => {
    if (!z.string().uuid().safeParse(jobId).success)
      throw new ValidationError("Choose a completed writing job.");
    const job = value(await Jobs.get(Environment.SERVER, jobId, { tx: scope }));
    if (!job) throw new NotFoundError("Writing job not found.");
    return readCompleted(job);
  });

export const findCompletedComposition = (
  scope: TransactionScope,
  input: {
    prospectId: string;
    receiptHash: string;
    writingPolicyHash: string;
    jobId?: string;
  },
): Promise<Result<CompletedComposition | null, Error>> =>
  resultify(async () => {
    const key = compositionJobKey(
      input.prospectId,
      input.receiptHash,
      input.writingPolicyHash,
    );
    const job = value(
      await Jobs.find(
        Environment.SERVER,
        {
          where: input.jobId
            ? and(
                eq(schema.outboundIntegrationJob.id, input.jobId),
                eq(schema.outboundIntegrationJob.prospectId, input.prospectId),
              )
            : eq(schema.outboundIntegrationJob.requestId, key),
          limit: 1,
        },
        { tx: scope },
      ),
    )[0];
    if (job?.status !== "complete") return null;
    const completed = readCompleted(job);
    return completed.composition.receiptHash === input.receiptHash &&
      completed.composition.writingPolicyHash === input.writingPolicyHash
      ? completed
      : null;
  });

/** Only writing metadata is selected; provider captures never enter the peer queue. */
export const recentCompositionPeers = (
  prospect: Pick<Prospect, "id" | "campaignId">,
  batchKey: string | null,
  scope?: TransactionScope,
): Promise<Result<CompositionPeer[], Error>> =>
  resultify(async () => {
    const connection = scope ?? db;
    const [saved, prepared] = await Promise.all([
      connection
        .select({
          id: schema.outboundProspect.id,
          writing: sql<unknown>`${schema.outboundProspect.messages}->0->'writing'`,
        })
        .from(schema.outboundProspect)
        .where(
          and(
            ne(schema.outboundProspect.id, prospect.id),
            sql`${schema.outboundProspect.messages}->0->'writing' is not null`,
            or(
              inArray(schema.outboundProspect.status, ["approved", "active"]),
              prospect.campaignId
                ? eq(schema.outboundProspect.campaignId, prospect.campaignId)
                : undefined,
            ),
          ),
        )
        .orderBy(
          desc(
            sql`${schema.outboundProspect.messages}->0->'writing'->>'generatedAt'`,
          ),
        )
        .limit(100),
      batchKey
        ? connection
            .select({
              id: schema.outboundIntegrationJob.prospectId,
              writing: sql<unknown>`${schema.outboundIntegrationJob.output}->'messages'->0->'writing'`,
            })
            .from(schema.outboundIntegrationJob)
            .where(
              and(
                eq(schema.outboundIntegrationJob.provider, "automation"),
                eq(schema.outboundIntegrationJob.status, "complete"),
                ne(schema.outboundIntegrationJob.prospectId, prospect.id),
                sql`${schema.outboundIntegrationJob.input}->>'operation' = 'sequenceComposition'`,
                sql`${schema.outboundIntegrationJob.input}->>'batchKey' = ${batchKey}`,
              ),
            )
            .orderBy(desc(schema.outboundIntegrationJob.createdAt))
            .limit(100)
        : [],
    ]);
    const entries = [...saved, ...prepared]
      .flatMap((entry) => {
        const writing = writingSnapshotSchema.safeParse(entry.writing);
        return entry.id && writing.success
          ? [
              {
                id: entry.id,
                generatedAt: writing.data.generatedAt,
                opening: writing.data.parts.opening,
                ...writing.data.narrative,
              },
            ]
          : [];
      })
      .sort(
        (left, right) =>
          Date.parse(right.generatedAt) - Date.parse(left.generatedAt),
      );
    return entries
      .filter(
        (entry, index) =>
          entries.findIndex((candidate) => candidate.id === entry.id) === index,
      )
      .slice(0, 9)
      .map(({ opening, relationship, occasion }) => ({
        opening,
        relationship,
        occasion,
      }));
  });

const batchFor = async (scope: TransactionScope, prospect: Prospect) => {
  const rows = await scope
    .select({
      batchId: sql<unknown>`${schema.outboundIntegrationJob.input}->>'batchId'`,
    })
    .from(schema.outboundIntegrationJob)
    .where(
      and(
        eq(schema.outboundIntegrationJob.provider, "automation"),
        eq(schema.outboundIntegrationJob.prospectId, prospect.id),
        sql`${schema.outboundIntegrationJob.input}->>'operation' = 'savedContactPreparation'`,
      ),
    )
    .orderBy(desc(schema.outboundIntegrationJob.createdAt))
    .limit(1);
  const batch = z.string().uuid().safeParse(rows[0]?.batchId);
  return batch.success
    ? `saved:${batch.data}`
    : prospect.campaignId
      ? `campaign:${prospect.campaignId}`
      : null;
};

const uncertain = (jobId: string, message: string) =>
  new IntegrationError("azure", "uncertain", message, 409, null, null, {
    compositionJobId: jobId,
  });

/** One reservation covers the writer's bounded generation/repair pair for all three emails. */
export const composeForProspect = async (
  actor: string,
  request: z.infer<typeof requestSchema>,
  dependencies: CompositionDependencies = {},
): Promise<Result<CompletedComposition, Error>> => {
  const parsed = requestSchema.safeParse(request);
  if (!parsed.success || !actor.trim())
    return {
      success: false,
      error: new ValidationError(
        "Choose a prospect and current writing revisions.",
      ),
    };
  const now = dependencies.now ?? Date.now;
  const claimed = await transaction(async (scope) => {
    const policy = await Store.policy(scope);
    const prospect = value(
      await Prospects.get(Environment.SERVER, parsed.data.prospectId, {
        tx: scope,
      }),
    );
    if (!prospect) throw new NotFoundError("Prospect not found.");
    if (
      (parsed.data.expectedRevision !== undefined &&
        prospect.revision !== parsed.data.expectedRevision) ||
      (parsed.data.expectedPlaybookRevision !== undefined &&
        policy.revision !== parsed.data.expectedPlaybookRevision)
    )
      throw new ConflictError(
        "The prospect or Playbook changed before writing started.",
      );
    if (
      prospect.sentStep ||
      !["candidate", "draft", "held", "approved"].includes(prospect.status)
    )
      throw new ValidationError(
        "Only an unsent editable prospect can receive a new sequence.",
      );
    if (
      parsed.data.preview &&
      (prospect.status !== "held" || !prospect.holdReason)
    )
      throw new ValidationError(
        "Preview the proposed formula only on a held unsent prospect.",
      );
    const liveSettings = settingsForProspect(prospect, policy.settings);
    const selectedPolicy = parsed.data.preview
      ? rebuildWritingProposal(policy.settings)
      : policy.settings;
    const settings = settingsForProspect(prospect, selectedPolicy);
    const details = prospectSchema.parse({
      ...prospect.details,
      id: prospect.id,
      assignedSenderEmail: settings.fromEmail,
    });
    const receipt = await Research.assertShoppingEvidence(scope, prospect, {
      ...policy,
      settings: liveSettings,
    });
    if (!receipt)
      throw new ValidationError(
        "Save a supported shopping receipt before writing.",
      );
    const receiptHash = Research.researchHash(receipt);
    const globalVoiceNotes = selectedPolicy.voiceNotes;
    const baseWritingPolicyHash = Policy.writingPolicyHash(liveSettings, {
      globalVoiceNotes: policy.settings.voiceNotes,
    });
    const writingPolicyHash = Policy.writingPolicyHash(settings, {
      globalVoiceNotes,
    });
    const prospectHash = Policy.compositionProspectHash(details);
    const key = compositionJobKey(
      prospect.id,
      receiptHash,
      writingPolicyHash,
      parsed.data.suppliedParts,
    );
    const prior = value(
      await Jobs.find(
        Environment.SERVER,
        { where: eq(schema.outboundIntegrationJob.requestId, key), limit: 1 },
        { tx: scope },
      ),
    )[0];
    if (prior) {
      const priorInput = inputSchema.safeParse(prior.input);
      if (!priorInput.success || priorInput.data.prospectHash !== prospectHash)
        throw new ConflictError(
          "The existing writing job used different prospect details. Review that result before requesting new copy.",
        );
      if (prior.status === "complete")
        return { status: "reused" as const, result: readCompleted(prior) };
      if (prior.status === "failed")
        return {
          status: "blocked" as const,
          error: new ValidationError(
            prior.error ||
              "Copy: The saved writing attempt was held. Update the copy settings before trying again.",
          ),
        };
      if (prior.status === "starting") {
        const { lease: savedLease } = prior.output ?? {};
        const lease = leaseSchema.safeParse(savedLease);
        if (lease.success && Date.parse(lease.data.expiresAt) > now())
          return {
            status: "blocked" as const,
            error: new ConflictError(
              "The sequence writer is already running. Reuse its completed result when it finishes.",
            ),
          };
        value(
          await Jobs.update(
            Environment.SERVER,
            prior.id,
            {
              status: "uncertain",
              error:
                "The writer lost its lease. Reconcile this attempt before another model request.",
              output: {
                ...prior.output,
                lease: null,
                ...(lease.success ? { expiredLease: lease.data } : {}),
              },
              updatedAt: new Date(now()),
            },
            { tx: scope },
          ),
        );
      }
      return {
        status: "blocked" as const,
        error: uncertain(
          prior.id,
          prior.error ||
            "The previous writing response is uncertain. Reconcile it before another model request.",
        ),
      };
    }
    const unresolved = value(
      await Jobs.find(
        Environment.SERVER,
        {
          where: and(
            eq(schema.outboundIntegrationJob.provider, "automation"),
            eq(schema.outboundIntegrationJob.prospectId, prospect.id),
            sql`${schema.outboundIntegrationJob.input}->>'operation' = 'sequenceComposition'`,
            inArray(schema.outboundIntegrationJob.status, [
              "starting",
              "pending",
              "uncertain",
            ]),
          ),
          limit: 1,
        },
        { tx: scope },
      ),
    )[0];
    if (unresolved)
      return {
        status: "blocked" as const,
        error: uncertain(
          unresolved.id,
          "An earlier writing attempt for this prospect is running or uncertain. Resolve it before using changed copy settings.",
        ),
      };
    if (
      dependencies.deadline !== undefined &&
      dependencies.deadline - now() < 35_000
    )
      throw new ConflictError(
        "There is not enough time to write and review this sequence. No writing request was started.",
      );
    const batchKey = await batchFor(scope, prospect);
    const peers = value(
      await recentCompositionPeers(prospect, batchKey, scope),
    );
    const input = inputSchema.parse({
      operation: "sequenceComposition",
      step: 1,
      key,
      prospectId: prospect.id,
      prospectRevision: prospect.revision,
      playbookRevision: policy.revision,
      campaignId: prospect.campaignId,
      batchKey,
      receiptHash,
      writingPolicyHash,
      prospectHash,
      actor,
      prospect: details,
      receipt,
      settings,
      globalVoiceNotes,
      preview: parsed.data.preview ?? false,
      baseWritingPolicyHash,
      ...(parsed.data.suppliedParts
        ? { suppliedParts: parsed.data.suppliedParts }
        : {}),
      peers,
      requestedAt: new Date(now()).toISOString(),
    });
    const lease = {
      token: randomUUID(),
      expiresAt: new Date(now() + 180_000).toISOString(),
    };
    const job = value(
      await Jobs.create(
        Environment.SERVER,
        {
          provider: "automation",
          prospectId: prospect.id,
          requestId: key,
          status: "starting",
          input,
          output: { lease },
        },
        { tx: scope },
      ),
    );
    return { status: "claimed" as const, job, input, lease };
  });
  if (!claimed.success) return claimed;
  if (claimed.data.status === "blocked")
    return { success: false, error: claimed.data.error };
  if (claimed.data.status === "reused")
    return { success: true, data: claimed.data.result };
  const claim = claimed.data;
  // This is the only provider boundary, deliberately outside the database transaction.
  const composed = await resultify(() =>
    (dependencies.compose ?? Draft.composeSequence)(
      claim.input.prospect,
      claim.input.receipt,
      claim.input.settings,
      {
        generate: dependencies.generate,
        judge: dependencies.judge,
        suppliedParts: claim.input.suppliedParts,
        now,
        deadline: dependencies.deadline,
        peers: claim.input.peers,
        globalVoiceNotes: claim.input.globalVoiceNotes,
        onCandidate: async (candidate) => {
          const active = value(
            await transaction(async (scope) => {
              const current = value(
                await Jobs.get(Environment.SERVER, claim.job.id, { tx: scope }),
              );
              const saved = leaseSchema.safeParse(current?.output?.["lease"]);
              const expired = leaseSchema.safeParse(
                current?.output?.["expiredLease"],
              );
              const ownsStarting =
                current?.status === "starting" &&
                saved.success &&
                saved.data.token === claim.lease.token;
              const ownsExpired =
                current?.status === "uncertain" &&
                expired.success &&
                expired.data.token === claim.lease.token;
              if (!current || (!ownsStarting && !ownsExpired))
                throw uncertain(
                  claim.job.id,
                  "The completed candidate belongs to a superseded writing lease. No repair or judge was called.",
                );
              if (
                JSON.stringify(inputSchema.parse(current.input)) !==
                JSON.stringify(claim.input)
              )
                throw uncertain(
                  claim.job.id,
                  "The original writing context changed. No repair or judge was called.",
                );
              const active =
                ownsStarting &&
                saved.success &&
                Date.parse(saved.data.expiresAt) > now();
              const writerCandidates = appendWriterCandidate(
                current.output?.["writerCandidates"],
                candidate,
                claim.input,
              );
              value(
                await Jobs.update(
                  Environment.SERVER,
                  current.id,
                  {
                    status: active ? "starting" : "uncertain",
                    output: {
                      ...current.output,
                      writerCandidates,
                      ...(!active
                        ? {
                            lease: null,
                            expiredLease: saved.success
                              ? saved.data
                              : expired.success
                                ? expired.data
                                : null,
                          }
                        : {}),
                    },
                    updatedAt: new Date(now()),
                  },
                  { tx: scope },
                ),
              );
              return active;
            }),
          );
          if (!active)
            throw uncertain(
              claim.job.id,
              "The completed candidate was retained after lease expiry. No repair or judge was called.",
            );
        },
        onWritten: async (draft) => {
          const mayJudge = value(
            await transaction(async (scope) => {
              const current = value(
                await Jobs.get(Environment.SERVER, claim.job.id, { tx: scope }),
              );
              const saved = leaseSchema.safeParse(current?.output?.["lease"]);
              const expired = leaseSchema.safeParse(
                current?.output?.["expiredLease"],
              );
              const ownsStarting =
                current?.status === "starting" &&
                saved.success &&
                saved.data.token === claim.lease.token;
              const ownsExpired =
                current?.status === "uncertain" &&
                expired.success &&
                expired.data.token === claim.lease.token;
              if (!current || (!ownsStarting && !ownsExpired))
                throw uncertain(
                  claim.job.id,
                  "The writing lease changed before copy review. The judge was not called.",
                );
              if (
                JSON.stringify(inputSchema.parse(current.input)) !==
                JSON.stringify(claim.input)
              )
                throw uncertain(
                  claim.job.id,
                  "The original writing context changed before copy review. The judge was not called.",
                );
              const active =
                ownsStarting &&
                saved.success &&
                Date.parse(saved.data.expiresAt) > now();
              value(
                await Jobs.update(
                  Environment.SERVER,
                  current.id,
                  {
                    status: active ? "starting" : "uncertain",
                    output: {
                      ...current.output,
                      draftBeforeJudge: draft,
                      writerCompletedAt: new Date(now()).toISOString(),
                      ...(!active
                        ? {
                            lease: null,
                            expiredLease: saved.success
                              ? saved.data
                              : expired.success
                                ? expired.data
                                : null,
                          }
                        : {}),
                    },
                    updatedAt: new Date(now()),
                  },
                  { tx: scope },
                ),
              );
              return active;
            }),
          );
          if (!mayJudge)
            throw uncertain(
              claim.job.id,
              "The writer response was retained after lease expiry. The judge was not called.",
            );
        },
      },
    ),
  );
  const response = composed.success
    ? composed.data
    : { success: false as const, error: composed.error };
  const completed = await transaction(async (scope) => {
    const current = value(
      await Jobs.get(Environment.SERVER, claim.job.id, { tx: scope }),
    );
    const { lease: savedLease } = current?.output ?? {};
    const lease = leaseSchema.safeParse(savedLease);
    const expiredLease = leaseSchema.safeParse(
      current?.output?.["expiredLease"],
    );
    if (
      current?.status === "uncertain" &&
      expiredLease.success &&
      expiredLease.data.token === claim.lease.token &&
      current.output?.["receivedAt"] === undefined
    ) {
      value(
        await Jobs.update(
          Environment.SERVER,
          current.id,
          {
            output: {
              ...current.output,
              receivedAt: new Date(now()).toISOString(),
              ...(response.success
                ? { unappliedResult: response.data }
                : {
                    failure: {
                      name: response.error.name,
                      message: response.error.message,
                    },
                  }),
            },
            updatedAt: new Date(now()),
          },
          { tx: scope },
        ),
      );
      return {
        success: false as const,
        error: uncertain(
          current.id,
          "The late writing response was retained for reconciliation. It has not been applied.",
        ),
      };
    }
    if (
      current?.status !== "starting" ||
      !lease.success ||
      lease.data.token !== claim.lease.token
    )
      return {
        success: false as const,
        error: uncertain(
          claim.job.id,
          "The writing lease changed. Reconcile the saved provider response before any retry.",
        ),
      };
    if (Date.parse(lease.data.expiresAt) <= now()) {
      value(
        await Jobs.update(
          Environment.SERVER,
          current.id,
          {
            status: "uncertain",
            output: {
              ...current.output,
              lease: null,
              receivedAt: new Date(now()).toISOString(),
              ...(response.success
                ? { unappliedResult: response.data }
                : {
                    failure: {
                      name: response.error.name,
                      message: response.error.message,
                    },
                  }),
            },
            error: "The writing response arrived after its lease expired.",
            updatedAt: new Date(now()),
          },
          { tx: scope },
        ),
      );
      return {
        success: false as const,
        error: uncertain(
          current.id,
          "The writing response arrived after its lease expired. Review this job before retrying.",
        ),
      };
    }
    if (!response.success) {
      const known = response.error.name === ValidationError.errorName;
      const message = known
        ? response.error.message
        : "The writing response could not be confirmed. Reconcile this job before another model request.";
      value(
        await Jobs.update(
          Environment.SERVER,
          current.id,
          {
            status: known ? "failed" : "uncertain",
            error: message,
            output: {
              ...current.output,
              lease: null,
              failure: { name: response.error.name, message },
              completedAt: new Date(now()).toISOString(),
            },
            updatedAt: new Date(now()),
          },
          { tx: scope },
        ),
      );
      return {
        success: false as const,
        error: known ? response.error : uncertain(current.id, message),
      };
    }
    const prepared = resultify(() => {
      const canonical = canonicalSequenceInput(response.data.messages);
      const writing = response.data.messages[0]?.writing;
      if (canonical.status !== "ready" || !writing)
        throw new ValidationError(
          "The writer returned no bound sequence snapshot.",
        );
      const output = outputSchema.parse({
        ...response.data,
        ...(current.output?.["writerCandidates"]
          ? { writerCandidates: current.output["writerCandidates"] }
          : {}),
        messages: response.data.messages.map((message) => ({
          ...message,
          ...(message.writing
            ? { writing: { ...message.writing, compositionJobId: current.id } }
            : {}),
        })),
        composition: {
          jobId: current.id,
          key: claim.input.key,
          prospectId: claim.input.prospectId,
          prospectRevision: claim.input.prospectRevision,
          playbookRevision: claim.input.playbookRevision,
          receiptHash: claim.input.receiptHash,
          writingPolicyHash: claim.input.writingPolicyHash,
          contentHash: hash(canonical.canonicalText),
        },
        context: {
          batchKey: claim.input.batchKey,
          prospectHash: claim.input.prospectHash,
        },
        lease: null,
        completedAt: new Date(now()).toISOString(),
      });
      readCompleted({ ...current, status: "complete", output });
      return output;
    });
    if (!prepared.success) {
      const message =
        "The writing response failed its saved-content checks. Reconcile this result before another model request.";
      value(
        await Jobs.update(
          Environment.SERVER,
          current.id,
          {
            status: "uncertain",
            error: message,
            output: {
              ...current.output,
              lease: null,
              failure: { name: prepared.error.name, message },
              unappliedResult: response.data,
              completedAt: new Date(now()).toISOString(),
            },
            updatedAt: new Date(now()),
          },
          { tx: scope },
        ),
      );
      return { success: false as const, error: uncertain(current.id, message) };
    }
    const saved = value(
      await Jobs.update(
        Environment.SERVER,
        current.id,
        {
          status: "complete",
          output: prepared.data,
          error: null,
          updatedAt: new Date(now()),
        },
        { tx: scope },
      ),
    );
    if (!saved) throw new NotFoundError("Writing job no longer exists.");
    return { success: true as const, data: readCompleted(saved) };
  });
  return completed.success
    ? completed.data
    : {
        success: false,
        error: uncertain(
          claim.job.id,
          "The writing result could not be durably confirmed. Reconcile this job before another model request.",
        ),
      };
};
