"use server";

/**
 * Agent-readiness audit: verifies the store against the surfaces AI shopping
 * agents actually read, instead of scoring Ecentic's own database rows.
 * Checks are grouped by ingestion path — crawl access (robots.txt), rendered
 * structured data (storefront HTML), offer identity (GTIN/brand coverage for
 * cross-retailer clustering), and feed readiness (Merchant Center /
 * Perplexity). Surfaces that can't be verified programmatically (Agentic
 * Storefront enablement, program enrollments) are reported as manual steps
 * rather than silently skipped.
 */

import { and, eq } from "drizzle-orm";
import { schema } from "../../database";
import { withAuthentication } from "../../utils/authentication";
import { Environment } from "../../utils/environment";
import * as HTTP from "../../utils/http";
import { buildGoogleFeed, extractCatalogFacts, feedUrl } from "../feed-export";
import * as Product from "../product";
import * as Store from "../store";

const PAGE_SAMPLE_SIZE = 3;
const FETCH_TIMEOUT_MS = 8000;

/**
 * Crawlers that decide AI visibility. `Googlebot` gates the Shopping Graph
 * page verification; `Google-Extended` gates Gemini grounding; the rest are
 * the OpenAI/Anthropic/Perplexity index and on-demand fetchers.
 */
const CRITICAL_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "PerplexityBot",
  "Perplexity-User",
  "ClaudeBot",
  "Claude-User",
  "Google-Extended",
  "Googlebot",
  "Bingbot",
];

export type ReadinessCheck = {
  key: string;
  label: string;
  status: "pass" | "warn" | "fail" | "manual";
  detail: string;
  recommendation?: string;
};

export type ReadinessReport = {
  checks: ReadinessCheck[];
  /** 0–100 across automated checks only (pass=1, warn=0.5, fail=0). */
  score: number;
  feed: { url: string; itemCount: number; skippedCount: number } | null;
};

type RobotsGroup = { agents: string[]; disallow: string[]; allow: string[] };

const parseRobots = (body: string): RobotsGroup[] => {
  const groups: RobotsGroup[] = [];
  const lines = body.split(/\r?\n/);

  for (const raw of lines) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;

    const separator = line.indexOf(":");
    if (separator === -1) continue;

    const directive = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    switch (true) {
      case directive === "user-agent": {
        const current = groups[groups.length - 1];
        // Consecutive user-agent lines share one group; a user-agent line
        // after rules starts a new group.
        if (
          current &&
          current.disallow.length === 0 &&
          current.allow.length === 0 &&
          current.agents.length > 0
        ) {
          current.agents.push(value.toLowerCase());
          break;
        }
        groups.push({ agents: [value.toLowerCase()], disallow: [], allow: [] });
        break;
      }
      case directive === "disallow": {
        groups[groups.length - 1]?.disallow.push(value);
        break;
      }
      case directive === "allow": {
        groups[groups.length - 1]?.allow.push(value);
        break;
      }
      default:
        break;
    }
  }

  return groups;
};

const isCrawlerBlocked = (groups: RobotsGroup[], crawler: string): boolean => {
  const name = crawler.toLowerCase();
  const specific = groups.filter((group) =>
    group.agents.some((agent) => agent !== "*" && name.includes(agent)),
  );
  const applicable = specific.length
    ? specific
    : groups.filter((group) => group.agents.includes("*"));

  return applicable.some(
    (group) =>
      group.disallow.some((path) => path === "/") &&
      !group.allow.some((path) => path === "/"),
  );
};

const checkRobots = async (host: string): Promise<ReadinessCheck> => {
  const response = await HTTP.request(
    `https://${host}/robots.txt`,
    { method: "GET", headers: { "User-Agent": "EcenticAudit/1.0" } },
    { timeout: FETCH_TIMEOUT_MS },
  );

  if (!response.success || !response.data.ok)
    return {
      key: "robots",
      label: "AI crawler access (robots.txt)",
      status: "warn",
      detail: `Could not fetch https://${host}/robots.txt — crawlers will assume everything is allowed, but verify the domain is reachable.`,
    };

  const body = await response.data.text();
  const groups = parseRobots(body);
  const blocked = CRITICAL_CRAWLERS.filter((crawler) =>
    isCrawlerBlocked(groups, crawler),
  );

  if (blocked.length === 0)
    return {
      key: "robots",
      label: "AI crawler access (robots.txt)",
      status: "pass",
      detail: `All ${CRITICAL_CRAWLERS.length} AI crawlers are allowed.`,
    };

  return {
    key: "robots",
    label: "AI crawler access (robots.txt)",
    status: "fail",
    detail: `Blocked crawlers: ${blocked.join(", ")}. Blocked agents cannot index or cite this store at all.`,
    recommendation:
      "Remove the Disallow rules for these user-agents (Shopify: Online Store → Preferences, or the robots.txt.liquid template).",
  };
};

