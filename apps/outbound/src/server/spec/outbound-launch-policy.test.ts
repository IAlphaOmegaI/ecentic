import { describe, expect, test } from "bun:test";
import {
  companyExcluded,
  countWords,
  defaultPlaybook,
  draftSimilarityIssues,
  lintMessages,
  personalLineForDraft,
  personalSourceReadyForDraft,
  playbookSchema,
  prospectIssues,
  prospectSchema,
  renderMessages,
  senderFor,
  senderPool,
} from "@/lib/outbound";
import {
  buildDraftPrompt,
  preservesDraftControls,
} from "@/lib/outbound-writing";
import { mapLegacyProspect } from "@/server/app/outbound/import";

const now = new Date("2026-11-14T12:00:00Z");
const settings = playbookSchema.parse({
  ...defaultPlaybook,
  senderEmails:
    "xhuri@joinecentic.com\nmario@joinecentic.com\narbi@joinecentic.com\nalvi@joinecentic.com",
  inactiveSenderEmails: "iseld@joinecentic.com",
  senderConfirmed: true,
  emailVerificationDays: 30,
  verificationDays: 7,
  firstEmailBlockedClaims: "TUI\nCostco\nPasona",
  bodyTemplate:
    "Hi {first}! {personalLine}\n\nI was looking at {product} on your site and noticed {finding}. So when someone asks an AI assistant {askAbout}, {consequence}.\n\n{founderLine} {callToAction}\n\n({optout})\n\n{signature}",
});
const prospect = prospectSchema.parse({
  company: "Sample Goods",
  domain: "samplegoods.com",
  country: "US",
  platform: "shopify",
  name: "Jane Smith",
  first: "Jane",
  title: "Head of Growth",
  email: "jane@samplegoods.com",
  emailStatus: "verified",
  emailVerifiedAt: "2026-10-25T12:00:00Z",
  emailSource: "verifier valid receipt 123",
  roleSource: "https://samplegoods.com/team",
  roleCheckedAt: now.toISOString(),
  timezone: "America/New_York",
  mxProvider: "google",
  mxCheckedAt: now.toISOString(),
  product: "Linen Tote",
  productUrl: "https://samplegoods.com/products/tote",
  gap: "barcode-missing-from-page-data",
  finding: "Untrusted loose prose is not the configured observation.",
  evidence:
    "Staff checked raw and rendered product data and the matching retail product.",
  evidenceCheckedAt: "2026-11-10T12:00:00Z",
  findingReviewed: true,
  distributionSource: "https://retailer.example/products/tote",
  legitEvidence: "Team of 4, source https://samplegoods.com/team",
});

