// Store-identity helpers shared by the discovery engine and the AI-answers
// report. Dependency-free on purpose: the report is pure and unit-tested, and
// must not pull the AI engine in just to compare two domains.

// Reduce a store URL/domain to a bare host for comparison: drop protocol, a
// leading www., any path, and lowercase it. "https://www.Nike.com/shoes" → "nike.com".
export const normalizeDomain = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .replace(/\/+$/, "");

// The brand label of a domain — its first dot-separated segment. "allbirds.com" → "allbirds".
export const rootLabel = (domain: string): string =>
  normalizeDomain(domain).split(".")[0] ?? "";

export const alphanumeric = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");
