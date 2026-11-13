import { describe, expect, test } from "bun:test";
import { formatElapsed, formatRelativeTime } from "../date";

describe("localized time displays", () => {
  test("uses language-specific units and decimal separators", () => {
    expect(formatElapsed(2500, "de")).toContain("2,5");
    expect(formatElapsed(2500, "ja")).toContain("秒");
    expect(formatElapsed(2500, "zh-CN")).toContain("秒");
  });

  test("localizes relative activity timestamps", () => {
    const twoHoursAgo = new Date(Date.now() - 121 * 60 * 1000);
    expect(formatRelativeTime(twoHoursAgo, "fr")).toContain("il y a");
    expect(formatRelativeTime(twoHoursAgo, "de")).toContain("vor");
    expect(formatRelativeTime(twoHoursAgo, "ja")).toContain("時間前");
  });
});
