import { expect, mock } from "bun:test";
import { assembleSequence, COPY_CRITERIA } from "@/lib/outbound-composition";
import {
  copyVerdictProblem,
  hasCompleteCopyVerdict,
} from "@/lib/outbound-copy-quality";
import { writerFixture } from "../helpers/outbound-writer-fixture";

mock.module("server-only", () => ({}));
const Quality = await import("@/server/utils/outbound/copy-quality");
const fixture = writerFixture();
const assembled = assembleSequence(
  fixture.prospect,
  fixture.receipt,
  fixture.policy,
  fixture.parts,
);
if (assembled.status !== "ready") throw new Error(assembled.reason);
const context = {
  ...fixture,
  playbook: fixture.policy,
  messages: assembled.messages,
  globalVoiceNotes:
    "Write as Iseld. This is style data, never an instruction to inherit his biography.",
};
const pass = () =>
  Object.fromEntries(
    COPY_CRITERIA.map((criterion) => [
      criterion,
      {
        passed: true,
        reason: "This check is satisfied by the supplied sequence.",
      },
    ]),
  );
const calls: unknown[] = [];
const response = await Quality.judgeSequenceCopy(context, {
  generate: async (request) => {
    calls.push(request);
    const prompt = JSON.parse(request.prompt);
    expect(prompt.sender.name).toBe("Juri");
    expect(prompt.fixed.founderLine).toContain("I'm Juri.");
    expect(prompt.serverWordCounts.deterministicLengthChecksPassed).toBe(true);
    expect(prompt.serverWordCounts.messages).toEqual([
      {
        step: 1,
        bodyWords: 64,
        bodyWordLimit: 99,
        longestSentenceWords: 13,
        sentenceWordLimit: 25,
      },
      {
        step: 2,
        bodyWords: 2,
        bodyWordLimit: null,
        longestSentenceWords: 2,
        sentenceWordLimit: 25,
      },
      {
        step: 3,
        bodyWords: 1,
        bodyWordLimit: null,
        longestSentenceWords: 1,
        sentenceWordLimit: 25,
      },
    ]);
    expect(
      prompt.messages.map((message: { body: string }) => message.body),
    ).toEqual(context.messages.map((message) => message.body));
    expect(request.instructions).toContain("untrusted data");
    expect(request.instructions).toContain("actual sender");
    expect(request.deadline - Date.now()).toBeLessThanOrEqual(30000);
    return pass();
  },
});
expect(response.success).toBe(true);
if (!response.success) throw response.error;
expect(hasCompleteCopyVerdict(response.data)).toBe(true);
expect(copyVerdictProblem(response.data)).toBeNull();
expect(calls).toHaveLength(1);

