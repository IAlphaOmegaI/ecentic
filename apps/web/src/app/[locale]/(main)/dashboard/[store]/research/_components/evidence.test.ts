import { describe, expect, test } from "bun:test";
import { summarizeComparisons } from "./evidence";

describe("stored comparison evidence", () => {
  test("counts actual products and models in the requested scan, excluding other scans", () => {
    const summary = summarizeComparisons(
      [
        {
          scanId: "latest",
          productId: "one",
          model: "gpt4",
          winner: "product",
        },
        {
          scanId: "latest",
          productId: "one",
          model: "gpt4",
          winner: "competitor",
        },
        {
          scanId: "latest",
          productId: "two",
          model: "claude",
          winner: "product",
        },
        {
          scanId: "old",
          productId: "three",
          model: "gemini",
          winner: "product",
        },
      ],
      "latest",
    );
    expect(summary).toEqual({
      wins: 2,
      losses: 1,
      count: 2,
      modelRates: {
        gpt4: { wins: 1, losses: 1, rate: 50 },
        claude: { wins: 1, losses: 0, rate: 100 },
      },
    });
  });
  test("an empty scan has no measured model rates", () => {
    expect(summarizeComparisons([], "empty")).toEqual({
      wins: 0,
      losses: 0,
      count: 0,
      modelRates: {},
    });
  });
});
