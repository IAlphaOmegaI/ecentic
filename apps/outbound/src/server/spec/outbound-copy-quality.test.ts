import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { assembleSequence, COPY_CRITERIA } from "@/lib/outbound-composition";
import {
  copyPhrasePresent,
  copyVerdictProblem,
  deterministicCopyIssues,
  hasCompleteCopyVerdict,
} from "@/lib/outbound-copy-quality";
import { writerFixture } from "./helpers/outbound-writer-fixture";

const context = () => {
  const fixture = writerFixture();
  const assembled = assembleSequence(
    fixture.prospect,
    fixture.receipt,
    fixture.policy,
    fixture.parts,
  );
  if (assembled.status !== "ready") throw new Error(assembled.reason);
  return { ...fixture, playbook: fixture.policy, messages: assembled.messages };
};
const passing = () => ({
  passed: true,
  evaluatedAt: new Date().toISOString(),
  deterministicIssues: [],
  criteria: COPY_CRITERIA.map((criterion) => ({
    criterion,
    passed: true,
    reason: "The supplied copy meets this check.",
  })),
});

describe("deterministic copy quality", () => {
  test("accepts the exact sourced sequence and rejects edited controls or delivery order", () => {
    const input = context();
    expect(deterministicCopyIssues(input)).toEqual([]);
    const edited = structuredClone(input);
    const first = edited.messages[0];
    if (!first) throw new Error("First message missing.");
    first.body = first.body.replace(
      "Worth a quick chat?",
      "Can I send a report?",
    );
    expect(
      deterministicCopyIssues(edited).some((issue) =>
        issue.includes("exact messages"),
      ),
    ).toBe(true);
    const changedOrder = structuredClone(input);
    changedOrder.messages.reverse();
    expect(deterministicCopyIssues(changedOrder).length).toBeGreaterThan(0);
  });

  test("configured and rendered follow-ups must remain the exact bumps", () => {
    for (const body of [
      "Visit https://samplegoods.test.",
      "Your tote is large and washable.",
      "Bumping this! Worth a quick chat?",
      "Alder took the sale.",
    ]) {
      const input = context();
      expect(
        assembleSequence(
          input.prospect,
          input.receipt,
          { ...input.playbook, followupTwoTemplate: body },
          input.parts,
        ).status,
      ).toBe("held");
      input.messages[2]!.body = body;
      expect(
        deterministicCopyIssues(input).some((issue) => issue.includes("exact")),
      ).toBe(true);
    }
  });

  test("banned phrases use whole words and leave the exact opt-out alone", () => {
    expect(copyPhrasePresent("George supplies barcodes.", "GEO")).toBe(false);
    expect(copyPhrasePresent("George supplies barcodes.", "code")).toBe(false);
    expect(copyPhrasePresent("A GEO audit", "geo")).toBe(true);
    expect(copyPhrasePresent("The code matches", "code")).toBe(true);
    expect(
      copyPhrasePresent("Reply no and I won't follow up.", "following up"),
    ).toBe(false);
    expect(
      copyPhrasePresent("We’re just checking in.", "just checking in"),
    ).toBe(true);
  });
});

describe("complete copy verdicts", () => {
  test("requires six distinct complete decisions and an honest aggregate", () => {
    const verdict = passing();
    expect(hasCompleteCopyVerdict(verdict)).toBe(true);
    expect(copyVerdictProblem(verdict)).toBeNull();
    expect(
      hasCompleteCopyVerdict({
        ...verdict,
        criteria: verdict.criteria.slice(1),
      }),
    ).toBe(false);
    expect(
      hasCompleteCopyVerdict({
        ...verdict,
        criteria: verdict.criteria.map(() => verdict.criteria[0]),
      }),
    ).toBe(false);
    expect(hasCompleteCopyVerdict({ ...verdict, passed: false })).toBe(false);
    expect(
      hasCompleteCopyVerdict({
        ...verdict,
        deterministicIssues: ["A fabricated fact."],
      }),
    ).toBe(false);
    const failure = structuredClone(verdict);
    failure.passed = false;
    const relevance = failure.criteria[2];
    if (!relevance) throw new Error("Relevance criterion missing.");
    relevance.passed = false;
    relevance.reason = "The relevance repeats a product feature.";
    expect(hasCompleteCopyVerdict(failure)).toBe(true);
    expect(copyVerdictProblem(failure)).toBe(
      "reasonToCare: The relevance repeats a product feature.",
    );
    const multiline = structuredClone(verdict);
    const opening = multiline.criteria[0];
    if (!opening) throw new Error("Opening criterion missing.");
    opening.reason = "First line.\nSecond line.";
    expect(hasCompleteCopyVerdict(multiline)).toBe(false);
    const malformed = structuredClone(verdict);
    const invalid = malformed.criteria[0];
    if (!invalid) throw new Error("Opening criterion missing.");
    invalid.reason = " ";
    expect(hasCompleteCopyVerdict(malformed)).toBe(false);
  });
});

test("the isolated judge obeys strict outputs and never retries or overrides deterministic failures", async () => {
  const child = Bun.spawn(
    [
      process.execPath,
      "--no-env-file",
      resolve(import.meta.dir, "fixtures/outbound-copy-quality.fixture.ts"),
    ],
    { env: { ...process.env }, stdout: "pipe", stderr: "pipe" },
  );
  const [status, output, error] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  expect(error).toBe("");
  expect(status).toBe(0);
  expect(output).toContain("Copy judge offline contracts passed.");
}, 15000);
