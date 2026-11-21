import { describe, expect, test } from "bun:test";
import { distinctReviewIssues, reviewState } from "../outbound-review-state";

describe("review panel status", () => {
  test("copy changes are a draft update, not a risk alert", () => {
    expect(
      reviewState({
        status: "draft",
        sentStep: 0,
        issues: [{ code: "templateControlsChanged", field: "message1" }],
      }),
    ).toBe("update");
  });

  test.each([
    "suppressed",
    "claimNotAllowed",
    "emailUnverified",
    "findingCopyChanged",
    "shoppingResearchRequired",
    "unrecognizedCheck",
  ])("%s remains visible even beside a routine copy issue", (code) => {
    expect(
      reviewState({
        status: "draft",
        sentStep: 0,
        issues: [
          { code: "templateControlsChanged", field: "message1" },
          { code, field: "message1" },
        ],
      }),
    ).toBe("attention");
  });

  test("a deliberate hold never appears ready for automatic approval", () => {
    expect(reviewState({ status: "held", sentStep: 0, issues: [] })).toBe(
      "held",
    );
  });

  test("checks passing are distinct from an actual approval", () => {
    expect(reviewState({ status: "draft", sentStep: 0, issues: [] })).toBe(
      "ready",
    );
    expect(reviewState({ status: "approved", sentStep: 0, issues: [] })).toBe(
      "approved",
    );
  });

  test("the same issue across follow-ups is explained once", () => {
    expect(
      distinctReviewIssues([
        { code: "wordLimit", field: "message1" },
        { code: "wordLimit", field: "message2" },
        { code: "emailUnverified", field: "email" },
      ]),
    ).toHaveLength(2);
  });
});
