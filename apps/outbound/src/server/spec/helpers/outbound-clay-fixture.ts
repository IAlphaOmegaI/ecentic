import { randomUUID } from "node:crypto";
import {
  type ClayRoleRequest,
  clayRoleRequestSchema,
} from "@/lib/outbound-clay";

/** Synthetic contract-only recommendation, never a real Clay or email-verification receipt. */
export const clayFixtureRequest = () => {
  const id = randomUUID();
  return clayRoleRequestSchema.parse({
    contractVersion: "1",
    routineId: "workflow:synthetic",
    credentialVersion: "a".repeat(64),
    prospectId: id,
    prospectRevision: 1,
    contextHash: "b".repeat(64),
    reservedAt: new Date().toISOString(),
    item: {
      id,
      inputs: {
        domain: "samplegoods.test",
        company: "Sample Goods",
        name: "Jamie Smith",
        title: "Head of Ecommerce",
        email: "jamie@samplegoods.test",
        linkedin_url: "https://www.linkedin.com/in/jamie-smith",
      },
    },
  });
};
export const clayFixtureResult = (
  request: ClayRoleRequest,
  runId = "synthetic-run",
) => {
  const observed = new Date().toISOString();
  const facts = {
    routine: "ecentic_role_team_check",
    routine_version: "1",
    item_status: "completed",
    outcome: "pass",
    reason_codes: ["PASS"],
    scope: "role_and_team_only",
    requires_human_review: true,
    person: {
      is_current: "yes",
      current_title: request.item.inputs.title,
      current_company_domain: request.item.inputs.domain,
      role_match: "match",
      role_category: "ecommerce",
      linkedin_url: request.item.inputs.linkedin_url,
      source_url:
        request.item.inputs.linkedin_url ||
        `https://${request.item.inputs.domain}/team`,
      source_provider: "Clay web research",
      observed_at: observed.slice(0, 10),
      uncertainty: null,
    },
    company: {
      headcount: 10,
      headcount_source: `Clay web research, https://${request.item.inputs.domain}/about`,
      headcount_observed_at: observed.slice(0, 10),
    },
    evidence: {
      kind: "public_source_research",
      observation_clock: "workflow_runtime",
      verification_receipt: null,
      research_observed_at: observed,
      person: {
        excerpt: `${request.item.inputs.name}, ${request.item.inputs.title} at ${request.item.inputs.company}`,
        source_opened_reported: true,
      },
      company: {
        excerpt: "Our team has 10 employees.",
        source_opened_reported: true,
        reported_headcount_type: "exact",
        uncertainty: null,
      },
    },
  };
  return {
    runId,
    status: "complete" as const,
    results: [
      { id: request.item.id, status: "complete" as const, result: { facts } },
    ],
    cursor: null,
    total: 1 as const,
    finished: 1,
    retryAfterSeconds: 30,
  };
};
