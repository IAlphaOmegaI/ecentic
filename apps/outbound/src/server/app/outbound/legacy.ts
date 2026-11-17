import { resultify } from "@zenncore/utils";
import { z } from "zod";
import { normalizeDomain } from "@/lib/outbound";
import { mapLegacyProspect } from "./import";

type Row = Record<string, unknown>;
const value = (row: Row, ...keys: string[]) => {
  const found = keys
    .map((key) => row[key])
    .find((entry) => typeof entry === "string" && entry.trim());
  return typeof found === "string" ? found.trim() : "";
};
const key = (row: Row) =>
  normalizeDomain(value(row, "domain", "website", "key"));
const historicDomain = (row: Row) =>
  key(row) ||
  normalizeDomain(
    value(row, "website").match(
      /^https?:\/\/([a-z0-9](?:[a-z0-9-]*\.)+[a-z]{2,})(?=[/\s:;]|$)/i,
    )?.[1] ?? "",
  );
const paragraphs = (row: Row) => {
  const body = row["body"];
  if (
    Array.isArray(body) &&
    body.every((paragraph) => typeof paragraph === "string")
  )
    return [
      ...body,
      ...(value(row, "optout") ? [`(${value(row, "optout")})`] : []),
      ...(value(row, "signoff") ? [value(row, "signoff")] : []),
    ].join("\n\n");
  return typeof body === "string" ? body : "";
};

