import { mock } from "bun:test";
import { readFile } from "node:fs/promises";
import {
  playbookSchema,
  prospectSchema,
  settingsForProspect,
} from "../../src/lib/outbound";
import { rebuildWritingProposal } from "../../src/lib/outbound-rebuild-policy";
import {
  evaluateFrozenCase,
  fingerprint,
  inspectFrozenCorpus,
  loadFrozenCorpus,
} from "../../src/server/spec/helpers/outbound-rebuild";
import { ValidationError } from "../../src/server/utils/error";

mock.module("server-only", () => ({}));
// Provider modules load the database client lazily; this harness never queries it.
Object.assign(process.env, {
  DATABASE_URL: "postgres://127.0.0.1:55432/outbound_smoke_000000000000",
});
const Assessment = await import(
  "../../src/server/utils/outbound/shopping-assessment"
);
const Draft = await import("../../src/server/utils/outbound/draft");
const { aiCaptureSchema, browserResearchSchema } = await import(
  "../../src/server/utils/outbound/live-shopping-contract"
);
const [path, checksum] = process.argv.slice(2);
if (!path || !checksum)
  throw new Error(
    "Usage: bun rebuild-corpus.ts <frozen-corpus.private.json> <frozen-corpus.sha256>",
  );
const digest = (await readFile(checksum, "utf8")).trim().split(/\s+/)[0];
if (!digest) throw new Error("Frozen corpus checksum is missing.");
const corpus = await loadFrozenCorpus(path, digest);
const inspection = inspectFrozenCorpus(corpus);
const originalFingerprint = fingerprint(corpus);
const policy = rebuildWritingProposal(
  playbookSchema.parse(corpus.policy["settings"]),
);
const at = Date.parse(corpus.exportedAt);
const counters = { assessmentModel: 0, writerModel: 0, judgeModel: 0 };
const detailsFor = (id: string) => {
  const row = corpus.prospects.find((prospect) => prospect.id === id);
  if (!row) throw new Error("Frozen prospect is unavailable.");
  return prospectSchema.parse({ ...(row["details"] as object), id });
};
const disallowGeneration = async () => {
  throw new Error(
    "A historical exact-name or ambiguous capture cannot authorize new copy.",
  );
};
const results = [];
for (const entry of inspection.cases) {
  const prospect = detailsFor(entry.prospect);
  const current = settingsForProspect(
    { id: entry.prospect, details: prospect },
    policy,
  );
  const result = await evaluateFrozenCase(entry, corpus.exportedAt, {
    assess: async () => {
      if (!entry.capture)
        return {
          status: "held" as const,
          reason:
            "The original provider capture is unavailable; no price mismatch can be established.",
        };
      const answer = aiCaptureSchema.parse(entry.capture.output.answer);
      const browser = browserResearchSchema.parse(entry.capture.output.browser);
      if (browser.status !== "captured")
        return {
          status: "held" as const,
          reason: "The original rendered product capture is incomplete.",
        };
      const assessed = await Assessment.assess(
        { answer, browser, playbook: current, deadline: at + 45_000 },
        {
          now: () => at,
          generate: async () => {
            counters.assessmentModel += 1;
            return {
              decision: "hold",
              reason:
                "The frozen exact-name answer establishes no discovery gap or unambiguous same-terms mismatch.",
              listed: [],
              description: null,
              productAttributes: [],
              priceComparison: null,
              correctness: null,
              pageDataIssue: null,
            };
          },
        },
      );
      if (!assessed.success) throw assessed.error;
      return assessed.data.status === "held"
        ? { status: "held" as const, reason: assessed.data.reason }
        : { status: "ready" as const, value: assessed.data.receipt };
    },
    write: async (_entry, receipt) => {
      const composed = await Draft.composeSequence(prospect, receipt, current, {
        now: () => at,
        generate: async () => {
          counters.writerModel += 1;
          return disallowGeneration();
        },
        judge: async () => {
          counters.judgeModel += 1;
          return disallowGeneration();
        },
      });
      if (composed.success)
        throw new Error("Frozen history unexpectedly produced a new sequence.");
      if (composed.error.name !== ValidationError.errorName)
        throw composed.error;
      return { status: "held" as const, reason: composed.error.message };
    },
    gate: async () => {
      throw new Error("A held historical capture cannot reach copy approval.");
    },
  });
  // Independently exercise the writer's guard on each original historical receipt.
  const historicalCopy = await Draft.composeSequence(
    prospect,
    entry.receipt,
    current,
    {
      now: () => at,
      generate: async () => {
        counters.writerModel += 1;
        return disallowGeneration();
      },
      judge: async () => {
        counters.judgeModel += 1;
        return disallowGeneration();
      },
    },
  );
  if (
    historicalCopy.success ||
    historicalCopy.error.name !== ValidationError.errorName ||
    result.pass
  )
    throw new Error(
      "A frozen historical capture bypassed the discovery/writing hold.",
    );
  results.push({
    ...result,
    group: entry.group,
    product: entry.receipt.product.name,
    originalKind: entry.receipt.selected.kind,
    historicalCopyHold: historicalCopy.error.message,
    originalDates: entry.receipt.sources.map(({ id, checkedAt }) => ({
      id,
      checkedAt,
    })),
  });
}
if (fingerprint(corpus) !== originalFingerprint)
  throw new Error("Offline evaluation modified the frozen corpus.");
if (counters.writerModel || counters.judgeModel)
  throw new Error("A research hold reached a writing or judging provider.");
console.log(
  JSON.stringify(
    {
      sourceCommit: corpus.sourceCommit,
      exportedAt: corpus.exportedAt,
      originalSelectionAt: corpus.originalSelectionAt,
      rawArtifacts: inspection.rawArtifacts,
      uniqueRawArtifacts: inspection.uniqueRawArtifacts,
      providerBoundCases: inspection.providerBoundCases,
      sourceTextOnlyCases: inspection.sourceTextOnlyCases,
      historicalCases: results.length,
      held: results.filter((result) => !result.pass).length,
      results,
      adapterCalls: counters,
      liveProviderCalls: 0,
      corpusUnchanged: true,
      limitation:
        "These frozen captures contain no proven unbranded absence, outranking or same-terms price mismatch. New-category cases use clearly synthetic offline provider fixtures; actual held-cohort research is a separate authorized run.",
    },
    null,
    2,
  ),
);
