import { describe, expect, test } from "bun:test";
import { ogTextLayout } from "../../lib/og-layout";

describe("multilingual social image copy", () => {
  test("keeps ordinary localized headlines complete without repeating the brand suffix", () => {
    for (const [locale, title] of [
      ["en", "Get the sale when AI does the buying. | ecentic"],
      ["de", "Sichtbar werden, wenn KI Ihre Produkte vergleicht."],
      ["it", "Vendi quando è l’AI a fare gli acquisti."],
      ["ja", "ChatGPTが商品を選ぶとき、選ばれる商品へ。"],
      ["zh-CN", "让AI购物智能体选择你的商品。"],
    ] as const) {
      const result = ogTextLayout(title, "", locale);
      expect(result.titleLines.join("")).not.toContain("…");
      expect(result.titleLines.join("")).not.toContain("| ecentic");
      expect(
        result.titleLines.length * result.titleSize * result.titleLineHeight,
      ).toBeLessThanOrEqual(276);
      expect(result.descriptionLines).toEqual([]);
      expect(result.titleLines.some((line) => /^[.,!?]/u.test(line))).toBe(
        false,
      );
    }
  });

  test("keeps embedded provider names whole in Japanese copy", () => {
    const result = ogTextLayout(
      "世界の商品をChatGPTとGeminiで比較する新しい購入体験を実現する",
      "",
      "ja",
    );
    expect(result.titleLines.some((line) => line.includes("ChatGPT"))).toBe(
      true,
    );
    expect(result.titleLines.some((line) => line.includes("Gemini"))).toBe(
      true,
    );
    expect(result.titleLines.some((line) => /^[、。）」]/u.test(line))).toBe(
      false,
    );
  });

  test("contains long copy and retains complete graphemes", () => {
    const result = ogTextLayout(
      `👩‍💻 ${"Donaudampfschifffahrtsgesellschaft ".repeat(12)}`,
      "Un testo descrittivo molto lungo. ".repeat(50),
      "it",
    );
    expect(result.titleLines[0]).toContain("👩‍💻");
    expect(result.titleLines.at(-1)).toEndWith("…");
    expect(result.descriptionLines).toHaveLength(3);
    expect(result.descriptionLines.at(-1)).toEndWith("…");
    expect(result.titleLines.join("")).not.toContain("�");
  });

  test("reserves full-width advances for Japanese long vowels and punctuation", () => {
    const result = ogTextLayout(
      "AIコマースジャーナル。",
      "商品データ、AIによるおすすめ、エージェントによる購入手続きを解説する実践ガイド。",
      "ja",
    );
    expect(result.descriptionLines).toHaveLength(2);
    expect(result.descriptionLines[0]?.length).toBeLessThanOrEqual(28);
    expect(result.descriptionLines.join("")).toBe(
      "商品データ、AIによるおすすめ、エージェントによる購入手続きを解説する実践ガイド。",
    );
  });
});
