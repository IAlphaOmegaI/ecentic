import { resultify } from "@zenncore/utils";
import { cacheLife } from "next/cache";
import * as HTTP from "../../utils/http";

const FETCH_TIMEOUT_MS = 8000;

export type PageSchemaStatus = "found" | "missing" | "unreachable";

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

// Cached per URL: agents read the rendered page, so the check fetches the live
// storefront rather than trusting synced backend data. An hour of staleness is
// fine — theme edits that add or remove markup are rare.
export const checkProductPageSchema = async (
  url: string,
): Promise<PageSchemaStatus> => {
  "use cache";
  cacheLife("hours");

  const response = await HTTP.request(
    url,
    { method: "GET", headers: { "User-Agent": "EcenticAudit/1.0" } },
    { timeout: FETCH_TIMEOUT_MS },
  );
  if (!response.success || !response.data.ok) return "unreachable";

  const body = await resultify(() => response.data.text());
  if (!body.success) return "unreachable";

  return hasSchemaOrgProduct(body.data) ? "found" : "missing";
};
