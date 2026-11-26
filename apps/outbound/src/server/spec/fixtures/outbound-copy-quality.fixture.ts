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
console.log("Copy judge offline contracts passed.");
