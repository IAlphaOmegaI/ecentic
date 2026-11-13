import { z } from "zod";
import type { Locale } from "../locales";
import {
  reviewInstructions,
  translationInstructions,
  translationPolicyVersion,
  translationReviewPasses,
} from "./policy";
import {
  type TranslationFinding,
  type TranslationUnit,
  validateTranslationUnit,
} from "./validation";

export { translationPolicyVersion } from "./policy";
export {
  type TranslationFinding,
  type TranslationUnit,
  validateTranslationUnit,
} from "./validation";

export type TranslationGeneration = {
  phase: "draft" | "review" | "correct" | "adjudicate";
  system: string;
  prompt: string;
  schemaName: string;
  schema: z.ZodType;
};

/** Each invocation must be an independent request without previous model messages. */
export type TranslationGenerator = (
  request: TranslationGeneration,
) => Promise<unknown>;

const artifactSchema = z
  .object({
    units: z.array(z.object({ id: z.string(), text: z.string() }).strict()),
  })
  .strict();

const reviewSchema = z
  .object({
    checkedPasses: z.array(z.enum(translationReviewPasses)),
    reviewedIds: z.array(z.string()),
    issues: z.array(
      z
        .object({
          id: z.string(),
          pass: z.enum(translationReviewPasses),
          message: z.string().min(1),
        })
        .strict(),
    ),
  })
  .strict();

export type TranslationReviewReport = {
  policyVersion: string;
  targetLocale: Locale;
  stage: "draft" | "corrected" | "adjudicated";
  documentContext?: string;
  deterministicFindings?: readonly TranslationFinding[];
  reviewCoverage?: {
    freshIds: readonly string[];
    reusedIds: readonly string[];
    reusedFrom: "draft";
  };
  adjudication?: {
    version: string;
    originalFindings: readonly TranslationFinding[];
    decisions: readonly TranslationAdjudicationDecision[];
  };
  reviewed: readonly string[];
  passes: typeof translationReviewPasses;
  findings: readonly TranslationFinding[];
  reviewedUnits: readonly (TranslationUnit & { target: string })[];
  humanReview: "not_requested";
  runtimeReview: "not_performed";
};

export class TranslationValidationError extends Error {
  readonly findings: readonly TranslationFinding[];
  /** Reviewed rows may be checkpointed, but the enclosing artifact is incomplete. */
  readonly approvedUnits: readonly { id: string; text: string }[];
  readonly rejectedUnits: readonly { id: string; text: string }[];

  constructor(
    findings: readonly TranslationFinding[],
    approvedUnits: readonly { id: string; text: string }[] = [],
    rejectedUnits: readonly { id: string; text: string }[] = [],
  ) {
    super(
      `Translation did not pass review: ${findings.map((finding) => `${finding.id}: ${finding.message}`).join("; ")}`,
    );
    this.name = "TranslationValidationError";
    this.findings = findings;
    this.approvedUnits = approvedUnits;
    this.rejectedUnits = rejectedUnits;
  }
}

const requireIdentifiers = (
  expected: readonly { id: string }[],
  actual: readonly { id: string }[],
  phase: string,
) => {
  const expectedIds = new Set(expected.map((unit) => unit.id));
  const actualIds = new Set(actual.map((unit) => unit.id));
  if (
    actualIds.size !== actual.length ||
    actual.length !== expected.length ||
    actual.some((unit) => !expectedIds.has(unit.id))
  )
    throw new TranslationValidationError([
      {
        id: "batch",
        pass: "structural",
        message: `${phase} returned missing, duplicate or unexpected unit IDs.`,
      },
    ]);
};

/** Adjudication changes the finding set, never the reviewed translation. */
export const translationAdjudicationVersion = "2026-11-12.1";

const adjudicationDecisionSchema = z
  .object({
    id: z.string(),
    classification: z.enum(["material", "not-material", "uncertain"]),
    sourceQuote: z.string().min(1),
    targetQuote: z.string().min(1),
    rationale: z.string().min(1),
  })
  .strict();
const adjudicationSchema = z
  .object({
    decisions: z.array(adjudicationDecisionSchema),
  })
  .strict();
export type TranslationAdjudicationDecision = z.infer<
  typeof adjudicationDecisionSchema
> & {
  finding: TranslationFinding;
  evidenceValid: boolean;
};

