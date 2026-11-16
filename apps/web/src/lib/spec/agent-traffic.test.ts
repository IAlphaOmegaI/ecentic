import { describe, expect, test } from "bun:test";
import { getTrafficBreakdown } from "../agent-traffic";

describe("recorded agent traffic", () => {
  test("separates referrals from requests and excludes tracker probes", () => {
    const report = getTrafficBreakdown(
      [
        { agentType: "chatgpt-referral", count: 12 },
        { agentType: "chatgpt-user", count: 8 },
        { agentType: "gptbot", count: 3 },
        { agentType: "probe-ping", count: 100 },
      ],
      "Other sources",
    );
    expect(report.referrals).toBe(12);
    expect(report.requests).toBe(11);
    expect(report.probes).toBe(100);
    expect(report.sources).toEqual([
      {
        name: "ChatGPT / OpenAI",
        provider: "chatgpt",
        referrals: 12,
        requests: 11,
      },
    ]);
  });

  test("retains unknown providers and reconciles source counts with totals", () => {
    const report = getTrafficBreakdown(
      [
        { agentType: "gemini-referral", count: 4 },
        { agentType: "googlebot", count: 7 },
        { agentType: "new-agent-referral", count: 2 },
        { agentType: "new-agent-crawler", count: 15 },
      ],
      "Autres sources",
    );
    expect(report.sources[0]).toEqual({
      name: "Autres sources",
      provider: undefined,
      referrals: 2,
      requests: 15,
    });
    expect(
      report.sources.reduce((total, source) => total + source.referrals, 0),
    ).toBe(report.referrals);
    expect(
      report.sources.reduce((total, source) => total + source.requests, 0),
    ).toBe(report.requests);
  });

  test("does not turn tracker tests or absent providers into traffic", () => {
    expect(getTrafficBreakdown([], "Other sources")).toEqual({
      referrals: 0,
      requests: 0,
      probes: 0,
      sources: [],
    });
    expect(
      getTrafficBreakdown(
        [{ agentType: "probe-ping", count: 3 }],
        "Other sources",
      ).sources,
    ).toEqual([]);
  });
});
