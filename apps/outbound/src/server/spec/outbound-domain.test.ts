import { describe, expect, test } from "bun:test";
import {
  defaultPlaybook,
  deliveredBody,
  draftSimilarityIssues,
  inSendWindow,
  lintMessages,
  normalizeDomain,
  playbookSchema,
  prospectIssues,
  prospectSchema,
  renderHistoricalMessages as renderMessages,
  senderFor,
  senderIdentity,
  senderPool,
  settingsForSender,
  templateIssues,
} from "@/lib/outbound";
import {
  outreachMayStart,
  sendWindowClosesAt,
} from "@/lib/outbound-scheduling";
import { buildDraftPrompt } from "@/lib/outbound-writing";
import {
  legacyHistory,
  mapLegacyProspect,
  parseImport,
} from "@/server/app/outbound/import";
import {
  researchPolicyHash,
  writingPolicyHash,
} from "@/server/utils/outbound/shopping-policy";

const now = new Date("2026-11-09T17:00:00Z");
const settings = { ...defaultPlaybook, senderConfirmed: true };
const prospect = prospectSchema.parse({
  company: "Sample Goods",
  domain: "samplegoods.com",
  country: "US",
  name: "Jane Smith",
  first: "Jane",
  title: "Head of Growth",
  email: "jane@samplegoods.com",
  emailStatus: "verified",
  emailVerifiedAt: now.toISOString(),
  emailSource: "provider receipt 123",
  roleSource: "https://samplegoods.com/team",
  roleCheckedAt: now.toISOString(),
  timezone: "America/New_York",
  mxProvider: "google",
  mxCheckedAt: now.toISOString(),
  product: "Linen tote",
  productUrl: "https://samplegoods.com/products/tote",
  finding: "The page lists one size, but does not give its dimensions.",
  evidence: "Visible size options and product details inspected.",
  evidenceCheckedAt: now.toISOString(),
  legitEvidence:
    "Active physical product catalogue and business identity checked.",
});

