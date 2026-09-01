"use server";

import { resultify, unique } from "@zenncore/utils";
import { z } from "zod";
import { getBrandLogo } from "@/lib/logo";
import { generate } from "../../utils/ai";
import { withAuthentication } from "../../utils/authentication";
import { Environment } from "../../utils/environment";
import * as HTTP from "../../utils/http";
import * as Competitor from "../competitor";

const Utils = {
  truncateHtml: (html: string, limit = 12000): string => {
    const stripped = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[\s\S]*?<\/footer>/gi, "")
      .replace(/<header[\s\S]*?<\/header>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return stripped.slice(0, limit);
  },

  inferSource: (url: string): string => {
    switch (true) {
      case url.includes("amazon."):
        return "Amazon";
      case url.includes("walmart."):
        return "Walmart";
      case url.includes("target."):
        return "Target";
      case url.includes("ebay."):
        return "eBay";
      case url.includes("etsy."):
        return "Etsy";
      case url.includes("myshopify.com"):
        return "Shopify";
      default:
        return "Direct";
    }
  },

  // The model is asked to echo the page it read from, so a page that yields no
  // product simply drops out instead of shifting every later product onto the
  // wrong URL — which is what indexing the input list by position used to do.
  // Only a URL we actually fetched is accepted back, so a hallucinated or
  // rewritten one is stored as null rather than as a link that goes nowhere.
  resolveUrl: (candidate: string | null, fetched: string[]): string | null => {
    if (!candidate) return null;

    const normalize = (url: string) => url.trim().replace(/\/+$/, "");
    const wanted = normalize(candidate);

    return fetched.find((url) => normalize(url) === wanted) ?? null;
  },

  // Only an absolute http(s) image is usable in an <img>; the stripped page text
  // regularly yields fragments ("/cdn/shop/x.jpg", "data:…") that render broken.
  resolveImage: (candidate: string | null, brand: string | null) => {
    const absolute = /^https?:\/\//.test(candidate ?? "") ? candidate : null;
    return absolute ?? getBrandLogo(brand);
  },

  hostname: (url: string) => {
    const parsed = resultify(() => new URL(url));
    return parsed.success ? parsed.data.hostname : url;
  },
};

export const scrapeUrls = withAuthentication(
  async (ctx, { urls, store }: { urls: string[]; store: string }) => {
    const valid = unique(
      urls
        .map((url) => url.trim())
        .filter((url) => resultify(() => new URL(url)).success),
    ).slice(0, 10);

    if (valid.length === 0)
      return {
        success: false as const,
        error: new Error("No valid URLs provided"),
      };

    const pages = await Promise.all(
      valid.map(async (url) => {
        const response = await HTTP.request(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml",
          },
        });

        // A blocked or missing page still resolves — `HTTP.request` only fails on
        // transport errors — and its body is a bot wall, not a product. Feeding
        // that to the model produced confident nonsense, so drop it here.
        if (!response.success || !response.data.ok) return { url, html: null };

        const text = await resultify(() => response.data.text());
        if (!text.success) return { url, html: null };

        return { url, html: Utils.truncateHtml(text.data) };
      }),
    );

    const fetched = pages.filter((page) => page.html);

    if (fetched.length === 0)
      return {
        success: false as const,
        error: new Error(
          `Could not read ${valid.map(Utils.hostname).join(", ")}. The site may block automated requests — try the product's own store page, or add the competitor from the Search tab.`,
        ),
      };

    const context = fetched
      .map(
        (page) =>
          `URL: ${page.url}\nSource: ${Utils.inferSource(page.url)}\nContent:\n${page.html}\n---`,
      )
      .join("\n\n");

    const result = await resultify(() =>
      generate({
        label: "scrape.products",
        instructions: `You are a product data extraction specialist. Given stripped text content from e-commerce product pages, extract structured product information with high precision.

Rules:
- Only extract data explicitly present in the page text. Never infer or fabricate values.
- Return one product per page, and set "url" to that page's URL exactly as it was given to you.
- Skip a page entirely (return no product for it) when its content is a bot wall, a login page, or otherwise carries no product.
- For price: extract the current/sale price, not the "compare at" or original price. Include only the numeric value (e.g. "29.99" not "$29.99").
- For currency: detect from currency symbols or page context as a 3-letter code (USD, EUR, GBP). Return null when no signal is present.
- For brand: look for "by [Brand]", "Brand: [Name]", or the first prominent brand mention. If the page is the brand's own store, use the store/domain name.
- For title: use the main product title, not breadcrumbs or category names.
- For description: extract the primary product description, truncated to 300 characters. Skip marketing fluff like "FREE SHIPPING" or "LIMITED TIME".
- For image: extract the primary product image URL only when it is an absolute http(s) URL present in the content. Return null otherwise.
- For source: use the retailer/platform name (Amazon, Walmart, Etsy, etc.), not the URL.
- If a page contains multiple products (e.g. a category page), extract only the primary/featured product.`,
        prompt: `Extract one product per page from these pages:\n\n${context}`,
        output: z.object({
          products: z.array(
            z.object({
              url: z.string(),
              title: z.string(),
              brand: z.string().nullable(),
              price: z.string().nullable(),
              // No `.default()` here: Azure's structured-output mode requires
              // every property to be required, and a defaulted field is emitted
              // as optional — which failed the whole call with
              // "Invalid schema for response_format". Default in code instead.
              currency: z.string().nullable(),
              description: z.string().nullable(),
              image: z.string().nullable(),
              source: z.string(),
            }),
          ),
        }),
      }),
    );

    if (!result.success)
      return { success: false as const, error: result.error };

    const fetchedUrls = fetched.map((page) => page.url);

    const extracted = result.data.products.filter((product) =>
      product.title.trim(),
    );

    const created = await Promise.all(
      extracted.map((product) =>
        Competitor.create(Environment.SERVER, {
          title: product.title.trim(),
          brand: product.brand,
          price: product.price,
          currency: product.currency ?? "USD",
          description: product.description,
          source: product.source,
          image: Utils.resolveImage(product.image, product.brand),
          url: Utils.resolveUrl(product.url, fetchedUrls),
          userId: ctx.session.user.id,
          storeId: store,
          selected: true,
        }),
      ),
    );

    const successful = created
      .filter((record) => record.success)
      .map((record) => record.data);

    if (successful.length === 0)
      return {
        success: false as const,
        error: new Error(
          "No product could be read from those pages. They may be category or bot-walled pages rather than product pages.",
        ),
      };

    return { success: true as const, data: successful };
  },
  "Intelligence.scrapeUrls",
);
