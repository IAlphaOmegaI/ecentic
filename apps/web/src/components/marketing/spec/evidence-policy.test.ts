import { describe, expect, test } from "bun:test";
import {
  catalogFindings,
  duaEvidence,
  marketContext,
  simulationEvidence,
} from "@/content/marketing-evidence";
import {
  canPublishEvidence,
  selectPublishedEvidence,
} from "../evidence-policy";

describe("marketing evidence publication", () => {
  test("normal output includes only the two approved audit rows", () => {
    const rows = selectPublishedEvidence(catalogFindings);
    expect(rows.map((row) => row.id)).toEqual([
      "catalogFaults",
      "storeNotNamed",
    ]);
    expect(rows.every((row) => row.companyId === "spiritsMarketplace")).toBe(
      true,
    );
    expect(rows.map((row) => row.total)).toEqual([9_699, 20]);
  });

  test("review includes pending findings without changing their approval", () => {
    const rows = selectPublishedEvidence(catalogFindings, true);
    expect(rows).toHaveLength(5);
    expect(
      rows.filter((row) => row.approval === "pending").map((row) => row.id),
    ).toEqual(["missingOfferFacts", "missingDescriptions", "paymentBlocked"]);
    expect(selectPublishedEvidence(rows)).toHaveLength(2);
  });

  test("the rounded percentage never supplies an invented failure count", () => {
    const finding = catalogFindings.find((row) => row.id === "catalogFaults");
    expect(finding?.percentage).toBe(88);
    expect(finding?.total).toBe(9_699);
    expect(finding?.failureCount).toBeNull();
    expect(finding?.rounded).toBe(true);
  });

  test("research and optional market figures remain review-only", () => {
    expect(canPublishEvidence(simulationEvidence.status)).toBe(false);
    expect(canPublishEvidence(simulationEvidence.status, true)).toBe(true);
    expect(
      marketContext.every((item) => !canPublishEvidence(item.status)),
    ).toBe(true);
    expect(marketContext.every((item) => item.value === null)).toBe(true);
  });

  test("aggregate decisions do not stand in for missing model denominators", () => {
    expect(simulationEvidence.sampleSize).toBe(36_797);
    expect(simulationEvidence.models.map((model) => model.rate)).toEqual([
      51.6,
      null,
      null,
    ]);
    expect(
      simulationEvidence.models.every(
        (model) => model.total === null && model.count === null,
      ),
    ).toBe(true);
    expect(simulationEvidence.models.map((model) => model.id)).toEqual([
      "chatgpt",
      "claude",
      "gemini",
    ]);
  });

  test("the approved DUA aggregate retains its mixed traffic metric and period", () => {
    expect(canPublishEvidence(duaEvidence.status)).toBe(true);
    expect(duaEvidence.metric).toBe("ai-or-direct-visits");
    expect(duaEvidence.changePercent).toBe(12);
    expect(duaEvidence.periodStart).toBe("2026-04");
    expect(duaEvidence.periodEnd).toBe("2026-07");
    expect(duaEvidence.confirmed).toBe("2026-09-03");
  });
});
