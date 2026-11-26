import { mock, spyOn } from "bun:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  canonicalSequenceInput,
  type WriterParts,
} from "@/lib/outbound-composition";
import {
  passingCopyJudge,
  writerFixture,
} from "../helpers/outbound-writer-fixture";

mock.module("server-only", () => ({}));
const { composeSequence } = await import("@/server/utils/outbound/draft");
const Capture = await import("@/server/utils/outbound/live-shopping");
const networkCalls: string[] = [];
spyOn(globalThis, "fetch").mockImplementation(
  Object.assign(
    async (input: Parameters<typeof fetch>[0]) => {
      networkCalls.push(String(input));
      throw new Error(
        "Unexpected network request in synthetic writer fixture.",
      );
    },
    {
      preconnect: (input: Parameters<typeof fetch.preconnect>[0]) => {
        networkCalls.push(String(input));
        throw new Error("Unexpected preconnect in synthetic writer fixture.");
      },
    },
  ),
);
const searches = spyOn(Capture, "startQuery").mockImplementation(async () => {
  throw new Error("Writing must never buy another search.");
});
const fixture = writerFixture();
const before = structuredClone({
  receipt: fixture.receipt,
  prospect: fixture.prospect,
});
const requests: { prompt: string; deadline: number }[] = [];
const valid = await composeSequence(
  fixture.prospect,
  fixture.receipt,
  fixture.policy,
  {
    judge: passingCopyJudge,
    generate: async (request) => {
      requests.push(request);
      return fixture.parts;
    },
  },
);
assert.ok(valid.success, valid.success ? undefined : valid.error.message);
assert.equal(valid.data.generation.attempts, 1);
assert.equal(requests.length, 1);
assert.deepEqual(valid.data.issues, []);
assert.equal(valid.data.messages[0]?.writing?.narrative.relationship, "sister");
assert.equal(valid.data.messages[0]?.writing?.quality?.passed, true);
assert.equal(valid.data.messages[0]?.writing?.quality?.criteria.length, 6);
assert.equal(valid.data.messages[0]?.writing?.revision, null);
const canonical = canonicalSequenceInput(valid.data.messages);
assert.equal(canonical.status, "ready");
if (canonical.status === "ready") {
  assert.equal(
    valid.data.messages[0]?.writing?.contentHash,
    createHash("sha256").update(canonical.canonicalText).digest("hex"),
  );
  assert.deepEqual(
    canonicalSequenceInput(
      valid.data.messages.map((message) =>
        message.writing
          ? { ...message, writing: { ...message.writing, revision: 42 } }
          : message,
      ),
    ),
    canonical,
  );
}
assert.deepEqual(
  { receipt: fixture.receipt, prospect: fixture.prospect },
  before,
);
assert.equal(fixture.prospect.personalLine, "");
assert.ok(fixture.receipt.claims?.every((claim) => claim.type === "observed"));
assert.ok(!JSON.stringify(fixture.receipt).includes("sister"));

const judgeFailures: string[] = [];
const copyHeld = await composeSequence(
  fixture.prospect,
  fixture.receipt,
  fixture.policy,
  {
    generate: async () => fixture.parts,
    judge: async () => {
      judgeFailures.push("judged");
      return {
        ...(await passingCopyJudge()),
        naturalVoice: { passed: false, reason: "The transition sounds stiff." },
      };
    },
  },
);
assert.ok(
  copyHeld.success,
  copyHeld.success ? undefined : copyHeld.error.message,
);
assert.equal(copyHeld.data.messages.length, 3);
assert.equal(copyHeld.data.messages[0]?.writing?.quality?.passed, false);
assert.match(copyHeld.data.issues[0]?.field ?? "", /^Copy:/);
assert.match(copyHeld.data.issues[0]?.field ?? "", /stiff/);
assert.equal(
  judgeFailures.length,
  1,
  "A failed copy decision is retained, not retried into a pass.",
);

