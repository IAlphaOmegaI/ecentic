import { describe, expect, mock, test } from "bun:test";
import { generateKeyPairSync } from "node:crypto";
import {
  defaultPlaybook,
  playbookSchema,
  registeredSender,
} from "@/lib/outbound";
import {
  assessMailboxReadiness,
  defaultWarmupPlan,
  planWarmup,
} from "@/lib/outbound-warmup";

mock.module("server-only", () => ({}));
const { checkSendingDomain } = await import(
  "@/server/utils/outbound/sender-readiness"
);
const missing = () =>
  Object.assign(new Error("No record"), { code: "ENODATA" });
const resolver = (records: Record<string, string[]> = {}) => ({
  resolveMx: async () => [{ exchange: "aspmx.l.google.com", priority: 1 }],
  resolveTxt: async (hostname: string) => {
    const answer = records[hostname];
    if (!answer) throw missing();
    return answer.map((record) => [record]);
  },
});
const publicKey = generateKeyPairSync("rsa", { modulusLength: 1024 })
  .publicKey.export({ format: "der", type: "spki" })
  .toString("base64");
const records = {
  "brand.com": ["v=spf1 include:_spf.google.com ~all"],
  "_dmarc.brand.com": ["v=DMARC1; p=none"],
  "google._domainkey.brand.com": [`v=DKIM1; k=rsa; p=${publicKey}`],
};

