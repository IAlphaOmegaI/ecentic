import { describe, expect, test } from "bun:test";
import { defaultPlaybook, lintMessages } from "@/lib/outbound";

const emojiIssues = (subject: string, body: string) =>
  lintMessages([{ step: 1, afterDays: 0, subject, body }], defaultPlaybook).filter(
    (issue) => issue.code === "emoji",
  );

describe("product symbols in message lint", () => {
  test.each(["©", "®", "™", "™\uFE0E"])(
    "allows the text presentation of %s in product names",
    (mark) => {
      expect(
        emojiIssues(`Algae${mark} body oil`, `I checked Algae${mark}.`),
      ).toEqual([]);
    },
  );

  test.each(["©\uFE0F", "®\uFE0F", "™\uFE0F", "😀", "🎁", "❤️"])(
    "continues rejecting emoji %s in either subject or body",
    (emoji) => {
      expect(emojiIssues(`Body oil ${emoji}`, "Product details")).toHaveLength(
        1,
      );
      expect(emojiIssues("Body oil", `Product details ${emoji}`)).toHaveLength(
        1,
      );
    },
  );

  test("a legal mark cannot mask an adjacent emoji", () => {
    expect(emojiIssues("Body oil™🎁", "Product details")).toHaveLength(1);
  });
});
