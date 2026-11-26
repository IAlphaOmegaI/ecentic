import { describe, expect, test } from "bun:test";
import {
  lintMessages,
  renderHistoricalMessages,
  renderMessages,
  templateIssues,
} from "@/lib/outbound";
import {
  COPY_CRITERIA,
  type WritingSnapshot,
} from "@/lib/outbound-composition";
import { shoppingFinding } from "@/lib/outbound-shopping-research";
import { writerFixture } from "./helpers/outbound-writer-fixture";

const fixture = () => {
  const saved = writerFixture();
  const prospect = {
    ...saved.prospect,
    shoppingFinding: shoppingFinding(saved.receipt),
  };
  const messages = renderMessages(prospect, saved.policy, {
    receipt: saved.receipt,
    parts: saved.parts,
  });
  const writing: WritingSnapshot = {
    version: "discovery-email-v1",
    writingPolicyHash: "a".repeat(64),
    receiptHash: "b".repeat(64),
    contentHash: "c".repeat(64),
    revision: 1,
    generatedAt: new Date().toISOString(),
    parts: saved.parts,
    queryTopic: saved.parts.subject,
    narrative: { relationship: "sister", occasion: null },
    quality: {
      passed: true,
      evaluatedAt: new Date().toISOString(),
      deterministicIssues: [],
      criteria: COPY_CRITERIA.map((criterion) => ({
        criterion,
        passed: true,
        reason: "Synthetic fixture passed this copy check.",
      })),
    },
  };
  return {
    ...saved,
    prospect,
    messages: messages.map((message) =>
      message.step === 1 ? { ...message, writing } : message,
    ),
  };
};

describe("new written sequence rendering", () => {
  test("requires real writer context and keeps historical rendering explicit", () => {
    const input = fixture();
    expect(renderMessages(input.prospect, input.policy)).toEqual([]);
    expect(
      renderMessages(input.prospect, input.policy, {
        receipt: input.receipt,
        parts: { ...input.parts, result: "" },
      }),
    ).toEqual([]);
    expect(
      renderMessages(input.prospect, input.policy, {
        receipt: input.receipt,
        parts: input.parts,
      }),
    ).toHaveLength(3);
    expect(
      renderHistoricalMessages(input.prospect, input.policy)[0]?.body,
    ).toContain("{opening}");
  });

  test("accepts every new variable and identifies an unsupported token", () => {
    expect(
      templateIssues(
        "{opening} {result} {relevance} {queryTopic} {followupFact}",
      ),
    ).toEqual([]);
    expect(templateIssues("{unknown}")).toEqual([
      { code: "unknownVariable", field: "unknown" },
    ]);
  });
});

describe("new written sequence lint", () => {
  test("checks a passed sequence without expecting internal assessor sentences", () => {
    const input = fixture();
    expect(input.messages[0]?.body).not.toContain(
      input.receipt.selected.observation,
    );
    expect(lintMessages(input.messages, input.policy, input.prospect)).toEqual(
      [],
    );
    expect(
      lintMessages(input.messages, input.policy, input.prospect, input.receipt),
    ).toEqual([]);
  });

  test("holds missing writing metadata and missing or failed quality", () => {
    const input = fixture();
    const missing = input.messages.map(
      ({ writing: _writing, ...message }) => message,
    );
    expect(lintMessages(missing, input.policy, input.prospect)).toContainEqual({
      code: "writingRequired",
      field: "message1",
    });
    const messages = input.messages.map((message) =>
      message.writing
        ? { ...message, writing: { ...message.writing, quality: null } }
        : message,
    );
    expect(lintMessages(messages, input.policy, input.prospect)).toContainEqual(
      { code: "copyQuality", field: "message1" },
    );
  });

  test("maps the current finding and sender to the exact founder line", () => {
    const input = fixture();
    const first = input.messages[0];
    if (!first) throw new Error("Missing first message.");
    expect(first.body).toContain(input.policy.productCheckIntro);
    const page = {
      ...input.prospect,
      shoppingFinding: {
        ...input.prospect.shoppingFinding,
        kind: "product-data-gap" as const,
      },
    };
    expect(lintMessages(input.messages, input.policy, page)).toContainEqual({
      code: "writingChanged",
      field: "message1",
    });
    const pageMessages = input.messages.map((message) =>
      message.step === 1
        ? {
            ...message,
            body: message.body.replace(
              input.policy.productCheckIntro,
              input.policy.founderLine,
            ),
          }
        : message,
    );
    expect(lintMessages(pageMessages, input.policy, page)).toEqual([]);
    const changedSender = {
      ...input.policy,
      signature: "Another sender",
      productCheckIntro: "I'm another sender. I started ecentic.",
    };
    expect(
      lintMessages(input.messages, changedSender, input.prospect).length,
    ).toBeGreaterThan(0);
  });

  test("rejects repeated parts, missing results and unsupported new-template fields", () => {
    const input = fixture();
    for (const bodyTemplate of [
      input.policy.bodyTemplate.replace("{opening}", "{opening} {opening}"),
      input.policy.bodyTemplate.replace("{result}", ""),
      input.policy.bodyTemplate.replace("{result}", "{finding}"),
    ]) {
      const issues = lintMessages(
        input.messages,
        { ...input.policy, bodyTemplate },
        input.prospect,
      );
      expect(
        issues.some((issue) =>
          ["templateControlsChanged", "unknownVariable"].includes(issue.code),
        ),
      ).toBe(true);
    }
  });

  test("requires exact follow-up opt-outs and signatures without mutating text", () => {
    const input = fixture();
    const changed = input.messages.map((message) =>
      message.step === 2
        ? {
            ...message,
            body: message.body.replace(input.policy.optout, "Reply to stop."),
          }
        : message,
    );
    const before = JSON.stringify(changed);
    expect(lintMessages(changed, input.policy, input.prospect)).toContainEqual({
      code: "optoutMissing",
      field: "message2",
    });
    expect(JSON.stringify(changed)).toBe(before);
    const altered = input.messages.map((message) =>
      message.step === 3
        ? { ...message, body: `${message.body} Founder` }
        : message,
    );
    expect(lintMessages(altered, input.policy, input.prospect)).toContainEqual({
      code: "signatureMissing",
      field: "message3",
    });
  });

  test("uses whole-word bans in both legacy and new paths", () => {
    const input = fixture();
    const policy = {
      ...input.policy,
      bannedPhrases: "code; GEO; following up",
    };
    const prospect = { ...input.prospect, first: "George" };
    const messages = input.messages.map((message) => ({
      ...message,
      body: message.body.replaceAll("Jamie", "George"),
    }));
    expect(lintMessages(messages, policy, prospect)).toEqual([]);
    const blocked = messages.map((message) =>
      message.step === 3
        ? { ...message, body: message.body.replace("Last note", "GEO note") }
        : message,
    );
    expect(lintMessages(blocked, policy, prospect)).toContainEqual({
      code: "bannedPhrase",
      field: "message3",
    });
  });
});