describe("November cold-launch policy", () => {
  test("inactive identity is retained but cannot enter rotation", () => {
    expect(senderPool(settings)).toHaveLength(4);
    for (const id of ["a", "b", "c", "d", "another-company"])
      expect(senderFor(id, settings)).not.toBe("iseld@joinecentic.com");
    expect(
      playbookSchema.safeParse({
        ...settings,
        inactiveSenderEmails: settings.fromEmail,
      }).success,
    ).toBe(false);
  });
  test("email age is separate from product review age", () => {
    expect(prospectIssues(prospect, settings, now)).toEqual([]);
    expect(
      prospectIssues({ ...prospect, platform: "unknown" }, settings, now).map(
        (issue) => issue.code,
      ),
    ).toContain("platformHeld");
    expect(
      prospectIssues(
        { ...prospect, evidenceCheckedAt: "2026-11-06T12:00:00Z" },
        settings,
        now,
      ).map((issue) => issue.code),
    ).toContain("evidenceMissing");
    expect(
      prospectIssues(
        { ...prospect, emailVerifiedAt: "2026-10-14T12:00:00Z" },
        settings,
        now,
      ).map((issue) => issue.code),
    ).toContain("emailUnverified");
    expect(
      playbookSchema.safeParse({ ...settings, verificationDays: 30 }).success,
    ).toBe(false);
  });
  test("uses fixed observation and consequence and rejects stronger copy", () => {
    const messages = renderMessages(prospect, settings);
    const first = messages[0];
    if (!first) throw new Error("Expected a rendered first email.");
    expect(first.body).toContain(settings.barcodeObservation);
    expect(first.body).not.toContain(prospect.finding);
    expect(lintMessages(messages, settings, prospect)).toEqual([]);
    const changed = first.body.replace(
      settings.barcodeConsequence,
      "you will lose sales",
    );
    expect(
      preservesDraftControls(changed, first.body, settings, prospect),
    ).toBe(false);
    expect(
      lintMessages(
        [{ ...first, body: changed }, ...messages.slice(1)],
        settings,
        prospect,
      ).map((issue) => issue.code),
    ).toContain("findingCopyChanged");
  });
  test("retaining the fixed phrases cannot conceal an appended stronger claim", () => {
    const messages = renderMessages(prospect, settings);
    const first = messages[0];
    if (!first) throw new Error("Expected a rendered first email.");
    const body = first.body.replace(
      settings.barcodeConsequence,
      `${settings.barcodeConsequence}. This guarantees your store loses sales`,
    );
    expect(preservesDraftControls(body, first.body, settings, prospect)).toBe(
      false,
    );
    expect(
      lintMessages(
        [{ ...first, body }, ...messages.slice(1)],
        settings,
        prospect,
      ).map((issue) => issue.code),
    ).toContain("findingCopyChanged");
  });
  test("manual structured drafts retain the exact founder and closing paragraph", () => {
    const messages = renderMessages(prospect, settings);
    const first = messages[0];
    if (!first) throw new Error("Expected a rendered first email.");
    for (const body of [
      first.body.replace(
        settings.founderLine,
        "I left Shopify Plus to start ecentic.",
      ),
      first.body.replace(settings.callToAction, "Book a meeting today."),
      first.body.replace(
        settings.callToAction,
        `${settings.callToAction} We guarantee sales.`,
      ),
    ]) {
      expect(preservesDraftControls(body, first.body, settings, prospect)).toBe(
        false,
      );
      expect(
        lintMessages(
          [{ ...first, body }, ...messages.slice(1)],
          settings,
          prospect,
        ).map((issue) => issue.code),
      ).toContain("templateControlsChanged");
    }
  });
  test("only the optional personal opening is omitted when the full founder formula exceeds the limit", () => {
    const policy = {
      ...settings,
      founderLine:
        "I'm Juri, I started ecentic with a cofounder from Shopify Plus, and we fix exactly this.",
    };
    const personal = {
      ...prospect,
      personalLine: "Saw your retail launch and the new packaging last month.",
    };
    const messages = renderMessages(personal, policy);
    const first = messages[0];
    if (!first) throw new Error("Expected a rendered first email.");
    expect(countWords(first.body)).toBeLessThanOrEqual(policy.maxBodyWords);
    expect(first.body).not.toContain(personal.personalLine);
    expect(first.body).toContain(policy.founderLine);
    expect(first.body).toContain(policy.barcodeConsequence);
    expect(personalLineForDraft(personal, policy)).toBe("");
    expect(personalSourceReadyForDraft(personal, policy, now)).toBe(true);
    expect(prospectIssues(personal, policy, now)).toEqual([]);
    expect(lintMessages(messages, policy, personal)).toEqual([]);
    expect(
      preservesDraftControls(first.body, first.body, policy, personal),
    ).toBe(true);
    const prompt = JSON.parse(buildDraftPrompt(personal, policy).prompt);
    expect(prompt.personalLine).toBe("");
    expect(prompt.personalSource).toBe("");
    expect(first.body).toBe(
      renderMessages({ ...personal, personalLine: "" }, policy)[0]?.body ?? "",
    );
    expect(messages.slice(1)).toEqual(
      renderMessages(prospect, policy).slice(1),
    );
    const tighter = { ...policy, maxBodyWords: 80 };
    expect(renderMessages(personal, tighter)[0]?.body).toBe(first.body);
    expect(
      lintMessages(renderMessages(personal, tighter), tighter, personal).map(
        (issue) => issue.code,
      ),
    ).toContain("wordLimit");
  });
  test("fixed boilerplate is reusable but duplicated personal copy still requires review", () => {
    const first = renderMessages(prospect, settings);
    const other = {
      ...prospect,
      company: "Second Brand",
      name: "Pat Stone",
      first: "Pat",
      product: "Trail Shoes",
    };
    expect(
      draftSimilarityIssues(renderMessages(other, settings), [first], settings),
    ).toEqual([]);
    const reviews = {
      ...prospect,
      gap: "rating-missing-from-page-data",
      reviewCount: "214",
      productCategory: "linen tote",
    };
    expect(
      draftSimilarityIssues(
        renderMessages(
          {
            ...reviews,
            ...other,
            gap: reviews.gap,
            productCategory: reviews.productCategory,
            reviewCount: reviews.reviewCount,
          },
          settings,
        ),
        [renderMessages(reviews, settings)],
        settings,
      ),
    ).toEqual([]);
    const personalLine = "Saw your new packaging and recent retail launch.";
    expect(personalLineForDraft({ ...prospect, personalLine }, settings)).toBe(
      personalLine,
    );
    expect(
      draftSimilarityIssues(
        renderMessages({ ...other, personalLine }, settings),
        [renderMessages({ ...prospect, personalLine }, settings)],
        settings,
      ).map((issue) => issue.code),
    ).toContain("repeatedSentence");
  });
  test("requires supported finding, explicit review and cross-retailer evidence", () => {
    for (const patch of [
      { gap: "unknown" },
      { findingReviewed: false },
      { distributionSource: "" },
    ])
      expect(
        prospectIssues({ ...prospect, ...patch }, settings, now).map(
          (issue) => issue.code,
        ),
      ).toContain("findingReviewRequired");
    expect(
      mapLegacyProspect({ ...prospect, findingReviewed: true }).findingReviewed,
    ).toBe(false);
  });
  test("review counts and categories must come from saved facts", () => {
    const reviews = { ...prospect, gap: "rating-missing-from-page-data" };
    expect(
      prospectIssues(reviews, settings, now).map((issue) => issue.code),
    ).toContain("findingReviewRequired");
    const complete = {
      ...reviews,
      reviewCount: "214",
      productCategory: "linen tote",
    };
    expect(prospectIssues(complete, settings, now)).toEqual([]);
    expect(renderMessages(complete, settings)[0]?.body).toContain(
      "214 reviews",
    );
  });
  test("personal opening requires recent source review and publication", () => {
    const personal = {
      ...prospect,
      personalLine: "Saw your new retail launch.",
      personalSource: "https://samplegoods.com/news",
    };
    expect(
      prospectIssues(personal, settings, now).map((issue) => issue.code),
    ).toContain("personalSourceMissing");
    expect(
      prospectIssues(
        {
          ...personal,
          personalPublishedAt: "2026-09-01T12:00:00Z",
          personalCheckedAt: now.toISOString(),
        },
        settings,
        now,
      ),
    ).toEqual([]);
  });
  test("company name exclusions are normalized identities, not platform keywords", () => {
    const policy = {
      ...settings,
      excludedCompanies: "WooCommerce\nMe Zemër\nHP",
    };
    expect(companyExcluded(policy, "Me Zemer")).toBe(true);
    expect(companyExcluded(policy, "WooCommerce")).toBe(true);
    expect(companyExcluded(policy, "Acme WooCommerce Store")).toBe(false);
    expect(companyExcluded(policy, "Shop Happy")).toBe(false);
  });
  test("first emails cannot add pilot names or percentage proof", () => {
    const messages = renderMessages(prospect, settings);
    for (const claim of ["We work with Costco.", "We increased visits 12%."])
      expect(
        lintMessages(
          messages.map((message) =>
            message.step === 1
              ? { ...message, body: `${claim}\n${message.body}` }
              : message,
          ),
          settings,
          prospect,
        ).map((issue) => issue.code),
      ).toContain("claimNotAllowed");
  });
});