describe("outbound eligibility", () => {
  test("the optional outreach date blocks both rails without changing research or copy", () => {
    const { outreachNotBefore: _date, ...legacy } = defaultPlaybook;
    expect(playbookSchema.parse(legacy).outreachNotBefore).toBeNull();
    expect(outreachMayStart({}, now)).toBe(true);
    const deferred = {
      ...settings,
      automationEnabled: true,
      linkedinAutomationEnabled: true,
      outreachNotBefore: "2026-12-02T00:00:00.000Z",
    };
    expect(
      outreachMayStart(deferred, new Date("2026-12-01T23:59:59.999Z")),
    ).toBe(false);
    expect(
      outreachMayStart(deferred, new Date(deferred.outreachNotBefore)),
    ).toBe(true);
    expect(
      outreachMayStart(deferred, new Date("2026-12-02T00:00:00.001Z")),
    ).toBe(true);
    expect(outreachMayStart({ outreachNotBefore: "invalid" }, now)).toBe(false);
    expect(
      playbookSchema.safeParse({ ...settings, outreachNotBefore: "invalid" })
        .success,
    ).toBe(false);
    expect(
      inSendWindow(prospect, new Date(deferred.outreachNotBefore), deferred),
    ).toBe(false);
    expect(prospectIssues(prospect, deferred, now)).toEqual(
      prospectIssues(prospect, settings, now),
    );
    expect(writingPolicyHash(deferred)).toBe(writingPolicyHash(settings));
    expect(researchPolicyHash(deferred)).toBe(researchPolicyHash(settings));
    expect(deferred.automationEnabled).toBe(true);
    expect(deferred.linkedinAutomationEnabled).toBe(true);
  });
  test("Microsoft recipients require an explicit opt-in and verified email evidence", () => {
    const microsoft = { ...prospect, mxProvider: "microsoft" as const };
    const optedIn = { ...settings, allowMicrosoftRecipients: true };
    expect(defaultPlaybook.allowMicrosoftRecipients).toBe(false);
    const { allowMicrosoftRecipients, ...legacy } = settings;
    expect(playbookSchema.parse(legacy).allowMicrosoftRecipients).toBe(false);
    expect(
      prospectIssues(microsoft, settings, now).map(({ code }) => code),
    ).toContain("microsoftHeld");
    expect(prospectIssues(microsoft, optedIn, now)).toEqual([]);
    for (const emailStatus of [
      "unknown",
      "guessed",
      "catchAll",
      "invalid",
      "stale",
    ] as const)
      expect(
        prospectIssues({ ...microsoft, emailStatus }, optedIn, now).map(
          ({ code }) => code,
        ),
      ).toContain("emailUnverified");
    for (const patch of [
      { mxProvider: "unknown" as const },
      { mxCheckedAt: "2026-11-07T17:00:00Z" },
    ])
      expect(
        prospectIssues({ ...microsoft, ...patch }, optedIn, now).map(
          ({ code }) => code,
        ),
      ).toContain("mxUnknown");
    expect(
      prospectIssues({ ...microsoft, emailVerifiedAt: "" }, optedIn, now).map(
        ({ code }) => code,
      ),
    ).toContain("emailUnverified");
  });
  test("explicit email caps allow51 up to100 without changing defaults", () => {
    expect(defaultPlaybook.dailyCap).toBe(15);
    for (const dailyCap of [51, 100])
      expect(playbookSchema.parse({ ...settings, dailyCap }).dailyCap).toBe(
        dailyCap,
      );
    for (const dailyCap of [0, 101, 1.5])
      expect(playbookSchema.safeParse({ ...settings, dailyCap }).success).toBe(
        false,
      );
  });
  test("unknown US timezone readiness follows only the explicit market-window preference", () => {
    const contact = { ...prospect, timezone: "" };
    const enabled = { ...settings, allowUsMarketWindow: true };
    expect(
      prospectIssues(contact, settings, now).some(
        ({ code }) => code === "timezoneMissing",
      ),
    ).toBe(true);
    expect(prospectIssues(contact, enabled, now)).toEqual([]);
    expect(
      prospectIssues({ ...contact, country: "UK" }, enabled, now).some(
        ({ code }) => code === "timezoneMissing",
      ),
    ).toBe(true);
    expect(contact.timezone).toBe("");
  });
  test("qualified fresh evidence clears the review gate", () => {
    expect(prospectIssues(prospect, settings, now)).toEqual([]);
    expect(lintMessages(renderMessages(prospect, settings), settings)).toEqual(
      [],
    );
  });
  test("subdomains deduplicate without collapsing public suffix companies", () => {
    expect(normalizeDomain("https://shop.example.co.uk/products/one")).toBe(
      "example.co.uk",
    );
    expect(normalizeDomain("www.example.co.uk")).toBe("example.co.uk");
    expect(normalizeDomain("another.co.uk")).not.toBe(
      normalizeDomain("example.co.uk"),
    );
    expect(normalizeDomain("https://user:secret@example.com")).toBe("");
    expect(normalizeDomain("127.0.0.1")).toBe("");
  });
  test("unknown, stale and guessed verification never passes", () => {
    for (const emailStatus of [
      "unknown",
      "guessed",
      "catchAll",
      "invalid",
      "stale",
    ] as const)
      expect(
        prospectIssues({ ...prospect, emailStatus }, settings, now).some(
          (issue) => issue.code === "emailUnverified",
        ),
      ).toBe(true);
    for (const emailVerifiedAt of [
      "",
      "2026-10-01T00:00:00Z",
      "2026-11-10T00:00:00Z",
    ])
      expect(
        prospectIssues({ ...prospect, emailVerifiedAt }, settings, now).some(
          (issue) => issue.code === "emailUnverified",
        ),
      ).toBe(true);
  });
  test("vendor labels without original receipt dates stay ineligible", () => {
    const imported = mapLegacyProspect({
      ...prospect,
      emailVerifiedAt: "",
      email_status: "tool-verified",
    });
    expect(imported.emailVerifiedAt).toBe("");
    expect(
      prospectIssues(imported, settings, now).map((issue) => issue.code),
    ).toContain("emailUnverified");
  });
  test("country, relationship, shared inbox, excluded title and Microsoft holds remain enforced", () => {
    const issues = prospectIssues(
      {
        ...prospect,
        country: "DE",
        relationship: "customer",
        email: "info@samplegoods.com",
        title: "Former Head of Growth",
        mxProvider: "microsoft",
      },
      settings,
      now,
    ).map((issue) => issue.code);
    expect(issues).toEqual(
      expect.arrayContaining([
        "countryHeld",
        "relationshipExcluded",
        "sharedInbox",
        "roleExcluded",
        "microsoftHeld",
      ]),
    );
    expect(
      prospectIssues(
        { ...prospect, timezone: "fake/timezone" },
        settings,
        now,
      ).map((issue) => issue.code),
    ).toContain("timezoneMissing");
  });
  test("only verified public web evidence URLs are accepted", () => {
    expect(
      prospectSchema.safeParse({
        ...prospect,
        roleSource: "javascript:alert(1)",
      }).success,
    ).toBe(false);
  });
});

