/**
 * Bot-wall detection for storefront fetches. A challenge page is not a product
 * page: an agent that lands on one leaves before reading price, stock, or
 * markup, so the audit must report it as a block rather than count it as a page
 * with no structured data. Kept outside the "use server" modules so the audit
 * and its specs can import a plain helper.
 */

export type FetchedPage = {
  status: number;
  headers: Headers;
  body: string;
};

export type PageAccess =
  | { kind: "ok" }
  /** `vendor` is null when the status says blocked but no vendor signature matched. */
  | { kind: "challenged"; vendor: string | null }
  | { kind: "unreachable" };

type Signature = {
  vendor: string;
  matches: (page: FetchedPage) => boolean;
};

// Only markers that appear on the challenge or block page itself. Vendor
// sensor scripts (Cloudflare's `/cdn-cgi/challenge-platform/scripts/jsd`,
// DataDome's `js.datadome.co`, PerimeterX's `_pxAppId`, Akamai's `_abck`) load
// on every page of a protected store, so matching them would flag healthy
// product pages.
const SIGNATURES: Signature[] = [
  {
    vendor: "Cloudflare",
    matches: ({ headers, body }) =>
      headers.get("cf-mitigated") === "challenge" ||
      /<title>\s*(?:Just a moment\.\.\.|Attention Required! \| Cloudflare)\s*<\/title>/i.test(
        body,
      ) ||
      body.includes("window._cf_chl_opt"),
  },
  {
    vendor: "Vercel",
    matches: ({ headers }) => headers.get("x-vercel-mitigated") === "challenge",
  },
  {
    // AWS WAF answers a challenge with 202 and a CAPTCHA with 405, so the
    // status alone would read the 202 as a page that loaded.
    vendor: "AWS WAF",
    matches: ({ headers }) =>
      /^(?:challenge|captcha)$/i.test(headers.get("x-amzn-waf-action") ?? ""),
  },
  {
    vendor: "DataDome",
    matches: ({ body }) => body.includes("captcha-delivery.com"),
  },
  {
    vendor: "HUMAN (PerimeterX)",
    matches: ({ body }) => /id=["']px-captcha["']/i.test(body),
  },
  {
    vendor: "Imperva",
    matches: ({ body }) => /Incapsula incident ID/i.test(body),
  },
  {
    vendor: "Akamai",
    matches: ({ body }) => body.includes("errors.edgesuite.net"),
  },
];

/**
 * Classifies one storefront response. A vendor signature wins over the status
 * code, because challenges are served as 200, 202, 403, 405, 429, and 503
 * depending on the vendor. Without one, 403 and 429 still count as a wall for
 * a public product page; a bare 503 is treated as an outage, not a challenge.
 */
export const classifyPageAccess = (page: FetchedPage): PageAccess => {
  const signature = SIGNATURES.find((candidate) => candidate.matches(page));

  switch (true) {
    case signature !== undefined:
      return { kind: "challenged", vendor: signature.vendor };
    case page.status === 403 || page.status === 429:
      return { kind: "challenged", vendor: null };
    case page.status >= 200 && page.status < 300:
      return { kind: "ok" };
    default:
      return { kind: "unreachable" };
  }
};
