import { createHash } from "node:crypto";
import { z } from "zod";
import { normalizeDomain, type ProspectInput } from "@/lib/outbound";
import {
  type ClayRoleRequest,
  type ClayRoleState,
  clayRoleResultSchema,
  clayRoleStateSchema,
} from "@/lib/outbound-clay";

export const clayHash = (value: unknown) =>
  createHash("sha256")
    .update(JSON.stringify(value ?? null))
    .digest("hex");
export const clayRoleInputs = (details: ProspectInput) => ({
  domain: normalizeDomain(details.domain),
  name: details.name,
  linkedin_url: details.linkedinUrl,
  email: details.email,
  title: details.title,
  company: details.company,
});
export const clayContextHash = (prospect: {
  id: string;
  revision: number;
  details: ProspectInput;
}) =>
  clayHash({
    id: prospect.id,
    revision: prospect.revision,
    inputs: clayRoleInputs(prospect.details),
    evidence: {
      shoppingResearchId: prospect.details.shoppingResearchId,
      automationEvidenceId: prospect.details.automationEvidenceId,
      product: prospect.details.product,
      productUrl: prospect.details.productUrl,
      emailStatus: prospect.details.emailStatus,
      emailSource: prospect.details.emailSource,
      emailVerifiedAt: prospect.details.emailVerifiedAt,
      roleSource: prospect.details.roleSource,
      roleCheckedAt: prospect.details.roleCheckedAt,
      mxProvider: prospect.details.mxProvider,
    },
  });
const text = z.string().min(1).max(2000);
const factsSchema = z.object({
  routine: z.literal("ecentic_role_team_check"),
  routine_version: z.literal("1"),
  item_status: z.enum(["completed", "partial", "failed"]),
  outcome: z.enum(["pass", "hold", "exclude"]).nullable(),
  reason_codes: z.array(z.string()).max(20),
  scope: z.literal("role_and_team_only"),
  requires_human_review: z.literal(true),
  person: z.object({
    is_current: z.enum(["yes", "no", "unclear"]),
    current_title: text.nullable(),
    current_company_domain: text.nullable(),
    role_match: z.enum(["match", "mismatch", "unclear"]),
    role_category: text.nullable(),
    linkedin_url: text.nullable(),
    source_url: text.nullable(),
    source_provider: z.literal("Clay web research"),
    observed_at: text.nullable(),
    uncertainty: text.nullable(),
  }),
  company: z.object({
    headcount: z.number().int().positive().nullable(),
    headcount_source: text.nullable(),
    headcount_observed_at: text.nullable(),
  }),
  evidence: z.object({
    kind: z.literal("public_source_research"),
    observation_clock: z.literal("workflow_runtime"),
    verification_receipt: z.null(),
    research_observed_at: z.string().datetime(),
    person: z.object({
      excerpt: text.nullable(),
      source_opened_reported: z.boolean(),
    }),
    company: z.object({
      excerpt: text.nullable(),
      source_opened_reported: z.boolean(),
      reported_headcount_type: z.enum([
        "exact",
        "range",
        "partial_roster",
        "unknown",
      ]),
      uncertainty: text.nullable(),
    }),
  }),
});
const normalized = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const title = (value: string) =>
  normalized(value)
    .replace(/\bchief executive officer\b/g, "ceo")
    .replace(/\bchief marketing officer\b/g, "cmo")
    .replace(/\bvice president\b/g, "vp")
    .replace(/\be commerce\b/g, "ecommerce")
    .replace(/\bof\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const https = (value: string | null) => {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port
      ? url
      : null;
  } catch {
    return null;
  }
};
const profile = (value: string | null) => {
  const url = https(value);
  return url &&
    ["linkedin.com", "www.linkedin.com"].includes(url.hostname) &&
    /^\/in\/[^/]+\/?$/.test(url.pathname)
    ? url.pathname.replace(/\/$/, "").toLowerCase()
    : null;
};