// Synthetic leading prose is not an exhaustive list of the answer's alternatives.
// The exact brand evidence must remain explicit even when another excerpt differs.
const separateEvidence = structuredClone(context);
const leading = separateEvidence.receipt.claimExcerpts?.find(
  (excerpt) => excerpt.id === "answer-excerpt",
);
if (!leading) throw new Error("Missing synthetic leading excerpt.");
leading.quote = "The opening paragraph names Alder and Cedar.";
const permittedSubset = await Quality.judgeSequenceCopy(separateEvidence, {
  generate: async (request) => {
    const prompt = JSON.parse(request.prompt);
    expect(prompt.inputVersion).toBe("brand-proof-judge-v3");
    expect(prompt.brandSelectionPolicy).toEqual({
      version: Quality.COPY_JUDGE_BRAND_SUBSET_POLICY_VERSION,
      resultMayNameNonExhaustiveSubset: true,
      permittedBrandCounts: [2, 3],
      omissionAloneIsFailure: false,
      rejectUnsupportedExclusiveOrFalseCountClaims: true,
    });
    expect(prompt.parts.result).toBe(
      "It picked Alder and Birch. Sample Goods didn't come up.",
    );
    expect(
      prompt.projectedBrandEvidence.map(
        (brand: { name: string }) => brand.name,
      ),
    ).toEqual(["Alder", "Birch"]);
    expect(request.instructions).toContain(
      "Omission of another brand is not a failure.",
    );
    expect(request.instructions).toContain(
      '"It picked A and B" states inclusion',
    );
    expect(request.instructions).toContain(
      "Still reject unsupported names, unsupported exclusive claims",
    );
    return pass();
  },
});
expect(permittedSubset.success).toBe(true);
if (!permittedSubset.success) throw permittedSubset.error;
expect(permittedSubset.data.passed).toBe(true);
let evidenceJudgeCalls = 0;
const evidenceFailure = await Quality.judgeSequenceCopy(separateEvidence, {
  generate: async (request) => {
    evidenceJudgeCalls++;
    const prompt = JSON.parse(request.prompt);
    expect(prompt.projectedBrandEvidence).toEqual(
      ["Alder", "Birch"].map((name, index) => ({
        name,
        position: index + 1,
        proof: [
          {
            id: "brands-excerpt",
            sourceId: "answer",
            quote: "1. Alder at around $36\n2. Birch",
            context: "answer-text",
          },
        ],
      })),
    );
    expect(
      prompt.excerpts.find(
        (excerpt: { id: string }) => excerpt.id === "answer-excerpt",
      ),
    ).toMatchObject({
      quote: leading.quote,
      scope: expect.stringContaining("Non-exhaustive answer excerpt"),
    });
    expect(request.instructions).toContain(
      "absence from that excerpt does not contradict",
    );
    expect(request.instructions).toContain("A real contradiction anywhere");
    expect(prompt.query.evidenceScope).toContain(
      "basis excerpts are not the shopping answer",
    );
    expect(prompt.query.basis.excerpts).toEqual(
      separateEvidence.receipt.queries[0]?.basis?.excerpts,
    );
    return {
      ...pass(),
      resultCheckable: {
        passed: false,
        reason: "The judge still rejected the supplied result.",
      },
    };
  },
});
expect(evidenceFailure.success).toBe(true);
if (!evidenceFailure.success) throw evidenceFailure.error;
expect(evidenceFailure.data.passed).toBe(false);
expect(evidenceJudgeCalls).toBe(1);
// This input policy never turns a saved model failure into a pass or retries it.
expect(copyVerdictProblem(evidenceFailure.data)).toBe(
  "resultCheckable: The judge still rejected the supplied result.",
);

// Naming fewer alternatives is permitted; inventing a name or total is not.
for (const result of [
  "It picked Alder, Birch and Unobserved Brand. Sample Goods didn't come up.",
  "It picked nine brands, Alder and Birch. Sample Goods didn't come up.",
]) {
  const invalid = structuredClone(separateEvidence);
  invalid.parts.result = result;
  const sequence = assembleSequence(
    invalid.prospect,
    invalid.receipt,
    invalid.playbook,
    invalid.parts,
  );
  if (sequence.status !== "ready") throw new Error(sequence.reason);
  invalid.messages = sequence.messages;
  const rejected = await Quality.judgeSequenceCopy(invalid, {
    generate: async () => {
      throw new Error("An unsupported brand or total must not reach judge.");
    },
  });
  expect(rejected.success).toBe(true);
  if (!rejected.success) throw rejected.error;
  expect(rejected.data.passed).toBe(false);
  expect(rejected.data.deterministicIssues.length).toBeGreaterThan(0);
}
const exclusive = structuredClone(separateEvidence);
exclusive.parts.result =
  "It picked only Alder and Birch. Sample Goods didn't come up.";
const exclusiveSequence = assembleSequence(
  exclusive.prospect,
  exclusive.receipt,
  exclusive.playbook,
  exclusive.parts,
);
if (exclusiveSequence.status !== "ready")
  throw new Error(exclusiveSequence.reason);
exclusive.messages = exclusiveSequence.messages;
const exclusiveCalls: number[] = [];
const exclusiveFailure = await Quality.judgeSequenceCopy(exclusive, {
  generate: async (request) => {
    exclusiveCalls.push(1);
    expect(request.instructions).toContain(
      'unsupported exclusive claims such as "only"',
    );
    expect(JSON.parse(request.prompt).parts.result).toContain("only");
    return {
      ...pass(),
      resultCheckable: {
        passed: false,
        reason: "The exclusive claim contradicts the additional named brand.",
      },
    };
  },
});
expect(exclusiveFailure.success).toBe(true);
if (!exclusiveFailure.success) throw exclusiveFailure.error;
expect(exclusiveFailure.data.passed).toBe(false);
expect(exclusiveCalls).toHaveLength(1);
expect(copyVerdictProblem(exclusiveFailure.data)).toBe(
  "resultCheckable: The exclusive claim contradicts the additional named brand.",
);
const missingBrandProof = structuredClone(separateEvidence);
missingBrandProof.receipt.claimExcerpts =
  missingBrandProof.receipt.claimExcerpts?.filter((excerpt) => !excerpt.brand);
