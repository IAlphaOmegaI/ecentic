import { createHash } from "node:crypto";
import { z } from "zod";

const stateSchema = z.object({
  id: z.string().min(1),
  criterion: z.string().min(1),
  locale: z.enum(["en", "es"]),
  width: z.number().int().positive(),
});

export const manifestSchema = z.object({
  schemaVersion: z.literal(1),
  checks: z
    .array(
      z.object({
        id: z.string().min(1),
        route: z.string().startsWith("/"),
        sources: z.array(z.string().min(1)).min(1),
        evidenceIds: z.array(z.string().min(1)).min(1),
        states: z.array(stateSchema).min(1),
      }),
    )
    .min(1),
});

export const receiptsSchema = z.object({
  schemaVersion: z.literal(1),
  reviews: z.array(
    z.object({
      check: z.string(),
      state: z.string(),
      sourceDigest: z.string(),
      verdict: z.enum(["passed", "failed", "notChecked"]),
      reviewer: z.string(),
      reviewedAt: z.string(),
      observation: z.string(),
      evidence: z.array(z.string()),
    }),
  ),
});

export type Manifest = z.infer<typeof manifestSchema>;
export type Receipts = z.infer<typeof receiptsSchema>;

export const sourceDigest = (sources: Record<string, string | Uint8Array>) =>
  createHash("sha256")
    .update(
      JSON.stringify(
        Object.entries(sources)
          .sort(([first], [second]) => first.localeCompare(second))
          .map(([path, contents]) => [
            path,
            createHash("sha256").update(contents).digest("hex"),
          ]),
      ),
    )
    .digest("hex");

export const reviewDigest = (
  check: Manifest["checks"][number],
  sources: Record<string, string | Uint8Array>,
) =>
  createHash("sha256")
    .update(
      JSON.stringify({ target: check, sourceDigest: sourceDigest(sources) }),
    )
    .digest("hex");

export const evaluateReviews = (
  manifest: Manifest,
  receipts: Receipts,
  digests: Record<string, string>,
  availableEvidence: ReadonlySet<string>,
) => {
  const entries = manifest.checks.flatMap((check) =>
    check.states.map((state) => {
      const matches = receipts.reviews.filter(
        (review) => review.check === check.id && review.state === state.id,
      );
      const receipt = matches[0];
      const reason = (() => {
        if (matches.length > 1)
          return "Duplicate review receipts require resolution.";
        if (!receipt || receipt.verdict === "notChecked")
          return "This visual state has not been reviewed.";
        if (receipt.sourceDigest !== digests[check.id])
          return "Source or review target changed after the recorded review.";
        if (!receipt.reviewer.trim() || !receipt.observation.trim())
          return "A named reviewer and an observation are required.";
        if (!Number.isFinite(Date.parse(receipt.reviewedAt)))
          return "A valid review timestamp is required.";
        if (
          !receipt.evidence.length ||
          receipt.evidence.some((path) => !availableEvidence.has(path))
        )
          return "The review must reference existing evidence files.";
        return null;
      })();
      return {
        check: check.id,
        state: state.id,
        route: check.route,
        locale: state.locale,
        width: state.width,
        criterion: state.criterion,
        sourceDigest: digests[check.id],
        status: reason ? "notChecked" : receipt?.verdict,
        reason,
        observation: receipt?.observation ?? null,
        evidence: receipt?.evidence ?? [],
      };
    }),
  );
  const unknown = receipts.reviews.filter(
    (receipt) =>
      !manifest.checks.some(
        (check) =>
          check.id === receipt.check &&
          check.states.some((state) => state.id === receipt.state),
      ),
  );
  return {
    schemaVersion: 1,
    rule: "C5",
    entries,
    errors: unknown.map(
      (receipt) => `Unknown review target: ${receipt.check}/${receipt.state}`,
    ),
    summary: {
      passed: entries.filter((entry) => entry.status === "passed").length,
      failed: entries.filter((entry) => entry.status === "failed").length,
      notChecked: entries.filter((entry) => entry.status === "notChecked")
        .length,
    },
  };
};