// Legacy records did not label deterministic findings. Keep their invariant checks
// locked even when a newer validator accepts a previously rejected representation.
const legacyDeterministic = (finding: TranslationFinding) =>
  /^(?:Invariant content changed\.|Nonempty source was omitted\.|Numeric facts differ|Protected term changed|Placeholder names or counts changed|Source ICU is invalid|Target ICU cannot parse|Preserve (?:code|URLs|email addresses|HTML tags|Markdown|currency)|message(?:[.:]|$)|Reviewer did not complete all six)/.test(
    finding.message,
  );
const findingKey = (finding: TranslationFinding) =>
  JSON.stringify([finding.id, finding.pass, finding.message]);
const uniqueFindings = (findings: readonly TranslationFinding[]) => [
  ...new Map(
    findings.map((finding) => [findingKey(finding), finding]),
  ).values(),
];

/** Corrections keep whole inline groups and adjacent groups, never isolated slots. */
const connectedContext = <T extends TranslationUnit>(
  units: readonly T[],
  identifiers: ReadonlySet<string>,
) => {
  const selected = units.filter((unit) => identifiers.has(unit.id));
  // Catalog fragments and article metadata can depend on the whole batch.
  if (!selected.length || selected.some((unit) => !unit.group)) return units;
  const selectedGroups = new Set(selected.map((unit) => unit.group));
  const contextualGroups = new Set(selectedGroups);
  const contextualIds = new Set(identifiers);
  units.forEach((unit, index) => {
    if (!unit.group || !selectedGroups.has(unit.group)) return;
    for (const neighbor of [units[index - 1], units[index + 1]]) {
      if (!neighbor) continue;
      contextualIds.add(neighbor.id);
      if (neighbor.group) contextualGroups.add(neighbor.group);
    }
  });
  return units.filter(
    (unit) =>
      contextualIds.has(unit.id) ||
      (unit.group && contextualGroups.has(unit.group)),
  );
};

/** A fresh evidence-only request resolves disputed editorial findings after final QA. */
export const adjudicateTranslationReport = async ({
  report,
  generate,
  documentContext = report.documentContext ?? "",
}: {
  report: TranslationReviewReport;
  generate: TranslationGenerator;
  documentContext?: string;
}): Promise<TranslationReviewReport> => {
  if (
    report.policyVersion !== translationPolicyVersion ||
    report.stage !== "corrected"
  )
    throw new Error(
      "Adjudication requires a current-policy final corrected review.",
    );
  if (JSON.stringify(report.passes) !== JSON.stringify(translationReviewPasses))
    throw new Error("Adjudication requires all six completed review passes.");
  requireIdentifiers(
    report.reviewed.map((id) => ({ id })),
    report.reviewedUnits,
    "Review record",
  );
  const byId = new Map(report.reviewedUnits.map((unit) => [unit.id, unit]));
  const deterministic = uniqueFindings([
    ...report.reviewedUnits.flatMap((unit) =>
      validateTranslationUnit(unit, unit.target, report.targetLocale),
    ),
    ...(report.deterministicFindings ??
      report.findings.filter(legacyDeterministic)),
    ...report.findings.filter((finding) => !byId.has(finding.id)),
  ]);
  const locked = new Set(deterministic.map(findingKey));
  const disputed = report.findings
    .filter((finding) => !locked.has(findingKey(finding)))
    .map((finding, index) => ({ id: `finding-${index}`, finding }));
  const response = disputed.length
    ? adjudicationSchema.parse(
        await generate({
          phase: "adjudicate",
          system: `${reviewInstructions(report.targetLocale)}
You are the final finding adjudicator, in a fresh request. Do not translate or rewrite any target. Decide whether each supplied editorial finding identifies a material defect in this exact source/target and its connected context. Material includes changed meaning, actor, modality, scope, number, named concept, actual grammar, unnatural calques, required locale conventions or functional structure. Mere personal preference, normal inflection (catalogue/catalogues), equivalent contextually explicit wording, permitted CJK spacing, or an excerpt attached to the wrong unit are not defects. Neighboring split resource strings may relocate a noun across the boundary if the complete rendered phrase is faithful; inspect supplied neighbors before calling it an addition. Do not invent constraints or claim human/native review. When evidence is insufficient choose uncertain. A real defect stays material even if correction is hard. Never dismiss deterministic invariants; those are not yours to adjudicate.
For every finding return its ID, classification (material, not-material, uncertain), exact nonempty sourceQuote and targetQuote copied from that finding's unit, and a concrete rationale tying the evidence to the finding. If the cited erroneous words are absent, quote the actual relevant text and explain the mismatch. For omissions quote the closest enclosing target phrase. Quotes must occur byte-for-byte in the actual unit. Invalid evidence cannot clear a finding.`,
          prompt: JSON.stringify({
            sourceLocale: "en-US",
            targetLocale: report.targetLocale,
            documentContext,
            units: connectedContext(
              report.reviewedUnits,
              new Set(disputed.map(({ finding }) => finding.id)),
            ),
            findings: disputed,
          }),
          schemaName: "ecentic_translation_adjudication",
          schema: adjudicationSchema,
        }),
      )
    : { decisions: [] };
  requireIdentifiers(disputed, response.decisions, "Adjudication");
  const decisions = response.decisions.map(
    (decision): TranslationAdjudicationDecision => {
      const finding = disputed.find(
        (entry) => entry.id === decision.id,
      )?.finding;
      if (!finding) throw new Error("Unexpected adjudication ID");
      const unit = byId.get(finding.id);
      const evidenceValid = Boolean(
        unit?.text.includes(decision.sourceQuote) &&
          unit.target.includes(decision.targetQuote),
      );
      return {
        ...decision,
        classification: evidenceValid ? decision.classification : "uncertain",
        finding,
        evidenceValid,
      };
    },
  );
  return {
    ...report,
    stage: "adjudicated",
    documentContext,
    deterministicFindings: deterministic,
    findings: uniqueFindings([
      ...deterministic,
      ...decisions
        .filter((decision) => decision.classification !== "not-material")
        .map((decision) => decision.finding),
    ]),
    adjudication: {
      version: translationAdjudicationVersion,
      originalFindings: report.findings,
      decisions,
    },
  };
};