/** Dry-run normalization only. All legacy facts remain unapproved and freshness is never inferred. */
export const prepareLegacyImport = ({
  crm,
  exclusions,
  research,
  drafts,
}: {
  crm: Row[];
  exclusions: Row[];
  research: Row[];
  drafts: Row[];
}) => {
  const errors: {
    source: string;
    row: number;
    reason: string;
    rawIdentity?: { website: string; email: string };
  }[] = [];
  const merged = new Map<string, Row>();
  const counters = {
    duplicateResearch: 0,
    unknownCountry: 0,
    held: 0,
    skipped: 0,
    drafts: 0,
    recoveredIdentities: 0,
    coveredMissingBounces: 0,
  };
  for (const [position, row] of research.entries()) {
    const domain = key(row);
    if (!domain) {
      errors.push({
        source: "research",
        row: position + 1,
        reason: "Missing or invalid company domain",
      });
      continue;
    }
    if (merged.has(domain)) counters.duplicateResearch += 1;
    else merged.set(domain, row);
  }
  for (const [position, row] of drafts.entries()) {
    const domain = key(row);
    if (!domain) {
      errors.push({
        source: "drafts",
        row: position + 1,
        reason: "Missing or invalid company domain",
      });
      continue;
    }
    merged.set(domain, {
      ...merged.get(domain),
      ...row,
      migrationDraft: paragraphs(row),
    });
  }
  const prospects: Row[] = [];
  for (const [domain, row] of merged) {
    const unknown = !/^[a-z]{2}$/i.test(value(row, "country"));
    const status = value(row, "status");
    if (unknown) counters.unknownCountry += 1;
    const notes = [
      "Imported from the existing W46 research. All evidence must be reviewed; provider labels do not imply fresh verification.",
      unknown ? "Country is unknown (ZZ); cold delivery remains held." : "",
      `Legacy status: ${status}`,
      ...[
        "why",
        "what_they_sell_hint",
        "fit_reason",
        "legit_evidence_hint",
        "review",
        "hold_reason",
        "notes",
      ].map((field) =>
        value(row, field) ? `${field}: ${value(row, field)}` : "",
      ),
    ]
      .filter(Boolean)
      .join("\n")
      .slice(0, 5000);
    const parsed = z
      .object({ company: z.string().min(1), name: z.string().min(1) })
      .safeParse({
        company: value(row, "company"),
        name: value(row, "name", "person_name"),
      });
    if (!parsed.success) {
      errors.push({
        source: "research",
        row: prospects.length + 1,
        reason: `${domain}: missing company or person name`,
      });
      continue;
    }
    const normalized = resultify(() =>
      mapLegacyProspect({
        ...row,
        ...parsed.data,
        domain,
        country: unknown ? "ZZ" : value(row, "country"),
        notes,
        legitEvidence: value(row, "legitEvidence", "legit_evidence"),
        source:
          `legacy W46: ${value(row, "source") || "calibration draft export"}`.slice(
            0,
            500,
          ),
      }),
    );
    if (!normalized.success) {
      errors.push({
        source: "research",
        row: prospects.length + 1,
        reason: `${domain}: ${normalized.error.message}`,
      });
      continue;
    }
    const draft =
      typeof row["migrationDraft"] === "string" ? row["migrationDraft"] : "";
    const ready = status === "ready" && Boolean(draft && value(row, "subject"));
    const held = unknown || ["hold", "held"].includes(status);
    const skipped = ["dropped", "skipped"].includes(status);
    if (ready) counters.drafts += 1;
    if (held) counters.held += 1;
    if (skipped) counters.skipped += 1;
    prospects.push({
      ...normalized.data,
      status: skipped
        ? "skipped"
        : held
          ? "held"
          : ready
            ? "draft"
            : "candidate",
      hold_reason:
        value(row, "hold_reason") ||
        (unknown
          ? "Country not present in legacy research"
          : held
            ? "Legacy hold requires review"
            : ""),
      ...(ready ? { subject: value(row, "subject"), body: draft } : {}),
    });
  }
  const suppressions = new Map<string, Row>();
  const exclude = (
    scope: "domain" | "email",
    target: string,
    reason: string,
  ) => {
    const normalized =
      scope === "domain"
        ? normalizeDomain(target)
        : target.trim().toLowerCase();
    if (
      !normalized ||
      (scope === "email" && !z.email().safeParse(normalized).success)
    )
      return false;
    const identifier = `${scope}:${normalized}`;
    const previous = suppressions.get(identifier);
    suppressions.set(identifier, {
      scope,
      [scope]: normalized,
      reason: [
        ...new Set([value(previous ?? {}, "reason"), reason].filter(Boolean)),
      ].join("; "),
    });
    return true;
  };
  for (const [position, row] of crm.entries()) {
    const status = value(row, "status").toLowerCase();
    const bounced = status === "bounced";
    const domain = historicDomain(row);
    const email = value(row, "email");
    if (domain && !key(row)) counters.recoveredIdentities += 1;
    if (
      bounced &&
      !z.email().safeParse(email).success &&
      exclusions.some((entry) => key(entry) === domain)
    ) {
      counters.coveredMissingBounces += 1;
      continue;
    }
    const reason = `Legacy CRM ${status || "history"}${value(row, "last_contacted") ? ` (${value(row, "last_contacted")})` : " (date unknown)"}${value(row, "source") ? `; ${value(row, "source")}` : ""}`;
    if (
      !exclude(bounced ? "email" : "domain", bounced ? email : domain, reason)
    )
      errors.push({
        source: "crm",
        row: position + 1,
        reason: "Historical record has no valid exclusion identity",
        rawIdentity: { website: value(row, "website"), email },
      });
    if (!bounced && email) exclude("email", email, reason);
  }
  for (const [position, row] of exclusions.entries()) {
    const domain = value(row, "domain");
    const email = value(row, "email");
    const reason = `Legacy DNC: ${value(row, "reason") || "Do not contact"}`;
    const identities = [
      domain ? exclude("domain", domain, reason) : false,
      email ? exclude("email", email, reason) : false,
    ];
    if (!identities.some(Boolean))
      errors.push({
        source: "exclusions",
        row: position + 1,
        reason: "DNC record has no valid identity",
      });
  }
  const rows = [...suppressions.values(), ...prospects];
  return {
    rows,
    report: {
      sourceRows: {
        crm: crm.length,
        exclusions: exclusions.length,
        research: research.length,
        draftBundle: drafts.length,
      },
      prospects: prospects.length,
      ...counters,
      domainExclusions: [...suppressions.values()].filter(
        (row) => row["scope"] === "domain",
      ).length,
      emailExclusions: [...suppressions.values()].filter(
        (row) => row["scope"] === "email",
      ).length,
      payloadRows: rows.length,
      payloadBytes: Buffer.byteLength(JSON.stringify(rows)),
      errors,
    },
  };
};