const checkRenderedStructuredData = async (
  urls: string[],
): Promise<ReadinessCheck> => {
  if (urls.length === 0)
    return {
      key: "jsonld",
      label: "Structured data in rendered HTML",
      status: "warn",
      detail: "No synced product has a public URL to sample.",
    };

  const results: { url: string; hasProductJsonLd: boolean }[] = [];

  for (const url of urls) {
    const response = await HTTP.request(
      url,
      { method: "GET", headers: { "User-Agent": "EcenticAudit/1.0" } },
      { timeout: FETCH_TIMEOUT_MS },
    );
    if (!response.success || !response.data.ok) continue;

    const html = await response.data.text();
    const jsonLdBlocks =
      html.match(
        /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
      ) ?? [];
    const hasProductJsonLd = jsonLdBlocks.some((block) =>
      /"@type"\s*:\s*"?Product"?/.test(block),
    );
    results.push({ url, hasProductJsonLd });
  }

  if (results.length === 0)
    return {
      key: "jsonld",
      label: "Structured data in rendered HTML",
      status: "warn",
      detail: "Sampled product pages could not be fetched.",
    };

  const withMarkup = results.filter((entry) => entry.hasProductJsonLd).length;

  if (withMarkup === results.length)
    return {
      key: "jsonld",
      label: "Structured data in rendered HTML",
      status: "pass",
      detail: `schema.org Product JSON-LD found on ${withMarkup}/${results.length} sampled product pages.`,
    };

  return {
    key: "jsonld",
    label: "Structured data in rendered HTML",
    status: withMarkup === 0 ? "fail" : "warn",
    detail: `Product JSON-LD found on only ${withMarkup}/${results.length} sampled pages. Crawling agents (and Google's feed verification) read the rendered page, not backend metafields.`,
    recommendation:
      "Enable the Ecentic 'Agentic structured data' app embed in the theme editor, or add Product JSON-LD to the theme.",
  };
};

const checkOfferIdentity = (
  products: { rawData: string | null; sku: string | null }[],
): ReadinessCheck => {
  const total = products.length;
  const withGtin = products.filter(
    (product) => extractCatalogFacts(product.rawData).gtin !== null,
  ).length;
  const withSku = products.filter((product) => product.sku).length;
  const gtinShare = total === 0 ? 0 : withGtin / total;

  const detail = `${withGtin}/${total} products carry a GTIN (variant barcode); ${withSku}/${total} have a SKU. ChatGPT Shopping, Google AI Mode, and Perplexity all cluster competing offers by GTIN — products without one never enter the cross-retailer comparison where offers are won.`;

  if (gtinShare >= 0.8)
    return {
      key: "identity",
      label: "Offer identity (GTIN coverage)",
      status: "pass",
      detail,
    };

  return {
    key: "identity",
    label: "Offer identity (GTIN coverage)",
    status: gtinShare >= 0.4 ? "warn" : "fail",
    detail,
    recommendation:
      "Fill the barcode field on Shopify variants (Products → variant → Barcode) with the product's GTIN/EAN/UPC.",
  };
};

