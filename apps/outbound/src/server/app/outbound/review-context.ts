"use server";

import { isDeepStrictEqual } from "node:util";
import { type Result, resultify } from "@zenncore/utils";
import { and, eq, lt } from "drizzle-orm";
import { z } from "zod";
import { lintMessages, settingsForProspect } from "@/lib/outbound";
import {
  isReviewCopyIssue,
  type ReviewContext,
  reviewDiscoverySummary,
} from "@/lib/outbound-review-context";
import { shoppingResearchSchema } from "@/lib/outbound-shopping-research";
import { schema } from "@/server/database";
import { UserRole } from "@/server/database/validators";
import { withAuthorization } from "@/server/utils/authorization";
import { Environment } from "@/server/utils/environment";
import { NotFoundError, ValidationError } from "@/server/utils/error";
import { aiCaptureSchema } from "@/server/utils/outbound/live-shopping-contract";
import * as Policy from "@/server/utils/outbound/shopping-policy";
import * as Presence from "@/server/utils/outbound/shopping-presence";
import * as Research from "@/server/utils/outbound/shopping-research";
import { repository } from "@/server/utils/repository";
import * as Composition from "./sequence-composition";
import * as Store from "./store";

const Jobs = repository(schema.outboundIntegrationJob);
const Revisions = repository(schema.outboundRevision);
const inputSchema = z.object({ prospectId: z.string().uuid() }).strict();
const data = <Value>(result: Result<Value, Error>): Value => {
  if (!result.success) throw result.error;
  return result.data as Value;
};
const researchFor = async (prospect: ReviewContext["prospect"]) => {
  const identifier = z.string().uuid().safeParse(prospect.shoppingResearchId);
  if (!identifier.success) return null;
  const job = data(await Jobs.get(Environment.SERVER, identifier.data));
  const input = Research.researchJobInputSchema.safeParse(job?.input);
  const receipt = shoppingResearchSchema.safeParse(job?.output?.["receipt"]);
  if (
    job?.provider !== "automation" ||
    job.status !== "complete" ||
    job.prospectId !== prospect.id ||
    !input.success ||
    input.data.prospectId !== prospect.id ||
    !receipt.success ||
    input.data.receiptHash !== Research.researchHash(receipt.data)
  )
    return null;
  const proof = z
    .object({ answer: aiCaptureSchema })
    .safeParse(job.output?.["captureProof"]);
  return {
    receipt: receipt.data,
    answer: proof.success ? proof.data.answer : null,
  };
};

