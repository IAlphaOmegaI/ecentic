import "server-only";
import { createHash } from "node:crypto";
import { type Result, resultify } from "@zenncore/utils";
import type { Issue, Message, Playbook, ProspectInput } from "@/lib/outbound";
import { personalSourceReadyForDraft, settingsForSender } from "@/lib/outbound";
import {
  assembleSequence,
  preflightWriterAssembly,
  WRITING_CONTRACT_VERSION,
  type WriterParts,
  writerPartsSchema,
  writingSnapshotSchema,
} from "@/lib/outbound-composition";
import { copyVerdictProblem } from "@/lib/outbound-copy-quality";
import type { CopyRulesContext } from "@/lib/outbound-round3-copy";
import {
  type WriterCandidate,
  writerCandidateSchema,
} from "@/lib/outbound-sequence-composition";
import {
  type ShoppingResearch,
  shoppingResearchSchema,
  validateShoppingResearch,
} from "@/lib/outbound-shopping-research";
import {
  type CompositionPeer,
  compositionPrompt,
  deriveWriterNarrative,
  validateWriterParts,
  validateWriterSubject,
} from "@/lib/outbound-writing";
import * as AI from "@/server/utils/ai";
import { ValidationError } from "@/server/utils/error";
import {
  type CopyQualityDependencies,
  judgeSequenceCopy,
} from "./copy-quality";
import { IntegrationError } from "./http";
import { compositionProspectHash, writingPolicyHash } from "./shopping-policy";
import { evidenceForDraft, researchHash } from "./shopping-research";
import {
  writerCandidateContextHash,
  writerDiagnosticHash,
} from "./writing-candidates";

export type CompositionPolicy = Playbook & { relevanceLines?: string[] };
type GenerationRequest = {
  output: typeof writerPartsSchema;
  instructions: string;
  prompt: string;
  deadline: number;
};
export type CompositionDependencies = CopyRulesContext & {
  generate?: (request: GenerationRequest) => Promise<WriterParts>;
  judge?: CopyQualityDependencies["generate"];
  suppliedParts?: WriterParts;
  onCandidate?: (candidate: WriterCandidate) => Promise<void>;
  onWritten?: (draft: {
    parts: WriterParts;
    messages: Message[];
    attempts: number;
  }) => Promise<void>;
  now?: () => number;
  deadline?: number;
  peers?: CompositionPeer[];
  globalVoiceNotes?: string;
};
export type ComposedSequence = {
  messages: Message[];
  issues: Issue[];
  generation: { attempts: number };
};