describe("outbound concrete drafts", () => {
  test("batch review rejects duplicate subjects and personal sentences while exempting shared founder copy", () => {
    const first = renderMessages(prospect, settings);
    const same = draftSimilarityIssues(first, [first], settings).map(
      (issue) => issue.code,
    );
    expect(same).toEqual(
      expect.arrayContaining(["duplicateSubject", "repeatedSentence"]),
    );
    const second = renderMessages(
      {
        ...prospect,
        product: "Ceramic tumbler",
        finding: "I could not find its capacity on this page.",
      },
      settings,
    );
    expect(draftSimilarityIssues(second, [first], settings)).toEqual([]);
  });
  test("stable assignment uses all four configured inboxes regardless of list order", () => {
    const settings = {
      ...defaultPlaybook,
      senderEmails:
        "one@joinecentic.com\ntwo@joinecentic.com\nthree@joinecentic.com\nfour@joinecentic.com",
    };
    const reordered = {
      ...settings,
      senderEmails: settings.senderEmails.split("\n").reverse().join("\n"),
    };
    const assignments = Array.from({ length: 100 }, (_, index) =>
      senderFor(`prospect-${index}`, settings),
    );
    expect(new Set(assignments).size).toBe(4);
    expect(senderFor("prospect-17", reordered)).toBe(
      senderFor("prospect-17", settings),
    );
    expect(senderPool(defaultPlaybook)).toEqual([defaultPlaybook.fromEmail]);
  });
  test("secondary sender rendering and prompts cannot inherit the primary biography", () => {
    const identity = {
      email: "mario@joinecentic.com",
      fromName: "Mario",
      signature: "Mario",
      founderLine: "I'm Mario from ecentic.",
      productCheckIntro:
        "I'm Mario from ecentic. We help stores with product details.",
      voiceNotes: "Keep the wording friendly.",
    };
    const policy = {
      ...settings,
      fromName: "Iseld",
      signature: "Iseld",
      voiceNotes: "Write as Iseld, a former Shopify employee.",
      founderLine: "I'm Iseld, formerly with Shopify Plus.",
      productCheckIntro: "I'm Iseld, formerly with Shopify Plus.",
      senderProfiles: [identity],
    };
    const contact = { ...prospect, assignedSenderEmail: identity.email };
    const messages = renderMessages(contact, policy);
    expect(messages[0]?.body).toContain(identity.founderLine);
    expect(messages[0]?.body.endsWith("Mario")).toBe(true);
    expect(JSON.stringify(messages)).not.toMatch(/Iseld|Shopify Plus/);
    const selected = settingsForSender(policy, identity.email);
    const prompt = JSON.stringify(buildDraftPrompt(contact, selected));
    expect(prompt).toContain("actual author is Mario");
    expect(prompt).not.toContain("Write as Iseld");
    const wrong = messages.map((message) =>
      message.step === 1
        ? {
            ...message,
            body: message.body.replace(
              identity.founderLine,
              policy.founderLine,
            ),
          }
        : message,
    );
    expect(
      lintMessages(wrong, policy, contact).some(
        (issue) => issue.code === "templateControlsChanged",
      ),
    ).toBe(true);
    expect(senderIdentity("unknown@joinecentic.com", policy)).toBeNull();
    expect(
      settingsForSender(policy, "unknown@joinecentic.com").productCheckIntro,
    ).toBe("");
  });
  test("review and send use identical footer and quoted first-message text", () => {
    const messages = renderMessages(prospect, settings);
    const first = messages[0];
    const followup = messages[1];
    if (!first || !followup) throw new Error("Expected complete messages");
    expect(deliveredBody(first, first, settings.postalAddress)).toBe(
      `${first.body}\n\n${settings.postalAddress}`,
    );
    expect(deliveredBody(followup, first, settings.postalAddress)).toContain(
      `> ${settings.postalAddress}`,
    );
    expect(deliveredBody(followup, first, settings.postalAddress)).toContain(
      `> ${first.body.split("\n")[0]}`,
    );
  });
  test("all three steps are frozen with first-send anchored day offsets", () => {
    const messages = renderMessages(prospect, settings);
    expect(messages.map((message) => message.afterDays)).toEqual([0, 3, 7]);
    expect(messages[1]?.body).toBe("Bumping this!");
    expect(messages[2]?.body).toBe("Jane?");
    expect(renderMessages({ ...prospect, first: "" }, settings)[2]?.body).toBe(
      "Worth a chat?",
    );
  });
  test("untrusted prospect text cannot expand another template variable", () => {
    const messages = renderMessages(
      { ...prospect, product: "{signature}" },
      settings,
    );
    expect(messages[0]?.subject).toBe("{signature}");
    expect(
      lintMessages(messages, settings).map((issue) => issue.code),
    ).toContain("unresolvedVariable");
    expect(templateIssues("Hi {first}, {unknown}")).toEqual([
      { code: "unknownVariable", field: "unknown" },
    ]);
  });
  test("copy constraints catch added links, hype punctuation and overlength subjects", () => {
    const messages = renderMessages(prospect, settings);
    const first = messages[0];
    if (!first) throw new Error("Expected first draft");
    const issues = lintMessages(
      [
        {
          ...first,
          subject: "This subject contains far too many separate words",
          body: `${first.body}\nVisit https://example.com!`,
        },
      ],
      settings,
    ).map((issue) => issue.code);
    expect(issues).toEqual(
      expect.arrayContaining([
        "subjectLength",
        "link",
        "exclamation",
        "signatureMissing",
      ]),
    );
  });
  test("new editable controls backfill old settings safely", () => {
    const {
      voiceNotes: _voice,
      linkedinTemplate: _linkedin,
      historyConfirmed: _history,
      senderTested: _test,
      competingSendersPaused: _paused,
      dailyCompanyTarget: _companyTarget,
      ...old
    } = settings;
    const parsed = playbookSchema.parse(old);
    expect(parsed.linkedinTemplate).toContain("{first}");
    expect(parsed.senderTested).toBe(false);
    expect(parsed.dailyCompanyTarget).toBe(50);
    expect(parsed.dailyCap).toBe(settings.dailyCap);
    expect(parsed.weeklyTarget).toBe(settings.weeklyTarget);
  });
  test("daily company targets accept whole numbers without changing email limits", () => {
    for (const dailyCompanyTarget of [1, 50, 10000]) {
      const parsed = playbookSchema.parse({ ...settings, dailyCompanyTarget });
      expect(parsed.dailyCompanyTarget).toBe(dailyCompanyTarget);
      expect(parsed.dailyCap).toBe(settings.dailyCap);
      expect(parsed.weeklyTarget).toBe(settings.weeklyTarget);
    }
    for (const dailyCompanyTarget of [0, -1, 1.5, 10001, "50", null])
      expect(
        playbookSchema.safeParse({ ...settings, dailyCompanyTarget }).success,
      ).toBe(false);
  });
});

