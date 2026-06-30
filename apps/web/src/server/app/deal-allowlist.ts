/**
 * Domain allowlists per partner deal program, derived from each program's
 * public directory (export the YC / Techstars directory and paste the company
 * domains below). A redemption whose website or email domain is on its
 * merchant's list is auto-approved; everything else stays "pending" for manual
 * review. This file decides who gets the discount — keep it reviewed.
 *
 * Entries must be company apex domains (e.g. "acme.com") — never public email
 * providers (gmail.com, outlook.com), since email domains are matched too.
 * Matching is exact host, so list the domain founders actually use.
 */
const ALLOWLIST: Record<string, ReadonlySet<string>> = {
  ycombinator: new Set<string>([
    // "acme.com",
  ]),
  techstars: new Set<string>([
    // "acme.com",
  ]),
};

/** Registrable host from a URL, bare domain, or email — lowercased, no `www.`. */
const domain = (value: string): string | null => {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;

  const host = (() => {
    if (trimmed.includes("@")) return trimmed.split("@").at(-1) ?? "";
    const withoutProtocol = trimmed.replace(/^[a-z][a-z0-9+.-]*:\/\//, "");
    return withoutProtocol.split("/")[0] ?? "";
  })();

  const cleaned = host.replace(/^www\./, "").split(":")[0];
  return cleaned || null;
};

/** Whether a redemption's website or email domain is on the merchant's list. */
export const matches = ({
  merchant,
  email,
  website,
}: {
  merchant: string;
  email: string;
  website?: string | null;
}): boolean => {
  const list = ALLOWLIST[merchant];
  if (!list || list.size === 0) return false;

  const candidates = [website, email]
    .filter((value): value is string => Boolean(value))
    .map(domain)
    .filter((value): value is string => Boolean(value));

  return candidates.some((candidate) => list.has(candidate));
};