/** The only writer: supplied captures are immutable, and this function buys no research. */
export const composeSequence = async (
  prospect: ProspectInput,
  receipt: ShoppingResearch | null,
  policy: CompositionPolicy,
  dependencies: CompositionDependencies = {},
): Promise<Result<ComposedSequence, Error>> => {
  const now = dependencies.now ?? Date.now;
  const deadline = Math.min(
    dependencies.deadline ?? now() + 95_000,
    now() + 95_000,
  );
  const held = (reason: string): Result<ComposedSequence, Error> => ({
    success: false,
    error: new ValidationError(`Copy: ${reason}`),
  });
  if (dependencies.openingRuleException && !dependencies.suppliedParts)
    return held(
      "An opening exception is valid only for supplied owner-approved copy.",
    );
  const settings: CompositionPolicy = {
    ...settingsForSender(
      policy,
      prospect.assignedSenderEmail ?? policy.fromEmail,
    ),
    ...(policy.relevanceLines ? { relevanceLines: policy.relevanceLines } : {}),
  };
  const hashContext = {
    globalVoiceNotes: dependencies.globalVoiceNotes ?? policy.voiceNotes,
    ...(dependencies.copyRulesVersion
      ? { copyRulesVersion: dependencies.copyRulesVersion }
      : {}),
  };
  const parsedReceipt = shoppingResearchSchema.safeParse(receipt);
  if (!parsedReceipt.success)
    return held("Save the shopping research before writing.");
  const research = parsedReceipt.data;
  if (research.selected.kind === "product-observation")
    return held("This lead needs an unbranded search.");
  if (research.selected.kind === "no-gap")
    return held("No gap found. Try another product.");
  if (!research.claims?.length || !research.claimExcerpts?.length)
    return held("The research needs its observed claims ledger.");
  const researchProblem = validateShoppingResearch(
    research,
    settings.verificationDays,
    now(),
    settings,
  );
  if (researchProblem) return held(researchProblem);
  if (
    prospect.product !== research.product.name ||
    prospect.productUrl !== research.product.url
  )
    return held("The saved research belongs to a different product.");
  if (!settings.relevanceLines?.length)
    return held("Save the relevance lines before writing.");
  if (!personalSourceReadyForDraft(prospect, settings))
    return held(
      "Reopen and date the personal source, or remove the personal line.",
    );
  const preflight = preflightWriterAssembly(prospect, research, settings);
  if (preflight.status === "held") return held(preflight.reason);
  const generate =
    dependencies.generate ??
    ((request: GenerationRequest) =>
      AI.generate({
        ...request,
        model: "gpt",
        label: "outbound-sequence",
      }));
  const attempt = async (previous?: {
    parts: unknown;
    issues: string[];
  }): Promise<Result<ComposedSequence, Error>> => {
    const attempts = previous ? 2 : 1;
    if (deadline - now() < 35_000)
      return held(
        "The writing time budget ended before copy review could finish.",
      );
    const prompt = compositionPrompt({
      prospect,
      receipt: research,
      playbook: settings,
      budget: preflight.budget,
      peers: dependencies.peers,
      globalVoiceNotes: hashContext.globalVoiceNotes,
      copyRulesVersion: dependencies.copyRulesVersion,
      openingRuleException: dependencies.openingRuleException,
      ...(previous ? { previous } : {}),
    });
    const generated = dependencies.suppliedParts
      ? { success: true as const, data: dependencies.suppliedParts }
      : await resultify(() =>
          generate({
            output: writerPartsSchema,
            ...prompt,
            deadline: Math.min(deadline - 30_000, now() + 30_000),
          }),
        );
    if (!generated.success) {
      if (generated.error.name === ValidationError.errorName)
        return { success: false, error: generated.error };
      return {
        success: false,
        error: new IntegrationError(
          "azure",
          "uncertain",
          "The writing response was interrupted or invalid. Reconcile this writing job before retrying.",
          502,
          null,
          null,
          {
            attempts,
            writingPolicyHash: writingPolicyHash(settings, hashContext),
            receiptHash: researchHash(research),
          },
        ),
      };
    }
    const parsed = writerPartsSchema.safeParse(generated.data);
    if (!parsed.success) {
      const issues = [
        "The writer must return exactly the four required parts.",
      ];
      return previous || dependencies.suppliedParts
        ? held(issues[0] ?? "Invalid writer response.")
        : attempt({ parts: generated.data, issues });
    }
    const parts = parsed.data;
    const issues = validateWriterParts({
      prospect,
      receipt: research,
      playbook: settings,
      parts,
      peers: dependencies.peers,
      copyRulesVersion: dependencies.copyRulesVersion,
      openingRuleException: dependencies.openingRuleException,
    });
    const assembled = assembleSequence(
      prospect,
      research,
      settings,
      parts,
      dependencies,
    );
    const problems = [
      ...issues,
      ...(assembled.status === "held" ? [assembled.reason] : []),
      ...(assembled.status === "ready"
        ? validateWriterSubject(
            assembled.messages[0]?.subject ?? "",
            research,
            prospect,
            dependencies,
          )
        : []),
    ];
    const onCandidate = dependencies.onCandidate;
    if (onCandidate) {
      const context = {
        receiptHash: researchHash(research),
        writingPolicyHash: writingPolicyHash(settings, hashContext),
        prospectHash: compositionProspectHash(prospect),
        peers: dependencies.peers ?? [],
      };
      const recorded = await resultify(() =>
        onCandidate(
          writerCandidateSchema.parse({
            status: "unapproved",
            attempt: attempts,
            parts,
            issues: problems,
            completedAt: new Date(now()).toISOString(),
            partsHash: writerDiagnosticHash(JSON.stringify(parts)),
            instructionsHash: writerDiagnosticHash(prompt.instructions),
            promptHash: writerDiagnosticHash(prompt.prompt),
            receiptHash: context.receiptHash,
            writingPolicyHash: context.writingPolicyHash,
            prospectHash: context.prospectHash,
            contextHash: writerCandidateContextHash(context),
          }),
        ),
      );
      if (!recorded.success) return recorded;
    }
    if (problems.length)
      return previous || dependencies.suppliedParts
        ? held(problems.join(" "))
        : attempt({ parts, issues: problems });
    if (assembled.status === "held") return held(assembled.reason);
    const onWritten = dependencies.onWritten;
    if (onWritten) {
      const recorded = await resultify(() =>
        onWritten({
          parts,
          messages: assembled.messages,
          attempts,
        }),
      );
      if (!recorded.success) return recorded;
    }
    const reviewed = await judgeSequenceCopy(
      {
        prospect,
        receipt: research,
        playbook: settings,
        parts,
        messages: assembled.messages,
        peers: dependencies.peers,
        globalVoiceNotes: hashContext.globalVoiceNotes,
        copyRulesVersion: dependencies.copyRulesVersion,
        openingRuleException: dependencies.openingRuleException,
      },
      { generate: dependencies.judge, now, deadline },
    );
    if (!reviewed.success) return reviewed;
    const qualityProblem = copyVerdictProblem(reviewed.data);
    const narrative = deriveWriterNarrative(
      parts.opening,
      research.queries[research.selected.queryIndex]?.query ?? "",
    );
    const writing = writingSnapshotSchema.parse({
      version: WRITING_CONTRACT_VERSION,
      ...(dependencies.openingRuleException
        ? { openingRuleException: dependencies.openingRuleException }
        : {}),
      ...(dependencies.copyRulesVersion
        ? { copyRulesVersion: dependencies.copyRulesVersion }
        : {}),
      writingPolicyHash: writingPolicyHash(settings, hashContext),
      receiptHash: researchHash(research),
      contentHash: createHash("sha256")
        .update(assembled.canonicalText)
        .digest("hex"),
      revision: null,
      generatedAt: new Date(now()).toISOString(),
      parts,
      queryTopic: assembled.queryTopic,
      narrative: {
        relationship: narrative.relationship,
        occasion: narrative.occasion,
      },
      quality: reviewed.data,
    });
    return {
      success: true,
      data: {
        messages: assembled.messages.map((message) =>
          message.step === 1 ? { ...message, writing } : message,
        ),
        issues: qualityProblem
          ? [{ code: "copyQuality", field: `Copy: ${qualityProblem}` }]
          : [],
        generation: { attempts },
      },
    };
  };
  return attempt();
};

/** Runtime entry point validates the durable prospect and capture before composing. */
export const generateDraft = async (
  prospect: ProspectInput,
  policy: CompositionPolicy,
): Promise<Result<{ messages: Message[]; issues: Issue[] }, Error>> => {
  const settings = settingsForSender(
    policy,
    prospect.assignedSenderEmail ?? policy.fromEmail,
  );
  const research = await evidenceForDraft(prospect, settings);
  if (!research.success) return research;
  return composeSequence(prospect, research.data, policy);
};
