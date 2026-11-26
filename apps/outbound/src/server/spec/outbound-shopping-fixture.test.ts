import { describe, expect, mock, test } from "bun:test";
import { defaultPlaybook, prospectSchema } from "@/lib/outbound";
import {
  assembleSequence,
  preflightWriterAssembly,
} from "@/lib/outbound-composition";
import { deterministicCopyIssues } from "@/lib/outbound-copy-quality";
import {
  deriveWriterNarrative,
  validateWriterParts,
} from "@/lib/outbound-writing";
import {
  buildSyntheticShoppingEvidence,
  syntheticWriterParts,
  syntheticWritingPolicy,
} from "./helpers/outbound-shopping-fixture";

mock.module("server-only", () => ({}));

describe("full synthetic shopping fixture", () => {
  test("binds the real fact validator to the requested merchant and original raw captures", async () => {
    const capture = await buildSyntheticShoppingEvidence({
      prospect: {
        company: "Sample Goods",
        domain: "samplegoods.com",
        product: "Linen tote",
        productUrl: "https://samplegoods.com/products/tote",
      },
    });
    const Assessment = await import(
      "@/server/utils/outbound/shopping-assessment"
    );
    expect(
      Assessment.validateAutomaticResearch(
        capture.evidence,
        capture.receipt,
        7,
      ),
    ).toBeNull();
    expect(capture.receipt.discovery?.merchantPresent).toBe(false);
    expect(capture.receipt.discovery?.totalListed).toBe(2);
    expect(capture.evidence.answer.job.query.merchant?.domain).toBe(
      "samplegoods.com",
    );
    expect(
      capture.receipt.claims?.some(
        (claim) =>
          claim.kind === "product-attribute" && claim.value === "large",
      ),
    ).toBe(true);
    const altered = structuredClone(capture.evidence);
    const firstRaw = altered.answer.raw[0];
    if (!firstRaw) throw new Error("Fixture raw capture missing");
    firstRaw.body += "tampered";
    expect(
      Assessment.validateAutomaticResearch(altered, capture.receipt, 7),
    ).not.toBeNull();
  });
  test("fixture writing policy retains the author and every inbox profile", () => {
    const profile = {
      email: "other@joinecentic.com",
      fromName: "Other Author",
      signature: "Other Author",
      founderLine: "I'm Other Author. I founded a store.",
      productCheckIntro: "I'm Other Author.",
      voiceNotes: "Short.",
    };
    const settings = { ...defaultPlaybook, senderProfiles: [profile] };
    const policy = syntheticWritingPolicy(settings);
    expect(policy.fromName).toBe(settings.fromName);
    expect(policy.founderLine).toBe(settings.founderLine);
    expect(policy.senderProfiles).toEqual(settings.senderProfiles);
  });
  test("injected copy variants meet the actual deterministic writer and variety gates", async () => {
    const prospect = prospectSchema.parse({
      company: "Sample Goods",
      country: "US",
      name: "Jane Smith",
      domain: "samplegoods.com",
      first: "Jane",
      product: "Linen tote",
      productUrl: "https://samplegoods.com/products/tote",
    });
    const { receipt } = await buildSyntheticShoppingEvidence({ prospect });
    const playbook = syntheticWritingPolicy(defaultPlaybook);
    const preflight = preflightWriterAssembly(prospect, receipt, playbook);
    if (preflight.status !== "ready") throw new Error(preflight.reason);
    const peers: {
      opening: string;
      relationship: string | null;
      occasion: string | null;
    }[] = [];
    for (const variant of Array.from({ length: 10 }, (_, index) => index)) {
      const parts = syntheticWriterParts(prospect, receipt, variant);
      const context = {
        prospect,
        receipt,
        playbook,
        peers,
        budget: preflight.budget,
      };
      expect(validateWriterParts({ ...context, parts })).toEqual([]);
      const assembled = assembleSequence(prospect, receipt, playbook, parts);
      if (assembled.status !== "ready") throw new Error(assembled.reason);
      expect(
        deterministicCopyIssues({
          ...context,
          parts,
          messages: assembled.messages,
        }),
      ).toEqual([]);
      const narrative = deriveWriterNarrative(
        parts.opening,
        receipt.queries[0]?.query,
      );
      peers.unshift({
        opening: parts.opening,
        relationship: narrative.relationship,
        occasion: narrative.occasion,
      });
    }
  });
});