export const readReviewContext = withAuthorization(
  [UserRole.STAFF],
  async (_, supplied: { prospectId: string }) =>
    resultify(async (): Promise<ReviewContext | null> => {
      const input = inputSchema.parse(supplied);
      const item = data(await Store.getProspectItem({ id: input.prospectId }));
      if (!item) return null;
      const { prospect } = item;
      const [research, revisions, compositions] = await Promise.all([
        researchFor(prospect),
        Revisions.find(Environment.SERVER, {
          where: and(
            eq(schema.outboundRevision.prospectId, prospect.id),
            lt(schema.outboundRevision.revision, prospect.revision),
          ),
          orderBy: [
            { column: schema.outboundRevision.revision, direction: "desc" },
          ],
          limit: 1,
        }),
        prospect.messages[0]?.writing?.compositionJobId
          ? Composition.loadCompletedComposition(
              undefined,
              prospect.messages[0].writing.compositionJobId,
            )
          : Promise.resolve(null),
      ]);
      const prior = data(revisions)[0];
      const visible = (messages: unknown) =>
        z
          .array(
            z.object({
              step: z.number(),
              subject: z.string(),
              body: z.string(),
              afterDays: z.number(),
            }),
          )
          .safeParse(messages);
      const current = visible(prospect.messages);
      const savedComposition = compositions?.success ? compositions.data : null;
      const saved = visible(savedComposition?.messages);
      const composition =
        savedComposition &&
        savedComposition.composition.prospectId === prospect.id &&
        savedComposition.appliedProspectRevision === prospect.revision &&
        research?.receipt &&
        savedComposition.composition.receiptHash ===
          Research.researchHash(research.receipt) &&
        savedComposition.context.prospectHash ===
          Policy.compositionProspectHash({
            ...prospect,
            assignedSenderEmail: savedComposition.policySnapshot.fromEmail,
          }) &&
        isDeepStrictEqual(prospect.messages[0]?.writing, {
          ...savedComposition.messages[0]?.writing,
          revision: prospect.revision,
        }) &&
        current.success &&
        saved.success &&
        isDeepStrictEqual(current.data, saved.data)
          ? savedComposition
          : null;
      const receipt = research?.receipt;
      const query = receipt?.queries[receipt.selected.queryIndex ?? 0];
      const capturedAnswer = research?.answer;
      const replay = capturedAnswer
        ? resultify(() => Presence.replayShoppingCapture(capturedAnswer))
        : null;
      const currentPolicy = settingsForProspect(
        { id: prospect.id, details: prospect },
        item.playbook,
      );
      const displayPolicy = composition?.policySnapshot ?? currentPolicy;
      const currentHash = Policy.writingPolicyHash(currentPolicy, {
        globalVoiceNotes: item.playbook.voiceNotes,
      });
      const proposal =
        composition?.preview === true &&
        composition.composition.writingPolicyHash !== currentHash;
      const copyTrusted =
        Boolean(composition) &&
        (proposal ||
          composition?.composition.writingPolicyHash === currentHash);
      return {
        prospect: proposal
          ? {
              ...prospect,
              issues: [
                ...prospect.issues.filter((issue) => !isReviewCopyIssue(issue)),
                ...lintMessages(
                  prospect.messages,
                  displayPolicy,
                  prospect,
                  receipt,
                ),
              ],
            }
          : prospect,
        playbook: displayPolicy,
        proposal,
        copyTrusted,
        copyEditable: prospect.sentStep === 0 && copyTrusted,
        research: receipt
          ? {
              query: query?.query ?? "",
              queryIntent: query?.intent ?? null,
              priceDifference: Boolean(receipt.priceComparison),
              kind: receipt.selected.kind,
              observation: receipt.selected.observation,
              ...reviewDiscoverySummary(receipt),
              checkedAt:
                query?.executedAt ??
                receipt.sources[0]?.checkedAt ??
                prospect.updatedAt,
              fullAnswerAvailable: replay?.success === true,
            }
          : null,
        previous: prior
          ? {
              revision: prior.revision,
              createdAt: prior.createdAt.toISOString(),
              messages: prior.messages,
              postalAddress: prior.manifest.postalAddress,
            }
          : null,
      };
    }),
  "Outbound.readReviewContext",
);

/** Only saved, replayed text crosses this boundary. It is rendered as text, never HTML. */
export const readSavedAnswer = withAuthorization(
  [UserRole.STAFF],
  async (_, supplied: { prospectId: string; revision: number }) =>
    resultify(async () => {
      const input = inputSchema
        .extend({ revision: z.number().int().nonnegative() })
        .parse(supplied);
      const item = data(await Store.getProspectItem({ id: input.prospectId }));
      if (!item) throw new NotFoundError("This prospect is unavailable.");
      if (item.prospect.revision !== input.revision)
        throw new ValidationError("The research changed. Reload this review.");
      const research = await researchFor(item.prospect);
      const capturedAnswer = research?.answer;
      if (!capturedAnswer)
        throw new ValidationError("The full saved answer is unavailable.");
      const replay = resultify(() =>
        Presence.replayShoppingCapture(capturedAnswer),
      );
      if (!replay.success)
        throw new ValidationError("The saved answer could not be verified.");
      return {
        text: replay.data.answerText,
        citations: replay.data.citationText,
      };
    }),
  "Outbound.readSavedAnswer",
);
