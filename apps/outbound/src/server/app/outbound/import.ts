import { resultify } from "@zenncore/utils";
import { z } from "zod";
import {
  normalizeDomain,
  type ProspectInput,
  prospectSchema,
} from "@/lib/outbound";

/** RFC-style quoted CSV, including newlines in notes; never evaluates cells. */
const csvRows = (content: string): Record<string, string>[] => {
  const state = {
    rows: [] as string[][],
    row: [] as string[],
    cell: "",
    quoted: false,
    escapedQuote: false,
  };
  [...content.replace(/^\uFEFF/, "")].forEach(
    (character, position, characters) => {
      if (state.escapedQuote) {
        state.escapedQuote = false;
        return;
      }
      if (character === '"') {
        if (state.quoted && characters[position + 1] === '"') {
          state.cell += '"';
          state.escapedQuote = true;
          return;
        }
        state.quoted = !state.quoted;
        return;
      }
      if (!state.quoted && (character === "," || character === "\n")) {
        state.row.push(state.cell.replace(/\r$/, ""));
        state.cell = "";
        if (character === "\n") {
          state.rows.push(state.row);
          state.row = [];
        }
        return;
      }
      state.cell += character;
    },
  );
  if (state.quoted) throw new Error("CSV contains an unclosed quoted field.");
  if (state.cell || state.row.length) {
    state.row.push(state.cell);
    state.rows.push(state.row);
  }
  const [header, ...rows] = state.rows;
  return rows
    .filter((row) => row.some(Boolean))
    .map((row) =>
      Object.fromEntries(
        (header ?? []).map((column, index) => [
          column.trim(),
          row[index] ?? "",
        ]),
      ),
    );
};

export const parseImport = (content: string): Record<string, unknown>[] => {
  const trimmed = content.replace(/^\uFEFF/, "").trim();
  if (!trimmed) return [];
  const parsed: unknown = (() => {
    if (trimmed.startsWith("[")) return JSON.parse(trimmed);
    if (trimmed.startsWith("{")) {
      const json = resultify((): unknown => JSON.parse(trimmed));
      const document = z
        .record(z.string(), z.unknown())
        .safeParse(json.success ? json.data : null);
      if (document.success)
        return (
          document.data["prospects"] ??
          document.data["leads"] ?? [document.data]
        );
      return trimmed
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => JSON.parse(line));
    }
    return csvRows(trimmed);
  })();
  return z.array(z.record(z.string(), z.unknown())).max(5000).parse(parsed);
};

const string = (row: Record<string, unknown>, ...keys: string[]) => {
  const found = keys
    .map((key) => row[key])
    .find((value) => typeof value === "string" && value.trim());
  return typeof found === "string" ? found.trim() : "";
};
const date = (row: Record<string, unknown>, ...keys: string[]) => {
  const value = string(row, ...keys);
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : "";
};
const url = (row: Record<string, unknown>, ...keys: string[]) => {
  const value = string(row, ...keys);
  return z.url().safeParse(value).success ? value : "";
};

export const mapLegacyProspect = (
  row: Record<string, unknown>,
): ProspectInput => {
  const domain = normalizeDomain(string(row, "domain", "website", "key"));
  const verified = string(row, "emailStatus", "email_status");
  const input = {
    company: string(row, "company", "company_name"),
    domain,
    website: url(row, "website") || (domain ? `https://${domain}` : ""),
    country: string(row, "country", "location")
      .toUpperCase()
      .replace(/^UK$/, "GB"),
    platform: string(row, "platform") || "unknown",
    relationship: string(row, "relationship") || "cold",
    name: string(row, "name", "person_name"),
    first: string(row, "first", "first_name"),
    title: string(row, "title"),
    email: string(row, "email", "to").toLowerCase(),
    linkedinUrl: url(row, "linkedinUrl", "linkedin_url", "linkedin"),
    roleSource: url(row, "roleSource", "role_source"),
    roleCheckedAt: date(row, "roleCheckedAt", "role_checked_at"),
    timezone: string(row, "timezone"),
    emailStatus: [
      "verified",
      "tool-verified",
      "verified-public",
      "verified-other",
      "proven-thread",
      "proven-list",
    ].includes(verified)
      ? "verified"
      : "unknown",
    emailVerifiedAt: date(row, "emailVerifiedAt", "email_verified_at"),
    emailSource: string(row, "emailSource", "email_source"),
    mxProvider: string(row, "mxProvider", "mx") || "unknown",
    mxCheckedAt: date(row, "mxCheckedAt", "mx_checked_at"),
    product: string(row, "product"),
    productUrl: url(row, "productUrl", "product_url", "hook_source"),
    gap: string(row, "gap"),
    finding: string(row, "finding"),
    evidence: string(row, "evidence", "hook_check"),
    evidenceCheckedAt: date(row, "evidenceCheckedAt", "evidence_checked_at"),
    productCategory: string(row, "productCategory", "product_category"),
    reviewCount: string(row, "reviewCount", "review_count"),
    distributionSource: url(row, "distributionSource", "distribution_source"),
    personalPublishedAt: date(row, "personalPublishedAt", "personal_published_at"),
    personalCheckedAt: date(row, "personalCheckedAt", "personal_checked_at"),
    personalLine: string(row, "personalLine", "hook"),
    personalSource: url(
      row,
      "personalSource",
      "personal_hook_source",
      "hook_url",
    ),
    legitEvidence: string(row, "legitEvidence", "legit_evidence"),
    source: string(row, "source") || "legacy import",
    notes: string(row, "notes", "hold_reason", "review"),
    lang: string(row, "lang") || "en",
  };
  // Legacy labels without dates remain stale at the eligibility gate. Never infer a check date from import time.
  return prospectSchema.parse({ ...input, findingReviewed: false });
};

export const legacyHistory = (row: Record<string, unknown>) => {
  const status = string(row, "status").toLowerCase();
  const tags = string(row, "tags").toLowerCase();
  const contactedAt = date(row, "last_contacted", "sent_at", "date");
  return {
    contactedAt,
    suppressed: [
      "do-not-contact",
      "unsubscribed",
      "optout",
      "optedout",
    ].includes(status),
    bounced: status === "bounced" || tags.includes("bounced"),
    contacted:
      Boolean(contactedAt) ||
      [
        "contacted",
        "sent",
        "replied",
        "meeting",
        "customer",
        "investor",
        "lost",
      ].includes(status) ||
      tags.includes("draft-not-sent"),
  };
};