const checkContentDepth = (
  products: { title: string; description: string | null }[],
): ReadinessCheck => {
  const total = products.length;
  const thin = products.filter(
    (product) =>
      !product.description ||
      product.description.replace(/<[^>]*>/g, " ").trim().length < 200,
  ).length;

  if (total === 0 || thin / total <= 0.2)
    return {
      key: "content",
      label: "Listing content depth",
      status: "pass",
      detail: `${total - thin}/${total} products have substantive descriptions.`,
    };

  return {
    key: "content",
    label: "Listing content depth",
    status: thin / total >= 0.6 ? "fail" : "warn",
    detail: `${thin}/${total} products have thin descriptions (<200 characters of text). Shopify Catalog extracts filterable attributes from descriptions; thin copy means fewer attributes for agents to match on.`,
    recommendation:
      "Use Optimization Center to rewrite thin listings with concrete specs (material, dimensions, compatibility).",
  };
};

const MANUAL_CHECKS: ReadinessCheck[] = [
  {
    key: "agentic-storefront",
    label: "Shopify Agentic Storefront enabled",
    status: "manual",
    detail:
      "Confirm in Shopify admin: Sales channels → Agentic. This is the pipe that puts products in front of ChatGPT, Perplexity, and Copilot via the Shopify Catalog, and where custom fields are mapped to agent-readable attributes.",
  },
  {
    key: "merchant-center",
    label: "Google Merchant Center feed submitted",
    status: "manual",
    detail:
      "Without a Merchant Center feed the store cannot enter Google's Shopping Graph or AI Mode. Add the Ecentic feed URL as a scheduled fetch, or use the Google & YouTube channel app.",
  },
  {
    key: "perplexity-merchant",
    label: "Perplexity Merchant Program enrolled",
    status: "manual",
    detail:
      "Free enrollment; accepts the same Google Shopping feed URL. Offer selection inside a product cluster weighs price, shipping window, and return policy.",
  },
];

export const auditStore = withAuthentication(
  async (context, { store: storeId }: { store: string }) => {
    const userId = context.session.user.id;

    const store = await Store.get(Environment.SERVER, storeId);
    if (!store.success) return store;
    if (!store.data)
      return { success: false as const, error: new Error("Store not found") };
    if (store.data.userId !== userId)
      return { success: false as const, error: new Error("Not authorized") };

    const products = await Product.find(Environment.SERVER, {
      where: and(
        eq(schema.product.storeId, storeId),
        eq(schema.product.status, "active"),
      ),
    });
    if (!products.success) return products;

    const host = store.data.domain
      .replace(/^https?:\/\//, "")
      .replace(/\/+$/, "");

    const sampleUrls = products.data
      .map((product) => product.url)
      .filter((url): url is string => Boolean(url))
      .slice(0, PAGE_SAMPLE_SIZE);

    const [robots, jsonLd, feed] = await Promise.all([
      checkRobots(host),
      checkRenderedStructuredData(sampleUrls),
      buildGoogleFeed(storeId),
    ]);

    const feedCheck: ReadinessCheck = (() => {
      if (!feed.success)
        return {
          key: "feed",
          label: "Product feed readiness",
          status: "fail",
          detail: `Feed generation failed: ${feed.error.message}`,
        };

      const { itemCount, skippedCount } = feed.data;
      if (itemCount === 0)
        return {
          key: "feed",
          label: "Product feed readiness",
          status: "fail",
          detail: `No product qualifies for the feed (${skippedCount} skipped for missing link, image, or price).`,
          recommendation:
            "Sync products with images and prices; every feed item needs a public URL, an image, and a positive price.",
        };

      return {
        key: "feed",
        label: "Product feed readiness",
        status: skippedCount > 0 ? "warn" : "pass",
        detail: `${itemCount} products feed-ready, ${skippedCount} skipped (missing link, image, or price).`,
      };
    })();

    const automated = [
      robots,
      jsonLd,
      feedCheck,
      checkOfferIdentity(products.data),
      checkContentDepth(products.data),
    ];

    const score = Math.round(
      (automated.reduce((sum, check) => {
        if (check.status === "pass") return sum + 1;
        if (check.status === "warn") return sum + 0.5;
        return sum;
      }, 0) /
        automated.length) *
        100,
    );

    return {
      success: true as const,
      data: {
        checks: [...automated, ...MANUAL_CHECKS],
        score,
        feed: feed.success
          ? {
              url: feedUrl(storeId),
              itemCount: feed.data.itemCount,
              skippedCount: feed.data.skippedCount,
            }
          : null,
      } satisfies ReadinessReport,
    };
  },
  "AgentReadiness.auditStore",
);
