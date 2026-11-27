import { expect, mock, test } from "bun:test";
import assert from "node:assert/strict";
import {
  assembleSequence,
  canonicalSequenceInput,
} from "@/lib/outbound-composition";
import { deterministicCopyIssues } from "@/lib/outbound-copy-quality";
import {
  REVIEWED_COPY_RULES_VERSION,
  ROUND3_COPY_RULES_VERSION,
} from "@/lib/outbound-round3-copy";
import { PRODUCT_LISTING_ABSENCE_VERSION } from "@/lib/outbound-shopping-research";
import {
  compositionPrompt,
  validateWriterParts,
  validateWriterSubject,
} from "@/lib/outbound-writing";
import {
  passingCopyJudge,
  writerFixture,
} from "./helpers/outbound-writer-fixture";

mock.module("server-only", () => ({}));
const Quality = await import("@/server/utils/outbound/copy-quality");
const Policy = await import("@/server/utils/outbound/shopping-policy");
const Draft = await import("@/server/utils/outbound/draft");

/** Copy-only proof labels; raw evidence replay has separate provider-shaped tests. */
const context = () => {
  const fixture = writerFixture();
  const discovery = fixture.receipt.discovery;
  assert.ok(discovery);
  discovery.round3CopyProof = {
    version: "round3-copy-proof-v1",
    sourceId: discovery.sourceId,
    answerHash: discovery.answerHash,
    linksHash: discovery.linksHash,
    fullName: fixture.prospect.company,
    spokenName: fixture.prospect.company,
    domain: fixture.prospect.domain,
    namesAbsent: true,
    citedSources: [],
  };
  discovery.productListings = {
    version: PRODUCT_LISTING_ABSENCE_VERSION,
    sourceId: discovery.sourceId,
    answerHash: discovery.answerHash,
    linksHash: discovery.linksHash,
    entries: [
      {
        format: "markdown-product-link",
        title: "Synthetic Tote",
        url: "https://synthetic.test/products/tote",
        start: 0,
        end: 10,
        rawHash: "1".repeat(64),
      },
    ],
  };
  const parts = {
    ...fixture.parts,
    relevance: "That's the kind of search a new customer starts with.",
  };
  const playbook = { ...fixture.policy, relevanceLines: [parts.relevance] };
  const copyRulesVersion = REVIEWED_COPY_RULES_VERSION;
  const assembled = assembleSequence(
    fixture.prospect,
    fixture.receipt,
    playbook,
    parts,
    { copyRulesVersion },
  );
  if (assembled.status !== "ready") throw new Error(assembled.reason);
  return {
    prospect: fixture.prospect,
    receipt: fixture.receipt,
    playbook,
    parts,
    messages: assembled.messages,
    copyRulesVersion:
      REVIEWED_COPY_RULES_VERSION as typeof REVIEWED_COPY_RULES_VERSION,
  };
};

test("v4 requires literal active I asked while v3 approved wording remains valid", () => {
  const input = context();
  expect(deterministicCopyIssues(input)).toEqual([]);
  for (const opening of [
    input.parts.opening.replace("so I asked", "and asked"),
    input.parts.opening.replace("I asked", "Google was asked"),
  ]) {
    const parts = { ...input.parts, opening };
    expect(validateWriterParts({ ...input, parts })).toContain(
      'opening: say "I asked" in the active voice.',
    );
  }
  const approved = {
    ...input,
    copyRulesVersion:
      ROUND3_COPY_RULES_VERSION as typeof ROUND3_COPY_RULES_VERSION,
    parts: {
      ...input.parts,
      opening: input.parts.opening.replace("so I asked", "and asked"),
    },
  };
  expect(validateWriterParts(approved)).not.toContain(
    'opening: say "I asked" in the active voice.',
  );
  expect(
    Policy.writingPolicyHash(input.playbook, {
      copyRulesVersion: REVIEWED_COPY_RULES_VERSION,
    }),
  ).not.toBe(
    Policy.writingPolicyHash(input.playbook, {
      copyRulesVersion: ROUND3_COPY_RULES_VERSION,
    }),
  );
});

test("an explicit existing-body exception binds the exact body and opening into the checked content", async () => {
  const input = context();
  const parts = {
    ...input.parts,
    opening: input.parts.opening.replace("so I asked", "and asked"),
  };
  const original = assembleSequence(
    input.prospect,
    input.receipt,
    input.playbook,
    parts,
    input,
  );
  assert.equal(original.status, "ready");
  if (original.status !== "ready") throw new Error("Expected assembled copy");
  const approvedBody = original.messages[0]?.body;
  assert.ok(approvedBody);
  const openingRuleException = {
    kind: "owner-approved-existing-body" as const,
    opening: parts.opening,
    approvedBody,
    approvalReference: "1".repeat(64),
  };
  const reviewed = {
    ...input,
    parts,
    messages: original.messages,
    openingRuleException,
  };
  expect(deterministicCopyIssues(reviewed)).toEqual([]);
  expect(
    deterministicCopyIssues({ ...reviewed, openingRuleException: undefined }),
  ).toContain('opening: say "I asked" in the active voice.');
  expect(
    deterministicCopyIssues({
      ...reviewed,
      parts: {
        ...parts,
        opening: parts.opening.replace("and asked", "and Google was asked"),
      },
    }),
  ).not.toEqual([]);
  expect(
    canonicalSequenceInput(
      reviewed.messages.map((message) =>
        message.step === 1
          ? { ...message, body: message.body + " More." }
          : message,
      ),
      reviewed,
    ).status,
  ).toBe("held");
  expect(canonicalSequenceInput(reviewed.messages, reviewed)).not.toEqual(
    canonicalSequenceInput(reviewed.messages, {
      ...reviewed,
      openingRuleException: {
        ...openingRuleException,
        approvalReference: "2".repeat(64),
      },
    }),
  );
  const calls: string[] = [];
  const judged = await Quality.judgeSequenceCopy(reviewed, {
    generate: async (request) => {
      calls.push(request.instructions);
      expect(request.instructions).toContain(
        "Waive only the literal words I asked",
      );
      expect(request.instructions).toContain("it must still be active voice");
      return passingCopyJudge();
    },
  });
  expect(judged.success).toBe(true);
  expect(calls).toHaveLength(1);
  const fresh = await Draft.composeSequence(
    reviewed.prospect,
    reviewed.receipt,
    reviewed.playbook,
    {
      ...reviewed,
      generate: async () => {
        throw new Error("A new writer must not inherit an opening exception");
      },
    },
  );
  expect(fresh.success).toBe(false);
  if (!fresh.success)
    expect(fresh.error.message).toContain(
      "only for supplied owner-approved copy",
    );
});

