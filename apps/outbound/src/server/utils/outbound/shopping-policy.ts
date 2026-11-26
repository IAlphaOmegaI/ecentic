import { createHash } from "node:crypto";
import type { Playbook } from "@/lib/outbound";
import { WRITING_CONTRACT_VERSION } from "@/lib/outbound-composition";

/** Wording and delivery settings do not change what was actually observed. */
export const researchPolicyHash = (settings: Playbook) =>
  createHash("sha256")
    .update(
      JSON.stringify({
        instructions: settings.researchInstructions,
        required: settings.requireShoppingEvidence,
      }),
    )
    .digest("hex");

/** Copy changes create new writing jobs without changing capture provenance. */
export const writingPolicyHash = (
  settings: Playbook & { relevanceLines?: string[] },
) =>
  createHash("sha256")
    .update(
      JSON.stringify({
        version: WRITING_CONTRACT_VERSION,
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
      }),
    )
    .digest("hex");
