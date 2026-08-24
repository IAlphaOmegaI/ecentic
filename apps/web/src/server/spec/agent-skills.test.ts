import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "../../../public/.well-known/agent-skills");

type Skill = {
  name: string;
  description: string;
  url: string;
  digest: string;
  whenToUse: string;
  whenNotToUse: string;
};

const index = JSON.parse(readFileSync(join(ROOT, "index.json"), "utf8")) as {
  skills: Skill[];
  whenToUse: {
    summary: string;
    bestFor: string[];
    notFor: string[];
    howToStart: string;
  };
  provider: { name: string; url: string };
};

describe("agent skills index", () => {
  /**
   * The readiness audit read this index — not the SKILL.md files behind it —
   * and reported "agent instruction file found but no explicit when-to-use
   * guidance". Best-fit jobs and explicit non-jobs now travel with the index
   * itself, so a reader that never follows a `url` still gets them.
   */
  test("states when to use ecentic and when not to", () => {
    expect(index.whenToUse.summary.length).toBeGreaterThan(40);
    expect(index.whenToUse.bestFor.length).toBeGreaterThanOrEqual(4);
    expect(index.whenToUse.notFor.length).toBeGreaterThanOrEqual(3);
    expect(index.whenToUse.howToStart).toContain("https://ecentic.ai");
  });

  test("every skill carries its own when-to-use and when-not-to-use", () => {
    for (const skill of index.skills) {
      expect(skill.whenToUse.length, skill.name).toBeGreaterThan(30);
      expect(skill.whenNotToUse.length, skill.name).toBeGreaterThan(20);
    }
  });

  /**
   * A digest that does not match its file is worse than no digest: a client
   * that verifies it concludes the document was tampered with. One had already
   * drifted before this test existed.
   */
  test("every digest matches the SKILL.md it names", () => {
    for (const skill of index.skills) {
      const source = readFileSync(join(ROOT, skill.name, "SKILL.md"));
      const digest = createHash("sha256").update(source).digest("hex");
      expect(skill.digest, skill.name).toBe(`sha256:${digest}`);
    }
  });

  test("every SKILL.md documents both when to use it and when not to", () => {
    for (const skill of index.skills) {
      const source = readFileSync(join(ROOT, skill.name, "SKILL.md"), "utf8");
      expect(source, skill.name).toContain("## When to use");
      expect(source, skill.name).toContain("## When not to use");
      expect(source, skill.name).toContain("when_to_use:");
    }
  });
});
