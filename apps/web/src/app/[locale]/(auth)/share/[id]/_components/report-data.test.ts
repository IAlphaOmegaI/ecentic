import { describe, expect, test } from "bun:test";
import { shareOutcome, shareProviderRows } from "./report-data";

describe("shared comparison report", () => {
  test("preserves the reported 26 wins and 34 losses as 43 percent", () => {
    expect(shareOutcome(26, 34)).toEqual({ total: 60, rate: 43 });
  });

  test("distinguishes no outcomes from a measured zero win rate", () => {
    expect(shareOutcome(0, 0).rate).toBeNull();
    expect(shareOutcome(0, 5).rate).toBe(0);
  });

  test("keeps recorded Perplexity outcomes without inventing absent providers", () => {
    const rows = shareProviderRows({
      perplexity: { wins: 0, losses: 15, rate: 0 },
      claude: { wins: 0, losses: 0, rate: 0 },
    });
    expect(rows).toEqual([
      {
        id: "perplexity",
        label: "Perplexity",
        logo: "/images/perplexity.svg",
        wins: 0,
        losses: 15,
        rate: 0,
      },
    ]);
    expect(shareProviderRows({})).toEqual([]);
  });

  test("retains historical providers not in the current display registry", () => {
    expect(
      shareProviderRows({ historical: { wins: 1, losses: 1, rate: 50 } })[0],
    ).toMatchObject({
      id: "historical",
      label: "historical",
      logo: null,
      rate: 50,
    });
  });
});
