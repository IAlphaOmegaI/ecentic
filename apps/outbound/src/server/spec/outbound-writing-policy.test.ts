import { describe, expect, test } from "bun:test";
import {
  defaultPlaybook,
  prospectSchema,
  settingsForSender,
} from "@/lib/outbound";
import {
  compositionProspectHash,
  legacyWritingPolicyHash,
  researchPolicyHash,
  writingPolicyHash,
} from "@/server/utils/outbound/shopping-policy";

describe("independent writing policy identity", () => {
  test("fresh verification dates reuse copy while recipient identity edits do not", () => {
    const prospect = prospectSchema.parse({
      company: "Sample Goods",
      domain: "samplegoods.test",
      country: "US",
      first: "Jamie",
      name: "Jamie Smith",
    });
    expect(
      compositionProspectHash({
        ...prospect,
        mxCheckedAt: new Date().toISOString(),
        roleCheckedAt: new Date().toISOString(),
      }),
    ).toBe(compositionProspectHash(prospect));
    expect(compositionProspectHash({ ...prospect, first: "Alex" })).not.toBe(
      compositionProspectHash(prospect),
    );
  });
  test("copy edits invalidate writing without pretending a search was redone", () => {
    const original = {
      ...defaultPlaybook,
      relevanceLines: ["That's the kind of search a new customer starts with."],
    };
    const edits = [
      { ...original, voiceNotes: "Use shorter sentences." },
      { ...original, humanizerNotes: "Preserve approximation words." },
      { ...original, relevanceLines: ["The first names get the first look."] },
      { ...original, maxBodyWords: 98 },
      {
        ...original,
        barcodeConsequence: "A changed page-data reasoning rule.",
      },
      { ...original, followupOneTemplate: "A changed follow-up template." },
    ];
    for (const edited of edits) {
      expect(writingPolicyHash(edited)).not.toBe(writingPolicyHash(original));
      expect(researchPolicyHash(edited)).toBe(researchPolicyHash(original));
    }
    expect(
      writingPolicyHash({
        ...original,
        sendingEnabled: !original.sendingEnabled,
      }),
    ).toBe(writingPolicyHash(original));
  });

  test("historical policy verification is explicit and cannot reuse a v1 key for new copy", () => {
    const original = structuredClone(defaultPlaybook);
    const legacy = legacyWritingPolicyHash(original);
    expect(legacy).not.toBe(writingPolicyHash(original));
    expect(legacyWritingPolicyHash(original)).toBe(legacy);
    expect(original).toEqual(defaultPlaybook);
  });

  test("shared style edits change a secondary author's key without changing that author's biography", () => {
    const policy = {
      ...defaultPlaybook,
      fromEmail: "iseld@example.com",
      voiceNotes: "Write as Iseld. Keep sentences short.",
      senderProfiles: [
        {
          email: "mario@example.com",
          fromName: "Mario",
          signature: "Mario",
          founderLine: "I'm Mario, a founder of ecentic.",
          productCheckIntro: "I'm Mario, a founder of ecentic.",
          voiceNotes: "Write plainly as Mario.",
        },
      ],
    };
    const first = settingsForSender(policy, "mario@example.com");
    const changed = {
      ...policy,
      voiceNotes: "Write as Iseld. Start with the saved search.",
    };
    const second = settingsForSender(changed, "mario@example.com");
    expect(first.founderLine).toBe(second.founderLine);
    expect(second.founderLine).not.toContain("Iseld");
    expect(second.founderLine).not.toContain("Shopify");
    expect(
      writingPolicyHash(first, { globalVoiceNotes: policy.voiceNotes }),
    ).not.toBe(
      writingPolicyHash(second, { globalVoiceNotes: changed.voiceNotes }),
    );
    expect(researchPolicyHash(policy)).toBe(researchPolicyHash(changed));
  });
});
