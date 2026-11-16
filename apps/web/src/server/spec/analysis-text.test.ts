import { describe, expect, test } from "bun:test";
import { segmentAnalysisText } from "@/lib/analysis-text";

describe("analysis emphasis", () => {
  test("preserves unformatted evidence verbatim", () => {
    const text =
      "No unbranded answers mentioned the store.\nThe sample is small.";
    expect(
      segmentAnalysisText(text)
        .map((part) => part.text)
        .join(""),
    ).toBe(text);
  });

  test("emphasizes the exact phrases requested by the model", () => {
    expect(
      segmentAnalysisText("The sample had **no unbranded mentions**."),
    ).toContainEqual({
      text: "no unbranded mentions",
      emphasized: true,
    });
  });

  test("legacy reports can emphasize known brands without changing claims", () => {
    expect(
      segmentAnalysisText("Sony leads; sony appears twice.", ["Sony"])
        .filter((part) => part.emphasized)
        .map((part) => part.text),
    ).toEqual(["Sony", "sony"]);
  });

  test("never matches a name inside another word", () => {
    expect(
      segmentAnalysisText("Apple and pineapple", ["Apple"])
        .filter((part) => part.emphasized)
        .map((part) => part.text),
    ).toEqual(["Apple"]);
  });

  test("escapes regex metacharacters in names", () => {
    expect(
      segmentAnalysisText("A+B and AAB", ["A+B"])
        .filter((part) => part.emphasized)
        .map((part) => part.text),
    ).toEqual(["A+B"]);
  });

  test("leaves HTML, links, and malformed emphasis as literal text", () => {
    const text =
      "<script>alert(1)</script> [link](javascript:alert(1)) **unfinished";
    expect(segmentAnalysisText(text)).toEqual([{ text, emphasized: false }]);
  });

  test("supports non-Latin names and preserves newlines", () => {
    expect(
      segmentAnalysisText("ソニー\n小米", ["ソニー", "小米"])
        .filter((part) => part.emphasized)
        .map((part) => part.text),
    ).toEqual(["ソニー", "小米"]);
  });

  test("leaves paragraph-sized strong markup untouched", () => {
    const text = `**${"x".repeat(161)}**`;
    expect(segmentAnalysisText(text)).toEqual([{ text, emphasized: false }]);
  });
});