describe("outbound scheduling and import", () => {
  test.each([
    ["2026-03-02T17:23:45.678Z", "America/Chicago", "2026-03-02T20:00:00.000Z"],
    ["2026-03-09T17:23:45.678Z", "America/Chicago", "2026-03-09T19:00:00.000Z"],
    ["2026-10-26T17:23:45.678Z", "America/Chicago", "2026-10-26T19:00:00.000Z"],
    ["2026-11-02T17:23:45.678Z", "America/Chicago", "2026-11-02T20:00:00.000Z"],
    [
      "2026-11-25T19:23:45.678Z",
      "America/Los_Angeles",
      "2026-11-25T22:00:00.000Z",
    ],
    ["2026-11-09T03:23:45.678Z", "Asia/Kathmandu", "2026-11-09T08:15:00.000Z"],
  ])(
    "sending deadline follows the real timezone offset at %s (%s)",
    (at, timezone, deadline) => {
      const end = sendWindowClosesAt(timezone, new Date(at));
      expect(end?.toISOString()).toBe(deadline);
      expect(inSendWindow(timezone, new Date(Date.parse(deadline) - 1))).toBe(
        true,
      );
      expect(inSendWindow(timezone, new Date(deadline))).toBe(false);
    },
  );
  test("only currently eligible US market and known timezone windows have deadlines", () => {
    const policy = { allowUsMarketWindow: true };
    const now = new Date("2026-11-25T19:59:59.999Z");
    const market = { timezone: "", country: " US " };
    expect(sendWindowClosesAt(market, now, policy)?.toISOString()).toBe(
      "2026-11-25T21:00:00.000Z",
    );
    expect(
      sendWindowClosesAt("America/Chicago", now, policy)?.toISOString(),
    ).toBe("2026-11-25T20:00:00.000Z");
    expect(
      sendWindowClosesAt(
        "America/Chicago",
        new Date("2026-11-25T20:00:00Z"),
        policy,
      ),
    ).toBeNull();
    expect(sendWindowClosesAt(market, now)).toBeNull();
    expect(
      sendWindowClosesAt({ ...market, timezone: "invalid" }, now, policy),
    ).toBeNull();
    expect(
      sendWindowClosesAt({ ...market, country: "GB" }, now, policy),
    ).toBeNull();
    expect(
      sendWindowClosesAt(market, new Date("2026-11-27T19:00:00Z"), policy),
    ).toBeNull();
    expect(
      sendWindowClosesAt(
        "America/Los_Angeles",
        new Date("2026-11-25T15:59:59Z"),
        policy,
      ),
    ).toBeNull();
  });
  test.each(["2026-01-05", "2026-07-06"])(
    "US market-window boundaries are exact in winter and summer (%s)",
    (day) => {
      const location = { timezone: "", country: "US" };
      const policy = { allowUsMarketWindow: true };
      for (const [time, allowed] of [
        ["17:59:59", false],
        ["18:00:00", true],
        ["20:59:59", true],
        ["21:00:00", false],
      ] as const)
        expect(
          inSendWindow(location, new Date(`${day}T${time}Z`), policy),
        ).toBe(allowed);
      expect(location.timezone).toBe("");
    },
  );
  test("market scheduling is opt-in and never replaces a known or malformed timezone", () => {
    const at = new Date("2026-07-06T18:00:00Z");
    expect(defaultPlaybook.allowUsMarketWindow).toBe(false);
    expect(inSendWindow({ timezone: "", country: "US" }, at)).toBe(false);
    for (const country of [
      "UK",
      "GB",
      "United Kingdom",
      "",
      "CA",
      "US/CA",
      "US territory",
    ])
      expect(
        inSendWindow({ timezone: "", country }, at, {
          allowUsMarketWindow: true,
        }),
      ).toBe(false);
    expect(
      inSendWindow({ timezone: "America/New_York", country: "US" }, at, {
        allowUsMarketWindow: true,
      }),
    ).toBe(false);
    expect(
      inSendWindow({ timezone: "America/Los_Angeles", country: "US" }, at, {
        allowUsMarketWindow: true,
      }),
    ).toBe(true);
    expect(
      inSendWindow({ timezone: "invalid", country: "US" }, at, {
        allowUsMarketWindow: true,
      }),
    ).toBe(false);
    expect(
      inSendWindow(
        { timezone: "", country: "US" },
        new Date("2026-07-10T18:00:00Z"),
        { allowUsMarketWindow: true },
      ),
    ).toBe(false);
  });
  test("weekday and recipient-local boundaries are exact", () => {
    expect(
      inSendWindow("America/New_York", new Date("2026-11-09T12:59:59Z")),
    ).toBe(false);
    expect(
      inSendWindow("America/New_York", new Date("2026-11-09T13:00:00Z")),
    ).toBe(true);
    expect(
      inSendWindow("America/New_York", new Date("2026-11-09T19:00:00Z")),
    ).toBe(false);
    expect(
      inSendWindow("America/New_York", new Date("2026-11-13T17:00:00Z")),
    ).toBe(false);
    expect(
      inSendWindow("America/Los_Angeles", new Date("2026-07-06T15:00:00Z")),
    ).toBe(true);
  });
  test("CSV preserves escaped commas, quoted newlines and literal formula text", () => {
    expect(
      parseImport(
        'company,notes\n"Sample, Inc","First line\nSecond ""quote"""\nOther,=1+1',
      ),
    ).toEqual([
      { company: "Sample, Inc", notes: 'First line\nSecond "quote"' },
      { company: "Other", notes: "=1+1" },
    ]);
  });
  test("JSON and JSONL envelopes parse without trusting imported approvals", () => {
    expect(parseImport('{"prospects":[{"domain":"one.com"}]}')).toEqual([
      { domain: "one.com" },
    ]);
    expect(
      parseImport('{"domain":"one.com"}\n{"domain":"two.com"}'),
    ).toHaveLength(2);
    expect(
      mapLegacyProspect({
        ...prospect,
        approved: true,
        approvedAt: now.toISOString(),
      }),
    ).not.toHaveProperty("approved");
  });
  test("historic contact, reserved draft and bounce scopes survive import classification", () => {
    expect(legacyHistory({ tags: "draft-not-sent" }).contacted).toBe(true);
    expect(legacyHistory({ status: "bounced" }).bounced).toBe(true);
    expect(legacyHistory({ status: "unsubscribed" }).suppressed).toBe(true);
    expect(legacyHistory({ status: "draft" }).contacted).toBe(false);
  });
});
