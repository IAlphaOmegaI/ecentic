"use server";

import { resultify } from "@zenncore/utils";
import { z } from "zod";
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
};

export const scrapeUrls = withAuthentication(
  async (ctx, { urls }: { urls: string[] }) => {
    const valid = urls
      .filter((url) => resultify(() => new URL(url)).success)
      .slice(0, 10);

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

        if (!response.success) return { url, html: null };

        const text = await resultify(() => response.data.text());
        if (!text.success) return { url, html: null };

        return { url, html: Utils.truncateHtml(text.data) };
      }),
    );

    const fetched = pages.filter((page) => page.html);

    if (fetched.length === 0)
      return {
        success: false as const,
        error: new Error("Could not fetch any of the provided URLs"),
      };

    const context = fetched
      .map(
        (page) =>
          `URL: ${page.url}\nSource: ${Utils.inferSource(page.url)}\nContent:\n${page.html}\n---`,
      )
      .join("\n\n");

    const result = await resultify(() =>
      generate({
        instructions: `You are a product data extraction specialist. Given stripped text content from e-commerce product pages, extract structured product information with high precision.

Rules:
- Only extract data explicitly present in the page text. Never infer or fabricate values.
- For price: extract the current/sale price, not the "compare at" or original price. Include only the numeric value (e.g. "29.99" not "$29.99").
- For currency: detect from currency symbols or page context. Default to USD only if no signals are present.
- For brand: look for "by [Brand]", "Brand: [Name]", or the first prominent brand mention. If the page is the brand's own store, use the store/domain name.
- For title: use the main product title, not breadcrumbs or category names.
- For description: extract the primary product description, truncated to 300 characters. Skip marketing fluff like "FREE SHIPPING" or "LIMITED TIME".
- For image: extract the primary product image URL if present in the content. Return null if not clearly identifiable.
- For source: use the retailer/platform name (Amazon, Walmart, Etsy, etc.), not the URL.
- If a page contains multiple products (e.g. a category page), extract only the primary/featured product.`,
        prompt: `Extract one product per page from these pages:\n\n${context}`,
        output: z.object({
          products: z.array(
            z.object({
              title: z.string(),
              brand: z.string().nullable(),
              price: z.string().nullable(),
              currency: z.string().default("USD"),
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

    const created = await Promise.all(
      result.data.products.map((product, index) =>
        Competitor.create(Environment.SERVER, {
          ...product,
          userId: ctx.session.user.id,
          url: valid[index] ?? null,
          selected: true,
        }),
      ),
    );

    const successful = created
      .filter((record) => record.success)
      .map((record) => record.data);

    return { success: true as const, data: successful };
  },
  "Intelligence.scrapeUrls",
);