describe("sender readiness evidence", () => {
  test("records stay DNS observations rather than inbox or reputation evidence", async () => {
    const checked = await checkSendingDomain(
      { domain: "brand.com", dkimSelectors: ["google"] },
      resolver(records),
    );
    expect(checked.success).toBe(true);
    if (!checked.success) throw checked.error;
    expect(checked.data).toMatchObject({
      scope: "dns-records",
      inboxPlacement: "unknown",
      spf: { state: "present" },
      dkim: { state: "present" },
      dmarc: { state: "present", policy: "none", inherited: false },
    });
    const report = assessMailboxReadiness({
      domain: checked.data,
      connected: true,
      synchronized: true,
      providerError: false,
      historyConfirmed: true,
      senderTested: true,
    });
    expect(report).toMatchObject({
      status: "checksPassed",
      reputation: "unknown",
      inboxPlacement: "unknown",
    });
  });
  test("unknown DKIM selector never becomes missing or a claim that signing is disabled", async () => {
    const checked = await checkSendingDomain(
      { domain: "brand.com" },
      resolver(records),
    );
    expect(checked.success && checked.data.dkim.state).toBe("unknown");
  });
  test("DKIM joins strings within one TXT record without joining separate records", async () => {
    const encoded = generateKeyPairSync("rsa", { modulusLength: 2048 })
      .publicKey.export({ format: "der", type: "spki" })
      .toString("base64");
    const record = `v=DKIM1; k=rsa; p=${encoded}`;
    const chunks = [record.slice(0, 255), record.slice(255)];
    const base = resolver(records);
    const check = (answers: string[][]) =>
      checkSendingDomain(
        { domain: "brand.com", dkimSelectors: ["google"] },
        {
          ...base,
          resolveTxt: (hostname) =>
            hostname === "google._domainkey.brand.com"
              ? Promise.resolve(answers)
              : base.resolveTxt(hostname),
        },
      );
    const joined = await check([chunks]);
    expect(joined.success && joined.data.dkim).toMatchObject({
      state: "present",
      records: [record],
    });
    const separate = await check(chunks.map((chunk) => [chunk]));
    expect(separate.success && separate.data.dkim.state).toBe("invalid");
    const duplicate = await check([chunks, chunks]);
    expect(duplicate.success && duplicate.data.dkim.state).toBe("invalid");
  });
  test("multiple SPF records and permissive all are invalid", async () => {
    const multiple = await checkSendingDomain(
      { domain: "brand.com" },
      resolver({
        ...records,
        "brand.com": ["v=spf1 -all", "v=spf1 include:_spf.google.com -all"],
      }),
    );
    expect(multiple.success && multiple.data.spf.state).toBe("invalid");
    const permissive = await checkSendingDomain(
      { domain: "brand.com" },
      resolver({ ...records, "brand.com": ["v=spf1 +all"] }),
    );
    expect(permissive.success && permissive.data.spf.state).toBe("invalid");
  });
  test("DMARC falls back to organizational domain only after a known miss", async () => {
    const checked = await checkSendingDomain(
      { domain: "mail.brand.com" },
      resolver(records),
    );
    expect(checked.success && checked.data.dmarc).toMatchObject({
      state: "present",
      inherited: true,
      recordDomain: "brand.com",
    });
    const transient = await checkSendingDomain(
      { domain: "mail.brand.com" },
      {
        ...resolver(records),
        resolveTxt: async () => {
          throw Object.assign(new Error("Timeout"), { code: "ETIMEOUT" });
        },
      },
    );
    expect(transient.success && transient.data.dmarc).toMatchObject({
      state: "unknown",
      inherited: false,
    });
  });
  test("revoked DKIM key is invalid while unresolved lookup is unknown", async () => {
    const revoked = await checkSendingDomain(
      { domain: "brand.com", dkimSelectors: ["google"] },
      resolver({ ...records, "google._domainkey.brand.com": ["v=DKIM1; p="] }),
    );
    expect(revoked.success && revoked.data.dkim.state).toBe("invalid");
    const malformed = await checkSendingDomain(
      { domain: "brand.com", dkimSelectors: ["google"] },
      resolver({
        ...records,
        "google._domainkey.brand.com": ["v=DKIM1; p=MIIBtruncated"],
      }),
    );
    expect(malformed.success && malformed.data.dkim.state).toBe("invalid");
    expect(malformed.success && malformed.data.dkim.selectors).toEqual([
      "google",
    ]);
    const transient = await checkSendingDomain(
      { domain: "brand.com", dkimSelectors: ["google"] },
      {
        ...resolver(records),
        resolveTxt: async () => {
          throw Object.assign(new Error("Temporary"), { code: "ESERVFAIL" });
        },
      },
    );
    expect(transient.success && transient.data.dkim.state).toBe("unknown");
  });
  test("DMARC missing or unsupported policy is not passing", async () => {
    const missingPolicy = await checkSendingDomain(
      { domain: "brand.com" },
      resolver({ "brand.com": records["brand.com"] }),
    );
    expect(missingPolicy.success && missingPolicy.data.dmarc.state).toBe(
      "missing",
    );
    const invalidPolicy = await checkSendingDomain(
      { domain: "brand.com" },
      resolver({ ...records, "_dmarc.brand.com": ["v=DMARC1; p=allow"] }),
    );
    expect(invalidPolicy.success && invalidPolicy.data.dmarc.state).toBe(
      "invalid",
    );
  });
  test("MX null record is invalid and private/IP inputs are rejected before lookup", async () => {
    const nullMx = await checkSendingDomain(
      { domain: "brand.com" },
      {
        ...resolver(records),
        resolveMx: async () => [{ exchange: ".", priority: 0 }],
      },
    );
    expect(nullMx.success && nullMx.data.mx.state).toBe("invalid");
    for (const domain of [
      "localhost",
      "127.0.0.1",
      "host.internal",
      "https://brand.com",
      "brand.com/path",
      "brand.com\\path",
      "brand.com?query=value",
      "brand.com#fragment",
    ])
      expect(
        (await checkSendingDomain({ domain }, resolver(records))).success,
      ).toBe(false);
  });
  test.each([
    "brand.com/path",
    "brand.com\\path",
    "brand.com?query",
    "brand.com#fragment",
    "brand.com:443",
    "user@brand.com",
    "brand%2ecom",
    "brand.com\n/path",
    "bra\tnd.com",
  ])("rejects domain syntax before DNS lookup: %s", async (domain) => {
    const resolveMx = mock(async () => []);
    const resolveTxt = mock(async () => []);
    const checked = await checkSendingDomain(
      { domain },
      { resolveMx, resolveTxt },
    );
    expect(checked.success).toBe(false);
    expect(resolveMx).not.toHaveBeenCalled();
    expect(resolveTxt).not.toHaveBeenCalled();
  });
  test("normalizes a bare international domain before DNS lookup", async () => {
    const resolveMx = mock(async () => []);
    const checked = await checkSendingDomain(
      { domain: "  BÜCHER.DE  " },
      { ...resolver(), resolveMx },
    );
    expect(checked.success && checked.data.domain).toBe("xn--bcher-kva.de");
    expect(resolveMx).toHaveBeenCalledWith("xn--bcher-kva.de");
  });
});

