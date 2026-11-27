import { createHash } from "node:crypto";
import type { Playbook, ProspectInput } from "@/lib/outbound";
import {
  LEGACY_WRITING_CONTRACT_VERSION,
  WRITING_CONTRACT_VERSION,
} from "@/lib/outbound-composition";
import { COPY_QUALITY_VERSION } from "@/lib/outbound-copy-quality";
import { FINDING_COPY_FIELDS } from "@/lib/outbound-finding-copy";

export type WritingPolicyContext = { globalVoiceNotes?: string };

/** Verification timestamps have their own approval checks and do not change written copy. */
export const compositionProspectHash = (prospect: ProspectInput) =>
  createHash("sha256")
    .update(
      JSON.stringify({
        id: prospect.id,
        email: prospect.email,
        assignedSenderEmail: prospect.assignedSenderEmail,
        company: prospect.company,
        domain: prospect.domain,
        name: prospect.name,
        first: prospect.first,
        title: prospect.title,
        product: prospect.product,
        productUrl: prospect.productUrl,
        productCategory: prospect.productCategory,
        personalLine: prospect.personalLine,
        personalSource: prospect.personalSource,
        personalPublishedAt: prospect.personalPublishedAt,
      }),
    )
    .digest("hex");

/** Wording and delivery settings do not change what was actually observed. */
export const researchPolicyHash = (settings: Playbook) =>
  createHash("sha256")
    .update(
      JSON.stringify({
        instructions: settings.researchInstructions,
        required: settings.requireShoppingEvidence,
        // Omit newly introduced defaults so historical policy hashes stay valid.
        ...((settings.queryStyle ?? "") ||
        (settings.searchesPerLead ?? 2) !== 2 ||
        (settings.discoveryFreshnessDays ?? 7) !== 7
          ? {
              queryControls: {
                style: settings.queryStyle ?? "",
                searchesPerLead: settings.searchesPerLead ?? 2,
                discoveryFreshnessDays: settings.discoveryFreshnessDays ?? 7,
              },
            }
          : {}),
      }),
    )
    .digest("hex");

/** Copy changes create new writing jobs without changing capture provenance. */
const boundWritingPolicyHash = (
  settings: Playbook & { relevanceLines?: string[] },
  context: WritingPolicyContext,
  legacy: boolean,
) =>
  createHash("sha256")
    .update(
      JSON.stringify({
        version: legacy
          ? LEGACY_WRITING_CONTRACT_VERSION
          : WRITING_CONTRACT_VERSION,
        copyQualityVersion: legacy ? "copy-checks-v1" : COPY_QUALITY_VERSION,
        subjectTemplate: settings.subjectTemplate,
        bodyTemplate: settings.bodyTemplate,
        followupOneTemplate: settings.followupOneTemplate,
        followupTwoTemplate: settings.followupTwoTemplate,
        linkedinTemplate: settings.linkedinTemplate,
        founderLine: settings.founderLine,
        productCheckIntro: settings.productCheckIntro,
        callToAction: settings.callToAction,
        signature: settings.signature,
        optout: settings.optout,
        fromName: settings.fromName,
        fromEmail: settings.fromEmail,
        postalAddress: settings.postalAddress,
        voiceNotes: settings.voiceNotes,
        globalVoiceNotes: context.globalVoiceNotes ?? settings.voiceNotes,
        humanizeDrafts: settings.humanizeDrafts,
        humanizerNotes: settings.humanizerNotes,
        relevanceLines: settings.relevanceLines ?? [],
        sentEmailExamples: settings.sentEmailExamples,
        bannedPhrases: settings.bannedPhrases,
        firstEmailBlockedClaims: settings.firstEmailBlockedClaims,
        maxBodyWords: settings.maxBodyWords,
        followupOneDays: settings.followupOneDays,
        followupTwoDays: settings.followupTwoDays,
        partLimits: { opening: 22, result: 30, relevance: 28, sentence: 25 },
        pageFindingCopy: Object.fromEntries(
          FINDING_COPY_FIELDS.map((field) => [field, settings[field]]),
        ),
      }),
    )
    .digest("hex");

/** New writes always use the current contract. */
export const writingPolicyHash = (
  settings: Playbook,
  context: WritingPolicyContext = {},
) => boundWritingPolicyHash(settings, context, false);
/** Explicit historical read support; never used to authorize a new write. */
export const legacyWritingPolicyHash = (
  settings: Playbook,
  context: WritingPolicyContext = {},
) => boundWritingPolicyHash(settings, context, true);
