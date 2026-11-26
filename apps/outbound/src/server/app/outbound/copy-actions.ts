"use server";

import { resultify } from "@zenncore/utils";
import { z } from "zod";
import {
  writerPartsSchema,
  writingSnapshotSchema,
} from "@/lib/outbound-composition";
import { UserRole } from "@/server/database/validators";
import { withAuthorization } from "@/server/utils/authorization";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/server/utils/error";
import * as Composition from "./sequence-composition";
import * as Store from "./store";

const requestSchema = z
  .object({
    prospect: z.string().uuid(),
    revision: z.number().int().nonnegative(),
  })
  .strict();
const value = <Data>(
  response: { success: true; data: Data } | { success: false; error: Error },
): Data => {
  if (!response.success) throw response.error;
  return response.data;
};
const currentDraft = async (input: z.infer<typeof requestSchema>) => {
  const prospect = value(await Store.readProspect(input.prospect));
  if (!prospect) throw new NotFoundError("Prospect not found.");
  if (prospect.revision !== input.revision)
    throw new ConflictError(
      "This draft changed. Reload the current revision before editing.",
    );
  if (
    prospect.sentStep ||
    !["candidate", "draft", "held", "approved"].includes(prospect.status)
  )
    throw new ConflictError("Only an unsent open sequence can be edited here.");
  return prospect;
};
const savedJob = async (prospect: Awaited<ReturnType<typeof currentDraft>>) => {
  const identifier = prospect.messages[0]?.writing?.compositionJobId;
  if (!identifier) return null;
  const job = value(
    await Composition.loadCompletedComposition(undefined, identifier),
  );
  return job.composition.prospectId === prospect.id ? job : null;
};

/** Human edits are checked exactly as submitted; no writer rewrites the owner's words. */
export const saveWriterParts = withAuthorization(
  [UserRole.STAFF],
  async (context, input: unknown) =>
    resultify(async () => {
      const request = requestSchema
        .extend({ parts: writerPartsSchema })
        .parse(input);
      const prospect = await currentDraft(request);
      const original = await savedJob(prospect);
      const writing = writingSnapshotSchema.safeParse(
        prospect.messages[0]?.writing,
      );
      if (
        original &&
        writing.success &&
        JSON.stringify(writing.data.parts) === JSON.stringify(request.parts)
      )
        return value(
          await Store.saveComposedDraft(context.session.user.id, {
            prospect: prospect.id,
            revision: prospect.revision,
            compositionJobId: original.composition.jobId,
          }),
        );
      const composed = value(
        await Composition.composeForProspect(context.session.user.id, {
          prospectId: prospect.id,
          expectedRevision: prospect.revision,
          suppliedParts: request.parts,
          preview: original?.preview === true,
        }),
      );
      return value(
        await Store.saveComposedDraft(context.session.user.id, {
          prospect: prospect.id,
          revision: prospect.revision,
          compositionJobId: composed.composition.jobId,
        }),
      );
    }),
  "OutboundCopy.saveWriterParts",
);

/** Reuse a completed exact-text decision; a known failure needs an edit, never another judge purchase. */
export const rejudgeDraft = withAuthorization(
  [UserRole.STAFF],
  async (context, input: unknown) =>
    resultify(async () => {
      const request = requestSchema.parse(input);
      const prospect = await currentDraft(request);
      const original = await savedJob(prospect);
      if (original)
        return value(
          await Store.saveComposedDraft(context.session.user.id, {
            prospect: prospect.id,
            revision: prospect.revision,
            compositionJobId: original.composition.jobId,
          }),
        );
      if (prospect.messages[0]?.writing)
        throw new ValidationError(
          "The copy has no trusted saved writing job. Regenerate it before review.",
        );
      return value(
        await Store.generateDrafts(context.session.user.id, {
          prospect: prospect.id,
          expectedRevision: prospect.revision,
        }),
      );
    }),
  "OutboundCopy.rejudgeDraft",
);

/** Previewing never saves the Playbook, changes a sender, clears a hold or buys research. */
export const previewRebuild = withAuthorization(
  [UserRole.STAFF],
  async (context, input: unknown) =>
    resultify(async () => {
      const request = requestSchema.parse(input);
      const prospect = await currentDraft(request);
      const composed = value(
        await Composition.composeForProspect(context.session.user.id, {
          prospectId: prospect.id,
          expectedRevision: prospect.revision,
          preview: true,
        }),
      );
      return value(
        await Store.saveComposedDraft(context.session.user.id, {
          prospect: prospect.id,
          revision: prospect.revision,
          compositionJobId: composed.composition.jobId,
        }),
      );
    }),
  "OutboundCopy.previewRebuild",
);