test("v4 rejects captured answer in writer or fixed email text and requires product-list proof", () => {
  const input = context();
  expect(
    validateWriterParts({
      ...input,
      parts: {
        ...input.parts,
        result: input.parts.result.replace(
          "come up",
          "come up in the captured answer",
        ),
      },
    }),
  ).toContain('Email copy must not say "captured answer".');
  const fixed = structuredClone(input);
  const first = fixed.messages[0];
  assert.ok(first);
  first.body += " This captured answer was saved.";
  expect(deterministicCopyIssues(fixed)).toContain(
    'Message 1 must not say "captured answer".',
  );
  const missing = structuredClone(input);
  delete missing.receipt.discovery?.productListings;
  expect(validateWriterParts(missing)).toEqual([
    "An absence claim needs bound product listings with product links from this answer.",
  ]);
});

test("new writer and judge guidance stays grounded and never authorizes edits to approved subjects", async () => {
  const input = context();
  const prompt = compositionPrompt(input);
  expect(prompt.instructions).toContain('literal words "I asked"');
  expect(prompt.instructions).toContain("Never invent lost sales");
  expect(prompt.instructions).toContain(
    "do not authorize editing an already approved subject",
  );
  const calls: string[] = [];
  const judged = await Quality.judgeSequenceCopy(input, {
    generate: async (request) => {
      calls.push(request.instructions);
      return passingCopyJudge();
    },
  });
  expect(judged.success).toBe(true);
  expect(calls).toHaveLength(1);
  expect(calls[0]).toContain('literal words "I asked"');
});

test("v4 subjects use only finite source-bound topic, projected-brand or proved-absence forms", () => {
  const input = context();
  const check = (
    subject: string,
    receipt = input.receipt,
    version = REVIEWED_COPY_RULES_VERSION as string,
  ) =>
    validateWriterSubject(subject, receipt, input.prospect, {
      copyRulesVersion:
        version === ROUND3_COPY_RULES_VERSION
          ? ROUND3_COPY_RULES_VERSION
          : REVIEWED_COPY_RULES_VERSION,
    });
  for (const subject of [
    "the linen tote shortlist",
    "tote shortlist",
    "alder came up",
    "birch got the mention",
    "alder made the shortlist",
    "this answer missed you",
  ])
    expect(check(subject)).toEqual([]);
  for (const subject of [
    "the shortlist",
    "the unrelated shortlist",
    "price shortlist",
    "seller came up",
    "unknown came up",
    "alder ranked first",
    "alder drives revenue",
    "alder came up first",
    "sample goods came up",
    "Alder came up",
    "alder came up?",
    "alder top 2",
    "the best tote shortlist",
  ])
    expect(check(subject).length).toBeGreaterThan(0);
  const seller = structuredClone(input.receipt);
  seller.discovery?.listed.push({
    name: "Seller",
    seller: "Seller",
    kind: "product",
    position: null,
    price: null,
    excerptIds: ["answer-excerpt"],
  });
  expect(check("seller came up", seller).length).toBeGreaterThan(0);
  const changedBrand = structuredClone(input.receipt);
  const brand = changedBrand.discovery?.brandProjection?.brands[0];
  assert.ok(brand);
  brand.name = "Unsupported";
  expect(check("unsupported came up", changedBrand).length).toBeGreaterThan(0);
  const present = structuredClone(input.receipt);
  assert.ok(present.discovery);
  present.discovery.merchantPresent = true;
  expect(check("this answer missed you", present).length).toBeGreaterThan(0);
  const unlinked = structuredClone(input.receipt);
  delete unlinked.discovery?.productListings;
  expect(check("this answer missed you", unlinked).length).toBeGreaterThan(0);
  for (const subject of [
    "alder came up",
    "tote shortlist",
    "this answer missed you",
  ])
    expect(
      check(subject, input.receipt, ROUND3_COPY_RULES_VERSION).length,
    ).toBeGreaterThan(0);
  const prompt = compositionPrompt(input).instructions;
  expect(prompt).toContain("exact projected product brand");
  expect(prompt).not.toContain("No brand, number, question");
});
