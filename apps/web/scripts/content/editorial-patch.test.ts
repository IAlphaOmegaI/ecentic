import { describe, expect, test } from "bun:test";
import { applyEditorialChanges } from "./editorial-patch";

describe("guarded editorial patch", () => {
  const article = { sections: [{ content: "Old claim", title: "Keep title" }] };
  const changes = [
    {
      path: ["sections", 0, "content"],
      before: "Old claim",
      after: "Verified claim",
    },
  ];

  test("changes only the selected leaf and does not mutate the input", () => {
    const result = applyEditorialChanges(article, changes);
    expect(result.updated).toEqual({
      sections: [{ content: "Verified claim", title: "Keep title" }],
    });
    expect(result.changes).toBe(1);
    expect(article.sections[0]?.content).toBe("Old claim");
  });

  test("a repeated patch is a no-op", () => {
    const first = applyEditorialChanges(article, changes);
    expect(applyEditorialChanges(first.updated, changes)).toEqual({
      updated: first.updated,
      changes: 0,
    });
  });

  test("refuses a later editor's change and leaves the source untouched", () => {
    const edited = { sections: [{ content: "Later editor's claim" }] };
    expect(() => applyEditorialChanges(edited, changes)).toThrow(
      "review required",
    );
    expect(edited.sections[0]?.content).toBe("Later editor's claim");
  });
});
