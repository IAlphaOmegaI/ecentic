import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  defaultPlaybook,
  playbookSchema,
  settingsForSender,
} from "@/lib/outbound";
import {
  PROPOSED_REBUILD_PLAYBOOK,
  rebuildWritingProposal,
} from "@/lib/outbound-rebuild-policy";
import {
  discoveryFreshnessProblem,
  validateShoppingResearch,
} from "@/lib/outbound-shopping-research";
import {
  researchPolicyHash,
  writingPolicyHash,
} from "@/server/utils/outbound/shopping-policy";
import { writerFixture } from "./helpers/outbound-writer-fixture";

describe("explicit Playbook rebuild controls", () => {
  test("historical settings gain only empty lists and bounded research defaults", () => {
    const {
      queryStyle,
      searchesPerLead,
      discoveryFreshnessDays,
      relevanceLines,
      ...historical
    } = defaultPlaybook;
    const parsed = playbookSchema.parse(historical);
    expect(parsed.queryStyle).toBe("");
    expect(parsed.searchesPerLead).toBe(2);
    expect(parsed.discoveryFreshnessDays).toBe(7);
    expect(parsed.relevanceLines).toEqual([]);
    expect(parsed.bodyTemplate).toBe(historical.bodyTemplate);
    expect(
      playbookSchema.safeParse({ ...parsed, searchesPerLead: 3 }).success,
    ).toBe(false);
    expect(
      playbookSchema.safeParse({ ...parsed, searchesPerLead: 1.5 }).success,
    ).toBe(false);
    expect(
      playbookSchema.safeParse({ ...parsed, discoveryFreshnessDays: 8 })
        .success,
    ).toBe(false);
    expect(
      playbookSchema.safeParse({ ...parsed, relevanceLines: [""] }).success,
    ).toBe(false);
    expect([
      queryStyle,
      searchesPerLead,
      discoveryFreshnessDays,
      relevanceLines,
    ]).toEqual(["", 2, 7, []]);
  });

  test("loading the proposal preserves identities, controls and approved examples", () => {
    const profile = {
      email: "iseld@example.com",
      fromName: "Iseld",
      signature: "Iseld",
      founderLine: "I'm Iseld. My saved page introduction.",
      productCheckIntro: "I'm Iseld. My saved answer introduction.",
      voiceNotes: "Use short sentences.",
    };
    const settings = {
      ...defaultPlaybook,
      senderProfiles: [profile],
      sentEmailExamples: "An approved sequence.",
      queryStyle: "Prefer travel when supported.",
      searchesPerLead: 1 as const,
      discoveryFreshnessDays: 2,
    };
    const snapshot = structuredClone(settings);
    const proposed = rebuildWritingProposal(settings);
    expect(settings).toEqual(snapshot);
    expect(proposed).toMatchObject({
      fromName: settings.fromName,
      fromEmail: settings.fromEmail,
      signature: settings.signature,
      founderLine: settings.founderLine,
      productCheckIntro: settings.productCheckIntro,
      senderProfiles: settings.senderProfiles,
      sentEmailExamples: settings.sentEmailExamples,
      dailyCap: settings.dailyCap,
      sendingEnabled: settings.sendingEnabled,
      automationEnabled: settings.automationEnabled,
      linkedinAutomationEnabled: settings.linkedinAutomationEnabled,
      researchInstructions: settings.researchInstructions,
      queryStyle: settings.queryStyle,
      searchesPerLead: 1,
      discoveryFreshnessDays: 2,
    });
    expect(proposed.bodyTemplate).toBe(PROPOSED_REBUILD_PLAYBOOK.bodyTemplate);
    expect(proposed.voiceNotes).not.toContain("Iseld");
    expect(proposed.voiceNotes).not.toContain("Shopify Plus");
    expect(proposed.bannedPhrases).toContain("following up");
    expect(proposed.bannedPhrases).toContain("GEO");
    expect(proposed.relevanceLines).toEqual([
      ...PROPOSED_REBUILD_PLAYBOOK.relevanceLines,
    ]);
    expect(PROPOSED_REBUILD_PLAYBOOK.founderLine).toContain(
      "I left Shopify Plus",
    );
    expect(settingsForSender(proposed, profile.email).founderLine).toBe(
      profile.founderLine,
    );
    expect(playbookSchema.safeParse(proposed).success).toBe(true);
  });

  test("new default controls preserve the historical research hash; copy never changes it", () => {
    const historical = createHash("sha256")
      .update(
        JSON.stringify({
          instructions: defaultPlaybook.researchInstructions,
          required: defaultPlaybook.requireShoppingEvidence,
        }),
      )
      .digest("hex");
    expect(researchPolicyHash(defaultPlaybook)).toBe(historical);
    expect(researchPolicyHash(rebuildWritingProposal(defaultPlaybook))).toBe(
      historical,
    );
    for (const edited of [
      { ...defaultPlaybook, queryStyle: "Prefer a supported travel use." },
      { ...defaultPlaybook, searchesPerLead: 1 as const },
      { ...defaultPlaybook, discoveryFreshnessDays: 2 },
    ]) {
      expect(researchPolicyHash(edited)).not.toBe(historical);
      expect(writingPolicyHash(edited)).toBe(
        writingPolicyHash(defaultPlaybook),
      );
    }
  });

  test("a stricter discovery age cannot be waived by allowing old page evidence", () => {
    const receipt = structuredClone(writerFixture().receipt);
    const now = Date.now();
    const selected = receipt.queries[receipt.selected.queryIndex];
    if (!selected) throw new Error("Missing synthetic query");
    selected.executedAt = new Date(now - 2 * 86_400_000).toISOString();
    expect(discoveryFreshnessProblem(receipt, now, 7)).toBeNull();
    expect(discoveryFreshnessProblem(receipt, now, 1)).toContain("1 day");
    expect(
      validateShoppingResearch(receipt, 7, now, {
        allowStaleEvidence: true,
        discoveryFreshnessDays: 1,
      }),
    ).toContain("1 day");
    selected.executedAt = new Date(now - 8 * 86_400_000).toISOString();
    expect(discoveryFreshnessProblem(receipt, now, 50)).toContain("7 days");
    selected.executedAt = new Date(now + 1).toISOString();
    expect(discoveryFreshnessProblem(receipt, now, 7)).toContain(
      "future-dated",
    );
  });
});
