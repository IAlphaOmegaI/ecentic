import { describe, expect, test } from "bun:test";
import {
  resolveSettingsSection,
  settingsSections,
} from "@/lib/dashboard-settings";

describe("settings navigation", () => {
  test("preserves saved section links, including the new security section", () => {
    for (const section of settingsSections)
      expect(
        resolveSettingsSection(new URLSearchParams({ tab: section })),
      ).toBe(section);
  });

  test("opens billing after payment-provider returns", () => {
    for (const query of [
      "checkout=success",
      "payment=added",
      "billing=connected",
    ])
      expect(resolveSettingsSection(new URLSearchParams(query))).toBe(
        "billing",
      );
  });

  test("keeps an explicit section selected when old callback parameters remain", () => {
    expect(
      resolveSettingsSection(new URLSearchParams("tab=account&payment=added")),
    ).toBe("account");
    expect(
      resolveSettingsSection(
        new URLSearchParams("tab=integrations&checkout=success"),
      ),
    ).toBe("integrations");
  });

  test("returns to connected stores for service connection results", () => {
    for (const query of ["google=connected", "recharge=reconnect_required"])
      expect(resolveSettingsSection(new URLSearchParams(query))).toBe(
        "integrations",
      );
  });

  test("ignores unsupported sections and unrecognized billing outcomes", () => {
    for (const query of [
      "",
      "tab=notifications",
      "tab=https://example.com",
      "checkout=unexpected",
      "payment=unexpected",
    ])
      expect(resolveSettingsSection(new URLSearchParams(query))).toBe(
        "account",
      );
  });
});
