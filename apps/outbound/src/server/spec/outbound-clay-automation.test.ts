import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { prospectSchema } from "@/lib/outbound";
import {
  clayContextHash,
  clayContinuationProblem,
  reviewClayRole,
} from "@/server/utils/outbound/clay-role";
import {
  clayFixtureRequest,
  clayFixtureResult,
} from "./helpers/outbound-clay-fixture";

describe("Clay current-role corroboration", () => {
  test("preserves human-review status and corroborates only exact source-bound role/team facts", () => {
    const request = clayFixtureRequest();
    const result = clayFixtureResult(request);
    expect(reviewClayRole(request, result).status).toBe("corroborated");
    expect(result.results[0]!.result.facts.requires_human_review).toBe(true);
    expect(
      result.results[0]!.result.facts.evidence.verification_receipt,
    ).toBeNull();
  });
  test.each([
    "wrong-person",
    "wrong-company",
    "wrong-title",
    "range",
    "unknown-count",
    "not-opened",
    "old",
    "future",
    "wrong-item",
    "partial",
  ])("holds %s rather than fabricating verification", (kind) => {
    const request = clayFixtureRequest();
    const result = clayFixtureResult(request);
    const facts = result.results[0]!.result.facts;
    switch (kind) {
      case "wrong-person":
        facts.person.source_url = "https://linkedin.com/in/someone-else";
        break;
      case "wrong-company":
        facts.person.current_company_domain = "other.test";
        break;
      case "wrong-title":
        facts.person.current_title = "Founder";
        break;
      case "range":
        facts.evidence.company.excerpt = "10–20 employees";
        break;
      case "unknown-count":
        facts.company.headcount = 0;
        break;
      case "not-opened":
        facts.evidence.person.source_opened_reported = false;
        break;
      case "old":
        facts.evidence.research_observed_at = new Date(
          Date.now() - 60000,
        ).toISOString();
        break;
      case "future":
        facts.evidence.research_observed_at = new Date(
          Date.now() + 60000,
        ).toISOString();
        break;
      case "wrong-item":
        result.results[0]!.id = crypto.randomUUID();
        break;
      case "partial":
        facts.item_status = "partial";
        break;
    }
    expect(reviewClayRole(request, result).status).toBe("held");
  });
});

describe("Clay saved-review continuation", () => {
  const fixture = () => {
    const observed = "2026-11-27T12:00:00.000Z";
    const checked = Date.parse("2026-11-27T12:01:00.000Z");
    const request = clayFixtureRequest();
    request.reservedAt = observed;
    const prospect = {
      id: request.prospectId,
      revision: request.prospectRevision,
      details: prospectSchema.parse({
        ...request.item.inputs,
        country: "US",
        linkedinUrl: request.item.inputs.linkedin_url,
        roleSource: request.item.inputs.linkedin_url,
        roleCheckedAt: observed,
      }),
    };
    request.contextHash = clayContextHash(prospect);
    const result = clayFixtureResult(request);
    const facts = result.results[0]!.result.facts;
    facts.evidence.research_observed_at = observed;
    facts.person.observed_at = observed.slice(0, 10);
    facts.company.headcount_observed_at = observed.slice(0, 10);
    return {
      prospect,
      checked,
      role: {
        request,
        requestedAt: observed,
        runId: result.runId,
        polls: 1,
        result,
        reviewed: reviewClayRole(request, result, checked),
      },
    };
  };

  test("retains November 27 evidence through December 2 without freshening any timestamps", () => {
    const { role, prospect } = fixture();
    const before = JSON.stringify(role);
    const december = Date.parse("2026-12-02T12:00:00.000Z");
    expect(reviewClayRole(role.request, role.result, december).status).toBe(
      "held",
    );
    expect(clayContinuationProblem(role, prospect, december)).toBeNull();
    expect(JSON.stringify(role)).toBe(before);
  });

  test("expires at the existing thirty-day role boundary using the source time, not the review time", () => {
    const { role, prospect } = fixture();
    const boundary = Date.parse(role.request.reservedAt) + 30 * 86_400_000;
    expect(clayContinuationProblem(role, prospect, boundary)).toBeNull();
    expect(clayContinuationProblem(role, prospect, boundary + 1)).toContain(
      "thirty days",
    );
  });

  test.each([
    "hash",
    "reason",
    "future",
    "before-request",
    "late-review",
    "source",
  ])(
    "rejects a tampered or invalid saved %s without rerunning Clay",
    (kind) => {
      const { role, prospect, checked } = fixture();
      switch (kind) {
        case "hash":
          role.reviewed.resultHash = "f".repeat(64);
          break;
        case "reason":
          role.reviewed.reason = "Replaced review reason";
          break;
        case "future":
          role.reviewed.checkedAt = new Date(checked + 1).toISOString();
          break;
        case "before-request":
          role.reviewed.checkedAt = new Date(
            Date.parse(role.requestedAt) - 1,
          ).toISOString();
          break;
        case "late-review":
          role.reviewed.checkedAt = "2026-12-02T12:00:00.000Z";
          break;
        case "source":
          role.result.results[0]!.result.facts.evidence.research_observed_at =
            new Date(checked + 1).toISOString();
          break;
      }
      const now =
        kind === "late-review" ? Date.parse(role.reviewed.checkedAt) : checked;
      expect(clayContinuationProblem(role, prospect, now)).not.toBeNull();
    },
  );
});

test("automatic Clay durable reservation, polling, holds and operational policy gates", async () => {
  const child = Bun.spawn(
    [
      process.execPath,
      "--no-env-file",
      resolve(import.meta.dir, "fixtures/outbound-clay-automation.fixture.ts"),
    ],
    { env: { ...process.env }, stdout: "pipe", stderr: "pipe" },
  );
  const [status, output, error] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  expect(error).toBe("");
  expect(status).toBe(0);
  expect(output).toContain("Automatic Clay fixture passed.");
}, 60000);