/** Corroboration gates continuation only; raw recommendations remain marked for review and never patch facts. */
export const reviewClayRole = (
  request: ClayRoleRequest,
  resultInput: unknown,
  now = Date.now(),
): NonNullable<ClayRoleState["reviewed"]> => {
  const resultHash = clayHash(resultInput);
  const answer = (
    status: "corroborated" | "held" | "excluded",
    reason: string,
  ) => ({ status, reason, checkedAt: new Date(now).toISOString(), resultHash });
  const result = clayRoleResultSchema.safeParse(resultInput);
  if (
    !result.success ||
    result.data.status !== "complete" ||
    result.data.finished !== 1 ||
    result.data.cursor ||
    result.data.results.length !== 1 ||
    result.data.results[0]?.id !== request.item.id ||
    result.data.results[0].status !== "complete"
  )
    return answer(
      "held",
      "Clay returned an incomplete or mismatched contact result.",
    );
  const raw = result.data.results[0].result;
  const facts = factsSchema.safeParse(raw?.["facts"]);
  if (!facts.success)
    return answer(
      "held",
      "Clay's role/team evidence does not match the reviewed contract.",
    );
  const duplicate =
    raw?.["structuredOutputs"] === undefined
      ? null
      : z.record(z.string(), z.unknown()).safeParse(raw["structuredOutputs"]);
  if (
    duplicate &&
    (!duplicate.success ||
      clayHash(duplicate.data["facts"]) !== clayHash(raw?.["facts"]))
  )
    return answer("held", "Clay returned conflicting result wrappers.");
  const data = facts.data;
  const observed = Date.parse(data.evidence.research_observed_at);
  if (
    observed < Date.parse(request.reservedAt) ||
    observed > now ||
    now - observed > 86400_000
  )
    return answer(
      "held",
      "Clay's source observation is not current for this reserved run.",
    );
  if (data.outcome === "exclude")
    return answer(
      "excluded",
      "Clay reported a departed contact; review before any further preparation.",
    );
  if (
    data.outcome !== "pass" ||
    data.item_status !== "completed" ||
    clayHash(data.reason_codes) !== clayHash(["PASS"]) ||
    data.person.is_current !== "yes" ||
    data.person.role_match !== "match" ||
    data.person.uncertainty ||
    data.evidence.company.uncertainty
  )
    return answer(
      "held",
      "Clay's current-role or team-size recommendation needs review.",
    );
  const expected = request.item.inputs;
  const personSource = https(data.person.source_url);
  const companySource = https(
    data.company.headcount_source?.replace(/^Clay web research, /, "") ?? null,
  );
  const expectedProfile = profile(expected.linkedin_url);
  const personBound =
    personSource &&
    (expectedProfile
      ? profile(personSource.toString()) === expectedProfile &&
        profile(data.person.linkedin_url) === expectedProfile
      : normalizeDomain(personSource.hostname) === expected.domain &&
        normalized(data.evidence.person.excerpt ?? "").includes(
          normalized(expected.name),
        ));
  const companyBound =
    companySource &&
    (normalizeDomain(companySource.hostname) === expected.domain ||
      (["linkedin.com", "www.linkedin.com"].includes(companySource.hostname) &&
        /^\/company\/[^/]+\/?$/.test(companySource.pathname) &&
        normalized(companySource.pathname.replace(/^\/company\//, "")) ===
          normalized(expected.company)));
  const count = data.company.headcount;
  const countQuote = data.evidence.company.excerpt ?? "";
  if (
    !personBound ||
    !companyBound ||
    normalizeDomain(data.person.current_company_domain ?? "") !==
      expected.domain ||
    !data.person.current_title ||
    title(data.person.current_title) !== title(expected.title) ||
    !title(data.evidence.person.excerpt ?? "").includes(
      title(expected.title),
    ) ||
    !data.evidence.person.source_opened_reported ||
    !data.evidence.company.source_opened_reported ||
    data.evidence.company.reported_headcount_type !== "exact" ||
    count === null ||
    count < 3 ||
    (/\b(founder|ceo)\b/.test(title(expected.title)) && count >= 20) ||
    !/\b(employees?|team|headcount|people|staff)\b/i.test(countQuote) ||
    /\b(followers?|range|between|about|approximately)\b|\d\s*[-–—+]\s*\d|\d\s*\+/i.test(
      countQuote,
    ) ||
    !new RegExp(`(?<!\\d)${count}(?!\\d)`).test(
      countQuote.replaceAll(",", ""),
    ) ||
    data.person.observed_at !== new Date(observed).toISOString().slice(0, 10) ||
    data.company.headcount_observed_at !== data.person.observed_at
  )
    return answer(
      "held",
      "Clay's quoted role/team facts do not corroborate this exact sourced contact.",
    );
  return answer(
    "corroborated",
    "Current role and exact team count corroborated; provider recommendations remain review-only.",
  );
};

/** Replays a completed check for subsequent drafting/approval without granting authority to provider fields. */
export const clayContinuationProblem = (
  input: unknown,
  prospect: { id: string; revision: number; details: ProspectInput },
  now = Date.now(),
) => {
  const role = clayRoleStateSchema.safeParse(input);
  if (
    !role.success ||
    !role.data.runId ||
    !role.data.result ||
    !role.data.requestedAt ||
    role.data.rejectedResult ||
    role.data.result.runId !== role.data.runId ||
    role.data.request.prospectId !== prospect.id ||
    role.data.request.item.id !== prospect.id ||
    role.data.request.prospectRevision > prospect.revision ||
    role.data.request.contextHash !==
      clayContextHash({
        ...prospect,
        revision: role.data.request.prospectRevision,
      }) ||
    clayHash(role.data.request.item.inputs) !==
      clayHash(clayRoleInputs(prospect.details))
  )
    return "Clay role/team corroboration is missing or no longer matches this contact.";
  const checked = Date.parse(role.data.reviewed?.checkedAt ?? "");
  if (
    !Number.isFinite(checked) ||
    checked < Date.parse(role.data.requestedAt) ||
    checked > now ||
    Date.parse(role.data.requestedAt) < Date.parse(role.data.request.reservedAt)
  )
    return "Clay's saved review no longer matches its result.";
  // Reproduce the initial 24-hour run check at its saved time, never at a later approval time.
  const reviewed = reviewClayRole(role.data.request, role.data.result, checked);
  if (
    reviewed.status !== "corroborated" ||
    role.data.reviewed?.status !== "corroborated" ||
    clayHash(role.data.reviewed) !== clayHash(reviewed)
  )
    return reviewed.status === "corroborated"
      ? "Clay's saved review no longer matches its result."
      : reviewed.reason;
  const facts = factsSchema.safeParse(
    role.data.result.results[0]?.result?.["facts"],
  );
  if (
    !facts.success ||
    // Match the app's 30-day role freshness window, measured from the unchanged source observation.
    now - Date.parse(facts.data.evidence.research_observed_at) > 30 * 86_400_000
  )
    return "Clay's current-role corroboration is older than thirty days.";
  return null;
};
