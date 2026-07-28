import { resultify } from "@zenncore/utils";
import { cacheLife, cacheTag } from "next/cache";
import * as HTTP from "../../utils/http";

const FETCH_TIMEOUT_MS = 8000;

export type PageSchemaStatus = "found" | "missing" | "unreachable" | "no-url";

/**
 * Whether ecentic's theme app embed rendered its own JSON-LD on the page.
 * `inactive` is the case merchants hit most: metafields are published, but the
 * embed is switched off in the theme editor, so nothing reaches the storefront.
 */
export type PageEmbedStatus = "active" | "inactive" | "unknown";

export type PageSchemaCheck = {
  status: PageSchemaStatus;
  embed: PageEmbedStatus;
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
 * Our app embed stamps every block it renders with `data-ecentic`, and it falls
 * back to deterministic markup when the metafield is absent — so the marker's
 * absence on a product page means the embed did not run at all.
 */
export const hasEcenticEmbed = (html: string): boolean =>
  /<script[^>]*\sdata-ecentic=["']product["'][^>]*>/i.test(html);

// Cached per URL: agents read the rendered page, so the check fetches the live
// storefront rather than trusting synced backend data. An hour of staleness is
// fine for passive views — publishing revalidates `pageSchemaTag(url)` so the
// merchant never sees a stale verdict right after acting.
export const checkProductPageSchema = async (
  url: string,
): Promise<PageSchemaCheck> => {
  "use cache";
  cacheLife("hours");
  cacheTag(pageSchemaTag(url));

  const response = await HTTP.request(
    url,
    { method: "GET", headers: { "User-Agent": "EcenticAudit/1.0" } },
    { timeout: FETCH_TIMEOUT_MS },
  );
  if (!response.success || !response.data.ok)
    return { status: "unreachable", embed: "unknown" };

  const body = await resultify(() => response.data.text());
  if (!body.success) return { status: "unreachable", embed: "unknown" };

  return {
    status: hasSchemaOrgProduct(body.data) ? "found" : "missing",
    embed: hasEcenticEmbed(body.data) ? "active" : "inactive",
  };
};