describe("bounded warmup plan", () => {
  const capacity = {
    healthyDays: 10,
    policyDailyCap: 15,
    inboxDailyCap: 15,
    usedLast24Hours: 2,
    reservedFollowups: 3,
    providerHold: false,
  };
  test("all kinds of sending and reserved followups consume the same cap", () => {
    expect(
      planWarmup({ ...defaultWarmupPlan, enabled: true }, capacity),
    ).toMatchObject({ dailyCap: 12, remaining: 7 });
    expect(
      planWarmup(
        { ...defaultWarmupPlan, enabled: true },
        { ...capacity, inboxDailyCap: 4 },
      ),
    ).toMatchObject({ dailyCap: 4, remaining: 0 });
    expect(
      planWarmup(
        { ...defaultWarmupPlan, enabled: true },
        { ...capacity, policyDailyCap: 3 },
      ),
    ).toMatchObject({ dailyCap: 3, remaining: 0 });
  });
  test("off or held plans grant no capacity and healthy-day count never exceeds policy", () => {
    expect(planWarmup(defaultWarmupPlan, capacity).remaining).toBe(0);
    expect(
      planWarmup(
        { ...defaultWarmupPlan, enabled: true },
        { ...capacity, providerHold: true },
      ).remaining,
    ).toBe(0);
    expect(
      planWarmup(
        { ...defaultWarmupPlan, enabled: true },
        { ...capacity, healthyDays: 100 },
      ).dailyCap,
    ).toBe(15);
  });
  test("negative observations and an inverted plan are rejected", () => {
    expect(() =>
      planWarmup(defaultWarmupPlan, { ...capacity, usedLast24Hours: -1 }),
    ).toThrow();
    expect(() =>
      planWarmup(
        { ...defaultWarmupPlan, initialDailyCap: 15, maximumDailyCap: 2 },
        capacity,
      ),
    ).toThrow();
  });
});

describe("explicit sender registration across domains", () => {
  const settings = playbookSchema.parse({
    ...defaultPlaybook,
    senderEmails: "juri@new-brand.com",
    inactiveSenderEmails: "iseld@second-brand.com",
  });
  test("accepts configured addresses without authorizing an entire domain", () => {
    expect(registeredSender(" JURI@NEW-BRAND.COM ", settings)).toBe(true);
    expect(registeredSender("iseld@second-brand.com", settings)).toBe(true);
    expect(registeredSender("other@new-brand.com", settings)).toBe(false);
    expect(registeredSender("someone@joinecentic.com", settings)).toBe(false);
  });
  test("malformed or overlapping pool addresses are rejected", () => {
    expect(
      playbookSchema.safeParse({ ...settings, senderEmails: "not an email" })
        .success,
    ).toBe(false);
    expect(
      playbookSchema.safeParse({
        ...settings,
        inactiveSenderEmails: "JURI@NEW-BRAND.COM",
      }).success,
    ).toBe(false);
    expect(
      playbookSchema.safeParse({ ...settings, inactiveSenderEmails: "invalid" })
        .success,
    ).toBe(false);
  });
});
