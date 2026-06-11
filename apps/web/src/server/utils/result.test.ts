import { describe, expect, test } from "bun:test";
import { resultify } from "@zenncore/utils";

describe("resultify", () => {
  test("wraps a successful sync callback", () => {
    const parsed = resultify(
      () => JSON.parse('{"value":1}') as { value: number },
    );
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.value).toBe(1);
  });

  test("captures a thrown error", () => {
    const parsed = resultify(() => JSON.parse("not json") as unknown);
    expect(parsed.success).toBe(false);
  });

  test("wraps a successful async callback", async () => {
    const value = await resultify(async () => 42);
    expect(value.success).toBe(true);
    // data narrowing: cast through success branch
    if ("data" in value) expect(value.data).toBe(42);
  });
});
