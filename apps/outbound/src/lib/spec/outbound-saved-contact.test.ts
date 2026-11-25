import { describe, expect, test } from "bun:test";
import { defaultPlaybook, prospectIssues, prospectSchema } from "../outbound";
import { draftReviewReadinessKey } from "../outbound-draft-review";
import {
  LEGACY_CONTACT_IMPORT_ACTOR,
  savedContactIdentitySchema,
  savedContactReceiptMatches,
  savedContactSourceVerified,
} from "../outbound-saved-contact";

const now = new Date("2026-11-25T17:00:00Z");
const prospect = prospectSchema.parse({
  company: "Sample Goods",
  domain: "samplegoods.com",
  country: "US",
  name: "Jane Smith",
  first: "Jane",
  title: "Head of Growth",
  email: "jane@samplegoods.com",
  emailStatus: "verified",
  emailSource: "StoreInspect (verified)",
  source:
    "legacy W46: StoreInspect export 2026-11-10 (A: $500K-$10M, marketing/e-com contact)",
  savedContactVerificationId: "5f9c7f6e-0a81-4981-9c2f-dd417179e3cf",
  timezone: "America/New_York",
  mxProvider: "google",
  mxCheckedAt: now.toISOString(),
  product: "Linen tote",
  productUrl: "https://samplegoods.com/products/tote",
  finding: "The page lists one size, but does not give its dimensions.",
  evidence: "Visible product details inspected.",
  evidenceCheckedAt: now.toISOString(),
  legitEvidence: "Physical product catalogue and business identity inspected.",
});
const settings = {
  ...defaultPlaybook,
  senderConfirmed: true,
  trustSavedContactVerification: true,
};

describe("accepted imported contact evidence", () => {
  test("automatic review retries when either explicit contact or observation policy changes", () => {
    const original = draftReviewReadinessKey(prospect, true, true);
    const trusted = draftReviewReadinessKey(prospect, true, true, true);
    const observations = draftReviewReadinessKey(
      prospect,
      true,
      true,
      true,
      true,
    );
    expect(original).not.toBe(trusted);
    expect(trusted).not.toBe(observations);
  });
  test("explicit opt-in accepts unknown original dates without writing fresh dates", () => {
    expect(prospectIssues(prospect, settings, now)).toEqual([]);
    expect(prospect.emailVerifiedAt).toBe("");
    expect(prospect.roleCheckedAt).toBe("");
    expect(prospect.roleSource).toBe("");
    const blocked = prospectIssues(prospect, defaultPlaybook, now).map(
      (issue) => issue.code,
    );
    expect(blocked).toContain("emailUnverified");
    expect(blocked).toContain("roleUnverified");
    expect(
      prospectIssues(
        { ...prospect, savedContactVerificationId: "" },
        settings,
        now,
      ).map((issue) => issue.code),
    ).toContain("emailUnverified");
  });

  test("unknown, guessed and catch-all addresses never inherit imported verification", () => {
    for (const emailStatus of [
      "unknown",
      "guessed",
      "catchAll",
      "invalid",
    ] as const) {
      const changed = { ...prospect, emailStatus };
      expect(savedContactSourceVerified(changed)).toBe(false);
      expect(
        prospectIssues(changed, settings, now).map((issue) => issue.code),
      ).toContain("emailUnverified");
    }
    expect(savedContactSourceVerified({ ...prospect, source: "manual" })).toBe(
      false,
    );
    expect(
      savedContactSourceVerified({ ...prospect, emailSource: "verified" }),
    ).toBe(false);
    expect(
      prospectIssues(
        { ...prospect, emailVerifiedAt: "2026-12-01T00:00:00Z" },
        settings,
        now,
      ).map((issue) => issue.code),
    ).toContain("emailUnverified");
  });

  test("shared inboxes, domain mismatch, excluded roles and Microsoft holds remain", () => {
    for (const [patch, code] of [
      [{ email: "info@samplegoods.com" }, "sharedInbox"],
      [{ email: "jane@anotherbrand.com" }, "emailDomainMismatch"],
      [{ title: "Former Head of Growth" }, "roleExcluded"],
      [{ mxProvider: "microsoft" }, "microsoftHeld"],
    ] as const)
      expect(
        prospectIssues({ ...prospect, ...patch }, settings, now).map(
          (issue) => issue.code,
        ),
      ).toContain(code);
  });

  test("receipt binds contact identity and actual dates while later product research may change", () => {
    const original = {
      id: "29e7b7cd-0e69-4a78-965d-fc329f421c4f",
      createdBy: LEGACY_CONTACT_IMPORT_ACTOR,
      createdAt: new Date("2026-11-14T00:00:00Z"),
      details: prospect,
    };
    const receipt = {
      operation: "savedContactVerification",
      prospectId: original.id,
      importedBy: original.createdBy,
      importedAt: original.createdAt.toISOString(),
      acceptedBy: "fixture-operator",
      acceptedAt: now.toISOString(),
      originalRevision: 0,
      identity: savedContactIdentitySchema.parse(prospect),
    };
    expect(savedContactReceiptMatches(receipt, original)).toBe(true);
    expect(
      savedContactReceiptMatches(receipt, {
        ...original,
        details: {
          ...prospect,
          product: "New checked product",
          timezone: "America/Los_Angeles",
        },
      }),
    ).toBe(true);
    for (const patch of [
      { email: "other@samplegoods.com" },
      { title: "CEO" },
      { emailVerifiedAt: now.toISOString() },
      { roleCheckedAt: now.toISOString() },
      { source: "manual" },
    ])
      expect(
        savedContactReceiptMatches(receipt, {
          ...original,
          details: { ...prospect, ...patch },
        }),
      ).toBe(false);
    expect(
      savedContactReceiptMatches(receipt, {
        ...original,
        createdBy: "manual-user",
      }),
    ).toBe(false);
  });
});
