import { describe, expect, test } from "bun:test";
import {
  evaluateReviews,
  type Manifest,
  manifestSchema,
  type Receipts,
  reviewDigest,
  sourceDigest,
} from "./review";

const check: Manifest["checks"][number] = {
  id: "shopping",
  route: "/solutions",
  sources: ["shopping.tsx"],
  evidenceIds: ["0703.09"],
  states: [
    {
      id: "mobile",
      locale: "en",
      width: 390,
      criterion: "The complete answer is visible.",
    },
  ],
};
const manifest: Manifest = { schemaVersion: 1, checks: [check] };
const sources = { "shopping.tsx": "current source" };
const digest = reviewDigest(check, sources);
const receipt: Receipts["reviews"][number] = {
  check: "shopping",
  state: "mobile",
  sourceDigest: digest,
  verdict: "passed",
  reviewer: "Visual reviewer",
  reviewedAt: "2026-11-12T16:00:00Z",
  observation: "Answer and both result tiles are reachable.",
  evidence: ["review.md"],
};
const evaluate = (
  reviews: Receipts["reviews"],
  evidence = new Set(["review.md"]),
) =>
  evaluateReviews(
    manifest,
    { schemaVersion: 1, reviews },
    { shopping: digest },
    evidence,
  );

describe("visual review evidence", () => {
  test("a current observed pass is accepted; a missing state is not", () => {
    expect(evaluate([receipt]).summary).toEqual({
      passed: 1,
      failed: 0,
      notChecked: 0,
    });
    expect(evaluate([]).summary.notChecked).toBe(1);
  });
  test("changed source invalidates an earlier pass", () => {
    expect(
      evaluate([
        {
          ...receipt,
          sourceDigest: reviewDigest(check, {
            "shopping.tsx": "previous source",
          }),
        },
      ]).summary.notChecked,
    ).toBe(1);
  });
  test("an image file alone cannot establish visual acceptance", () => {
    expect(
      evaluate([{ ...receipt, reviewer: "", observation: "" }]).summary
        .notChecked,
    ).toBe(1);
    expect(evaluate([receipt], new Set()).summary.notChecked).toBe(1);
  });
  test("failures survive and contradictory duplicate reviews cannot pass", () => {
    expect(evaluate([{ ...receipt, verdict: "failed" }]).summary.failed).toBe(
      1,
    );
    expect(
      evaluate([receipt, { ...receipt, verdict: "failed" }]).summary.notChecked,
    ).toBe(1);
  });
  test("unknown target receipts are errors, not silent coverage", () => {
    expect(evaluate([{ ...receipt, state: "desktop" }]).errors).toHaveLength(1);
  });
  test("an empty registry cannot claim a strict pass", () => {
    expect(
      manifestSchema.safeParse({ schemaVersion: 1, checks: [] }).success,
    ).toBe(false);
  });
  test("binary assets remain distinct even when UTF-8 decoding would lose bytes", () => {
    const first = new Uint8Array([255]);
    const second = new Uint8Array([254]);
    expect(new TextDecoder().decode(first)).toBe(
      new TextDecoder().decode(second),
    );
    expect(sourceDigest({ "art.png": first })).not.toBe(
      sourceDigest({ "art.png": second }),
    );
  });
  test.each([
    { label: "route", next: { ...check, route: "/other" } },
    {
      label: "locale",
      next: {
        ...check,
        states: check.states.map((state) => ({
          ...state,
          locale: "es" as const,
        })),
      },
    },
    {
      label: "width",
      next: {
        ...check,
        states: check.states.map((state) => ({ ...state, width: 1135 })),
      },
    },
    {
      label: "criterion",
      next: {
        ...check,
        states: check.states.map((state) => ({
          ...state,
          criterion: "A different visual contract.",
        })),
      },
    },
  ])("a changed $label invalidates a prior review", ({ next }) => {
    expect(
      evaluateReviews(
        { schemaVersion: 1, checks: [next] },
        { schemaVersion: 1, reviews: [receipt] },
        { shopping: reviewDigest(next, sources) },
        new Set(["review.md"]),
      ).summary.notChecked,
    ).toBe(1);
  });
});
