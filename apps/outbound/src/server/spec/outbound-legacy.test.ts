import { describe, expect, test } from "bun:test";
import { prepareLegacyImport } from "@/server/app/outbound/legacy";

const research = [
  {
    company: "Example Goods",
    domain: "shop.example.com",
    country: "",
    person_name: "Jane Smith",
    email: "jane@example.com",
    title: "Founder",
    status: "candidate",
    email_status: "tool-verified",
    source: "legacy research",
  },
];
describe("legacy outbound migration normalization", () => {
  test("draft export wins while unknown country and verification dates remain unconfirmed", () => {
    const prepared = prepareLegacyImport({
      crm: [],
      exclusions: [],
      research,
      drafts: [
        {
          company: "Example Goods",
          domain: "example.com",
          name: "Jane Smith",
          status: "ready",
          subject: "Linen tote",
          body: ["Hi Jane!", "The product dimensions are missing."],
          optout: 'Reply "no".',
          signoff: "Juri",
        },
      ],
    });
    expect(prepared.report.prospects).toBe(1);
    expect(prepared.report.drafts).toBe(1);
    const prospect = prepared.rows[0];
    expect(prospect?.["body"]).toBe(
      'Hi Jane!\n\nThe product dimensions are missing.\n\n(Reply "no".)\n\nJuri',
    );
    expect(prospect?.["country"]).toBe("ZZ");
    expect(prospect?.["status"]).toBe("held");
    expect(prospect?.["emailVerifiedAt"]).toBe("");
    expect(prospect).not.toHaveProperty("approvedAt");
  });
  test("historic domain recovery never guesses a missing domain suffix", () => {
    const prepared = prepareLegacyImport({
      crm: [
        { website: "https://valid.example.com +", status: "contacted" },
        {
          website: "https://companyname",
          email: "Person at companyname",
          status: "contacted",
        },
      ],
      exclusions: [],
      research: [],
      drafts: [],
    });
    expect(prepared.report.recoveredIdentities).toBe(1);
    expect(prepared.report.domainExclusions).toBe(1);
    expect(prepared.report.errors).toHaveLength(1);
    expect(prepared.report.errors[0]?.rawIdentity?.website).toBe(
      "https://companyname",
    );
    expect(prepared.rows[0]?.["domain"]).toBe("example.com");
  });
  test("a bounce stays address-scoped and explicit DNC supplies separate company scope", () => {
    const prepared = prepareLegacyImport({
      crm: [
        {
          website: "https://bounce.com",
          email: "jane@bounce.com",
          status: "bounced",
        },
        { website: "https://suppressed.com", email: "", status: "bounced" },
      ],
      exclusions: [
        { domain: "suppressed.com", reason: "Separate company opt-out" },
      ],
      research: [],
      drafts: [],
    });
    expect(prepared.report.emailExclusions).toBe(1);
    expect(prepared.report.domainExclusions).toBe(1);
    expect(prepared.report.coveredMissingBounces).toBe(1);
    expect(prepared.report.errors).toEqual([]);
    expect(prepared.rows.some((row) => row["domain"] === "bounce.com")).toBe(
      false,
    );
  });
});