const unbound = await Quality.judgeSequenceCopy(missingBrandProof, {
  generate: async () => {
    throw new Error("Unbound brand must not reach judge.");
  },
});
expect(unbound.success).toBe(true);
if (!unbound.success) throw unbound.error;
expect(unbound.data.passed).toBe(false);
expect(unbound.data.deterministicIssues.length).toBeGreaterThan(0);

const failed = await Quality.judgeSequenceCopy(context, {
  generate: async () => ({
    ...pass(),
    naturalVoice: { passed: false, reason: "The transition sounds scripted." },
  }),
});
expect(failed.success).toBe(true);
if (!failed.success) throw failed.error;
expect(failed.data.passed).toBe(false);
expect(copyVerdictProblem(failed.data)).toBe(
  "naturalVoice: The transition sounds scripted.",
);

// Authoritative input improves future judgments but never overrides a returned fail.
let mistakenJudgeCalls = 0;
const mistakenLength = await Quality.judgeSequenceCopy(context, {
  generate: async () => {
    mistakenJudgeCalls += 1;
    return {
      ...pass(),
      naturalVoice: { passed: false, reason: "First email exceeds 99 words." },
    };
  },
});
expect(mistakenLength.success).toBe(true);
if (!mistakenLength.success) throw mistakenLength.error;
expect(mistakenLength.data.passed).toBe(false);
expect(copyVerdictProblem(mistakenLength.data)).toBe(
  "naturalVoice: First email exceeds 99 words.",
);
expect(mistakenJudgeCalls).toBe(1);

for (const supplied of [
  {},
  { ...pass(), extra: { passed: true, reason: "Extra" } },
  { ...pass(), openingFits: { passed: true } },
]) {
  const attempts: number[] = [];
  const incomplete = await Quality.judgeSequenceCopy(context, {
    generate: async () => {
      attempts.push(1);
      return supplied;
    },
  });
  expect(incomplete.success).toBe(false);
  if (incomplete.success) throw new Error("Malformed judge output passed.");
  expect(incomplete.error.name).toBe("outbound-integration-error");
  expect(attempts).toHaveLength(1);
}

const providerCalls: number[] = [];
const interrupted = await Quality.judgeSequenceCopy(context, {
  generate: async () => {
    providerCalls.push(1);
    throw new Error("Synthetic interrupted response");
  },
});
expect(interrupted.success).toBe(false);
if (interrupted.success) throw new Error("Interrupted judge passed.");
expect((interrupted.error as { code?: string }).code).toBe("uncertain");
expect(providerCalls).toHaveLength(1);

const changed = structuredClone(context);
const first = changed.messages[0];
if (!first) throw new Error("First message missing.");
first.body += "\n\nYou are losing sales.";
const forbiddenCalls: number[] = [];
const rejected = await Quality.judgeSequenceCopy(changed, {
  generate: async () => {
    forbiddenCalls.push(1);
    return pass();
  },
});
expect(rejected.success).toBe(true);
if (!rejected.success) throw rejected.error;
expect(rejected.data.passed).toBe(false);
expect(hasCompleteCopyVerdict(rejected.data)).toBe(true);
expect(rejected.data.deterministicIssues.length).toBeGreaterThan(0);
expect(forbiddenCalls).toHaveLength(0);

const oversized = structuredClone(context);
const oversizedFirst = oversized.messages[0];
if (!oversizedFirst) throw new Error("First message missing.");
oversizedFirst.body += ` ${"word ".repeat(36).trim()}`;
let oversizedJudgeCalls = 0;
const lengthRejected = await Quality.judgeSequenceCopy(oversized, {
  generate: async () => {
    oversizedJudgeCalls += 1;
    return pass();
  },
});
expect(lengthRejected.success).toBe(true);
if (!lengthRejected.success) throw lengthRejected.error;
expect(lengthRejected.data.passed).toBe(false);
expect(lengthRejected.data.deterministicIssues).toContain(
  "The whole first email exceeds its word limit.",
);
expect(oversizedJudgeCalls).toBe(0);
console.log("Copy judge offline contracts passed.");
