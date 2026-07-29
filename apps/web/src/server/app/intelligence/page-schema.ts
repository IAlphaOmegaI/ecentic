import { resultify } from "@zenncore/utils";
import { cacheLife, cacheTag } from "next/cache";
import * as HTTP from "../../utils/http";

const FETCH_TIMEOUT_MS = 8000;

export type PageSchemaStatus = "found" | "missing" | "unreachable" | "no-url";

/**
 * Whether ecentic's theme app embed rendered its own JSON-LD on the page, and
 * from which source. The four merchant-facing tiers build on this:
 * - `optimized` — the embed rendered the published `ecentic.structured_data`
 *   metafield (best).
 * - `active` — the embed rendered its default markup built from live product
 *   data (good; no optimized version published yet).
 * - `inactive` — the embed is switched off, so at most the theme's own thin
 *   markup reaches the page (neutral), or nothing at all (bad).
 */
export type PageEmbedStatus = "optimized" | "active" | "inactive" | "unknown";

export type PageSchemaCheck = {
  status: PageSchemaStatus;
  embed: PageEmbedStatus;
};

/**
 * The single merchant-facing verdict for a product page's structured data,
 * collapsing the fetch result and embed source into one value:
 * - `ecentic-optimized` — the embed renders the published optimized JSON-LD.
 * - `ecentic-standard` — the embed renders its default markup from live
 *   product data; publishing an optimized version upgrades it.
 * - `store-default` — only the theme's own markup is live; the embed is off.
 * - `ecentic-optimized_embed-off` — optimized JSON-LD exists but the embed is
 *   off, so no ecentic markup reaches the page.
 * - `missing` — no Product markup on the page at all.
 * - `unreachable` — the page could not be verified (fetch failed or no URL).
 */
export type StructuredDataStatus =
  | "ecentic-optimized"
  | "ecentic-standard"
  | "store-default"
  | "ecentic-optimized_embed-off"
  | "missing"
  | "unreachable";

export const resolveStructuredDataStatus = (
  check: PageSchemaCheck,
  hasOptimizedData: boolean,
): StructuredDataStatus => {
  switch (true) {
    case check.status === "unreachable" || check.status === "no-url":
      return "unreachable";
    case check.embed === "optimized":
      return "ecentic-optimized";
    case check.embed === "active":
      return "ecentic-standard";
    case check.status === "found":
      return "store-default";
    case hasOptimizedData:
      return "ecentic-optimized_embed-off";
    default:
      return "missing";
  }
};

/** Result for a product with no public URL — nothing to fetch, nothing to say. */
export const NO_PAGE_URL: PageSchemaCheck = {
  status: "no-url",
  embed: "unknown",
};

/** Cache tag for one product page's check, so a publish can force a re-read. */
export const pageSchemaTag = (url: string) => `page-schema:${url}`;

/**
 * Detects schema.org Product markup in rendered HTML — either a JSON-LD block
 * whose type field is Product or ProductGroup (bare or inside an array/graph)
 * or inline microdata (itemtype pointing at schema.org/Product).
 */
export const hasSchemaOrgProduct = (html: string): boolean => {
  const jsonLdBlocks =
    html.match(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ) ?? [];
  const hasProductJsonLd = jsonLdBlocks.some((block) =>
    /"@type"\s*:\s*(?:"|\[[^\]]*")(?:Product|ProductGroup)"/.test(block),
  );
  if (hasProductJsonLd) return true;

  return /itemtype=["']https?:\/\/schema\.org\/Product(?:Group)?["']/i.test(
    html,
  );
};

/**
 * Our app embed stamps every block it renders with `data-ecentic` — the value
 * says which source rendered: `product-optimized` for the published metafield,
 * `product` for the default fallback. The marker's absence on a product page
 * means the embed did not run at all.
 */
export const hasEcenticEmbed = (html: string): boolean =>
  /<script[^>]*\sdata-ecentic=["']product(?:-optimized)?["'][^>]*>/i.test(html);

const hasOptimizedEmbed = (html: string): boolean =>
  /<script[^>]*\sdata-ecentic=["']product-optimized["'][^>]*>/i.test(html);

// Cached per URL: agents read the rendered page, so the check fetches the live
// storefront rather than trusting synced backend data. An hour of staleness is
// fine for passive views — publishing revalidates `pageSchemaTag(url)` so the
// merchant never sees a stale verdict right after acting.
export const checkProductPageSchema = async (
  url: string,
): Promise<PageSchemaCheck> => {
  // "use cache";
  // cacheLife("hours");
  // cacheTag(pageSchemaTag(url));

  const response = await HTTP.request(
    url,
    { method: "GET", headers: { "User-Agent": "EcenticAudit/1.0" } },
    { timeout: FETCH_TIMEOUT_MS },
  );
  if (!response.success || !response.data.ok)
    return { status: "unreachable", embed: "unknown" };

  const body = await resultify(() => response.data.text());
  if (!body.success) return { status: "unreachable", embed: "unknown" };

  const embed: PageEmbedStatus = (() => {
    switch (true) {
      case hasOptimizedEmbed(body.data):
        return "optimized";
      case hasEcenticEmbed(body.data):
        return "active";
      default:
        return "inactive";
    }
  })();

  return {
    status: hasSchemaOrgProduct(body.data) ? "found" : "missing",
    embed,
  };
};