const interruptedJudgeCalls: number[] = [];
const judgeInterrupted = await composeSequence(
  fixture.prospect,
  fixture.receipt,
  fixture.policy,
  {
    generate: async () => fixture.parts,
    judge: async () => {
      interruptedJudgeCalls.push(1);
      throw new Error("Synthetic judge interruption");
    },
  },
);
assert.equal(judgeInterrupted.success, false);
assert.equal(interruptedJudgeCalls.length, 1);
if (!judgeInterrupted.success)
  assert.equal((judgeInterrupted.error as { code?: string }).code, "uncertain");

const repairRequests: string[] = [];
const repaired = await composeSequence(
  fixture.prospect,
  fixture.receipt,
  fixture.policy,
  {
    judge: passingCopyJudge,
    generate: async ({ prompt }) => {
      repairRequests.push(prompt);
      return repairRequests.length === 1
        ? {
            ...fixture.parts,
            result:
              "It picked Alder at around $99. Sample Goods didn't come up.",
          }
        : fixture.parts;
    },
  },
);
assert.ok(
  repaired.success,
  repaired.success ? undefined : repaired.error.message,
);
assert.equal(repaired.data.generation.attempts, 2);
assert.equal(repairRequests.length, 2);
assert.ok(repairRequests[1]?.includes("$99"));
assert.ok(repairRequests[1]?.includes("price"));

const rejectedRequests: number[] = [];
const rejected = await composeSequence(
  fixture.prospect,
  fixture.receipt,
  fixture.policy,
  {
    generate: async () => {
      rejectedRequests.push(1);
      return {
        ...fixture.parts,
        result: "It picked Cedar and Birch. Sample Goods didn't come up.",
      };
    },
  },
);
assert.equal(rejected.success, false);
assert.equal(rejectedRequests.length, 2);
if (!rejected.success) assert.match(rejected.error.message, /^Copy:/);

const extraFieldAttempts: number[] = [];
const extraField = await composeSequence(
  fixture.prospect,
  fixture.receipt,
  fixture.policy,
  {
    generate: async () => {
      extraFieldAttempts.push(1);
      return {
        ...fixture.parts,
        personalLine: "My sister asked for a tote.",
      } as WriterParts;
    },
  },
);
assert.equal(extraField.success, false);
assert.equal(extraFieldAttempts.length, 2);

const preflightAttempts: number[] = [];
for (const policy of [
  {
    ...fixture.policy,
    bodyTemplate: fixture.policy.bodyTemplate.replace("{relevance}", ""),
  },
  { ...fixture.policy, relevanceLines: [] },
  { ...fixture.policy, maxBodyWords: 40 },
]) {
  const held = await composeSequence(
    fixture.prospect,
    fixture.receipt,
    policy,
    {
      generate: async () => {
        preflightAttempts.push(1);
        return fixture.parts;
      },
    },
  );
  assert.equal(held.success, false);
}
assert.equal(preflightAttempts.length, 0);

const addedSubjectBrand = await composeSequence(
  fixture.prospect,
  fixture.receipt,
  { ...fixture.policy, subjectTemplate: "cedar {queryTopic}" },
  {
    generate: async () => fixture.parts,
  },
);
assert.equal(
  addedSubjectBrand.success,
  false,
  "Template expansion must not add an unsupported brand to the subject.",
);

const interruptions: number[] = [];
const interrupted = await composeSequence(
  fixture.prospect,
  fixture.receipt,
  fixture.policy,
  {
    generate: async () => {
      interruptions.push(1);
      throw new Error("Synthetic connection interruption");
    },
  },
);
assert.equal(interrupted.success, false);
assert.equal(interruptions.length, 1);
if (!interrupted.success)
  assert.equal((interrupted.error as { code?: string }).code, "uncertain");
assert.deepEqual(
  { receipt: fixture.receipt, prospect: fixture.prospect },
  before,
);
assert.equal(searches.mock.calls.length, 0);
assert.deepEqual(networkCalls, []);
console.log(
  "Synthetic composeSequence contracts passed: one repair, holds, immutable research and no search purchases.",
);
