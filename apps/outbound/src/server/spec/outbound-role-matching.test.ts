import { describe, expect, test } from "bun:test";
import {
  defaultPlaybook,
  prospectIssues,
  prospectSchema,
} from "@/lib/outbound";
import { isExcludedRole, matchesRole } from "@/lib/outbound-roles";

describe("shared outbound role eligibility", () => {
  test("actual provider abbreviations and scope qualifiers match without broadening unrelated roles", () => {
    expect(
      matchesRole("Vice President of Digital & eCommerce", "VP Digital"),
    ).toBe(true);
    expect(matchesRole("Chief Marketing Officer", "CMO")).toBe(true);
    expect(matchesRole("Global Head of E-commerce", "Head of Ecommerce")).toBe(
      true,
    );
    expect(matchesRole("VP Engineering", "VP Marketing")).toBe(false);
    expect(matchesRole("Growth Hacker", "Head of Growth")).toBe(false);
    expect(isExcludedRole("Former Vice President of Digital", ["former"])).toBe(
      true,
    );
    expect(isExcludedRole("Assistant to VP Digital", [])).toBe(true);
    expect(isExcludedRole("Junior E-commerce Manager", [])).toBe(true);
  });
  test("final Playbook gates use the same aliases and keep explicit role exclusions", () => {
    const now = new Date();
    const title = "Vice President of Digital & eCommerce";
    const prospect = prospectSchema.parse({
      company: "Sample Goods",
      domain: "samplegoods.com",
      country: "US",
      name: "Elaine Example",
      title,
      roleSource: "https://app.apollo.io/#/people/actual",
      roleCheckedAt: now.toISOString(),
    });
    const settings = { ...defaultPlaybook, targetRoles: "VP Digital" };
    const roles = (actualTitle: string) =>
      prospectIssues({ ...prospect, title: actualTitle }, settings, now).filter(
        (issue) => ["roleOutsideTarget", "roleExcluded"].includes(issue.code),
      );
    expect(roles(title)).toEqual([]);
    expect(
      roles(`Assistant to ${title}`).some(
        (issue) => issue.code === "roleExcluded",
      ),
    ).toBe(true);
    expect(
      roles(`Former ${title}`).some((issue) => issue.code === "roleExcluded"),
    ).toBe(true);
    expect(
      roles("VP Engineering").some(
        (issue) => issue.code === "roleOutsideTarget",
      ),
    ).toBe(true);
    expect(prospect.title).toBe(title);
  });
});