export const translateTextUnits = async ({
  units,
  targetLocale,
  documentContext = "",
  generate,
  onReview,
}: {
  units: readonly TranslationUnit[];
  targetLocale: Locale;
  documentContext?: string;
  generate: TranslationGenerator;
  onReview?: (report: TranslationReviewReport) => void | Promise<void>;
}): Promise<readonly { id: string; text: string }[]> => {
  if (new Set(units.map((unit) => unit.id)).size !== units.length)
    throw new TranslationValidationError([
      {
        id: "batch",
        pass: "structural",
        message: "Source contains duplicate unit IDs.",
      },
    ]);
  if (targetLocale === "en") return units.map(({ id, text }) => ({ id, text }));
  const translating = units.filter(
    (unit) => !unit.invariant && unit.text.trim(),
  );
  if (translating.length === 0)
    return units.map(({ id, text }) => ({ id, text }));
  const context = {
    sourceLocale: "en-US",
    targetLocale,
    documentContext,
    units: translating,
  };
  const draft = artifactSchema.parse(
    await generate({
      phase: "draft",
      system: translationInstructions(targetLocale),
      prompt: `Translate all requested units. Their IDs and contexts describe connected web/product content; translate each complete text in that context. Return one {id,text} row for each unit.\n${JSON.stringify(context)}`,
      schemaName: "ecentic_translation_units",
      schema: artifactSchema,
    }),
  );
  requireIdentifiers(translating, draft.units, "Draft");

  const review = async (
    targets: readonly { id: string; text: string }[],
    stage: TranslationReviewReport["stage"],
    reviewing: readonly TranslationUnit[] = translating,
    previous?: TranslationReviewReport,
  ) => {
    const targetById = new Map(targets.map((unit) => [unit.id, unit.text]));
    const requested = new Set(reviewing.map((unit) => unit.id));
    const neighbors = previous
      ? translating.filter(
          (unit, index) =>
            !requested.has(unit.id) &&
            (requested.has(translating[index - 1]?.id ?? "") ||
              requested.has(translating[index + 1]?.id ?? "") ||
              (unit.group &&
                reviewing.some((other) => other.group === unit.group))),
        )
      : [];
    const mechanical = translating.flatMap((unit) =>
      validateTranslationUnit(
        unit,
        targetById.get(unit.id) ?? "",
        targetLocale,
      ),
    );
    const editorial = reviewSchema.parse(
      await generate({
        phase: "review",
        system: reviewInstructions(targetLocale),
        prompt: `Review every requested source/target unit through all six passes. Do not rewrite or omit units. Return checkedPasses once at artifact level, listing all six passes in order. reviewedIds must contain every ID in units exactly once, including clean units. Previously reviewed unchanged neighbors are supplied only for connected meaning; do not include their IDs in reviewedIds or issues. Report actual defects only in issues with their exact requested unit id, pass and message. Document context: ${documentContext}\n${JSON.stringify({ sourceLocale: "en-US", targetLocale, units: reviewing.map((unit) => ({ ...unit, target: targetById.get(unit.id) })), unchangedNeighbors: neighbors.map((unit) => ({ ...unit, target: targetById.get(unit.id) })) })}`,
        schemaName: "ecentic_translation_review",
        schema: reviewSchema,
      }),
    );
    requireIdentifiers(
      reviewing,
      editorial.reviewedIds.map((id) => ({ id })),
      "Review",
    );
    if (editorial.issues.some((issue) => !requested.has(issue.id)))
      throw new TranslationValidationError([
        {
          id: "batch",
          pass: "structural",
          message: "Review attached an issue to an unexpected unit ID.",
        },
      ]);
    const omitted =
      JSON.stringify(editorial.checkedPasses) ===
      JSON.stringify(translationReviewPasses)
        ? []
        : reviewing.map(
            (unit): TranslationFinding => ({
              id: unit.id,
              pass: "structural",
              message:
                "Reviewer did not complete all six required passes in order.",
            }),
          );
    const reused =
      previous?.reviewedUnits.filter((unit) => !requested.has(unit.id)) ?? [];
    if (previous) {
      requireIdentifiers(
        translating,
        [...reviewing, ...reused],
        "Merged review coverage",
      );
      if (reused.some((unit) => unit.target !== targetById.get(unit.id)))
        throw new Error(
          "A changed target cannot reuse a previous editorial review.",
        );
    }
    const findings = uniqueFindings([
      ...mechanical,
      ...omitted,
      ...editorial.issues,
      ...(previous?.findings.filter((finding) => !requested.has(finding.id)) ??
        []),
    ]);
    const report: TranslationReviewReport = {
      policyVersion: translationPolicyVersion,
      targetLocale,
      stage,
      documentContext,
      deterministicFindings: [...mechanical, ...omitted],
      ...(previous
        ? {
            reviewCoverage: {
              freshIds: reviewing.map((unit) => unit.id),
              reusedIds: reused.map((unit) => unit.id),
              reusedFrom: "draft" as const,
            },
          }
        : {}),
      reviewed: translating.map((unit) => unit.id),
      passes: translationReviewPasses,
      findings,
      reviewedUnits: translating.map((unit) => ({
        ...unit,
        target: targetById.get(unit.id) ?? "",
      })),
      humanReview: "not_requested",
      runtimeReview: "not_performed",
    };
    await onReview?.(report);
    return report;
  };

  const firstReview = await review(draft.units, "draft");
  const { findings } = firstReview;
  const approved = await (async () => {
    if (findings.length === 0) return draft.units;
    const affected = new Set(findings.map((finding) => finding.id));
    const correcting = translating.filter((unit) => affected.has(unit.id));
    const correctionContext = connectedContext(translating, affected);
    const contextualIds = new Set(correctionContext.map((unit) => unit.id));
    const correction = artifactSchema.parse(
      await generate({
        phase: "correct",
        system: translationInstructions(targetLocale),
        prompt: `Correct only the affected units listed in requestedIds. This is the single correction attempt. Preserve unaffected neighboring meaning and resolve every finding without adding claims or changing syntax. Complete connected inline groups and their adjacent groups are included as context. Return one {id,text} row for each requested ID only.\n${JSON.stringify({ ...context, units: correctionContext, currentTargets: draft.units.filter((unit) => contextualIds.has(unit.id)), requestedIds: correcting.map((unit) => unit.id), findings })}`,
        schemaName: "ecentic_translation_correction",
        schema: artifactSchema,
      }),
    );
    requireIdentifiers(correcting, correction.units, "Correction");
    const corrections = new Map(
      correction.units.map((unit) => [unit.id, unit]),
    );
    const revised = draft.units.map((unit) => corrections.get(unit.id) ?? unit);
    const finalReview = await review(
      revised,
      "corrected",
      correcting,
      firstReview,
    );
    const adjudicated = finalReview.findings.length
      ? await adjudicateTranslationReport({
          report: finalReview,
          generate,
          documentContext,
        })
      : finalReview;
    if (adjudicated !== finalReview) await onReview?.(adjudicated);
    const unresolved = adjudicated.findings;
    if (unresolved.length) {
      const blocked = new Set(unresolved.map((finding) => finding.id));
      throw new TranslationValidationError(
        unresolved,
        revised.filter((unit) => !blocked.has(unit.id)),
        revised.filter((unit) => blocked.has(unit.id)),
      );
    }
    return revised;
  })();
  const translated = new Map(approved.map((unit) => [unit.id, unit.text]));
  return units.map((unit) => ({
    id: unit.id,
    text: translated.get(unit.id) ?? unit.text,
  }));
};
