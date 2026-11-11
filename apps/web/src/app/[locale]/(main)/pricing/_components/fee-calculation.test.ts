import { describe, expect, test } from "bun:test";
import { PLAN_CATALOG } from "@/lib/agent-api";
import { estimateFee, parseFeeInputs } from "./fee-calculation";

const pricing = PLAN_CATALOG.find(
  (plan) => plan.key === "payg",
)?.performanceFee;
if (!pricing) throw new Error("Missing public PAYG pricing");
const fee = (orders: number, amountCents: number) =>
  estimateFee({ orders, amountCents, ...pricing });
describe("public PAYG estimate", () => {
  test("matches the $120 worked example", () =>
    expect(fee(1, 12000)).toBe(360));
  test("rounds each order, then sums", () => expect(fee(3, 17)).toBe(3));
  test("zero and cap", () => {
    expect(fee(0, 12000)).toBe(0);
    expect(fee(100000, 12000)).toBe(pricing.capCents);
  });
  test("flat plan tie", () => expect(fee(1, 49667)).toBe(1490));
  test("parsing rejects ambiguous input and accepts zero", () => {
    expect(parseFeeInputs("0", "0")).toEqual({ orders: 0, amountCents: 0 });
    expect(parseFeeInputs("2", "120,25")).toEqual({
      orders: 2,
      amountCents: 12025,
    });
    for (const values of [
      ["", "120"],
      ["-1", "120"],
      ["1.5", "120"],
      ["1", "12.345"],
      ["1", "Infinity"],
    ])
      expect(parseFeeInputs(values[0] ?? "", values[1] ?? "")).toBeNull();
  });
});
