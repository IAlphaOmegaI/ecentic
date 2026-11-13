import { describe, expect, test } from "bun:test";
import {
  type ArticleLinkContext,
  localizeArticleHref,
  localizeBlogHtmlLinks,
} from "../blog-links";

const context: ArticleLinkContext = {
  locale: "it",
  articlePath: "/blog/current-article",
  publishedSlugs: new Set([
    "published-article",
    "best-ai-shopping-agent-optimization-tools-2026",
    "best-ecommerce-ai-platforms",
  ]),
};

describe("localized navigation inside stored articles", () => {
  test("keeps owned public links in the current locale with query/hash intact", () => {
    expect(
      localizeArticleHref(
        "https://ecentic.ai/pricing?utm_source=blog&offer=a%2Bb#compare",
        context,
      ),
    ).toBe("/it/pricing?utm_source=blog&offer=a%2Bb#compare");
    expect(localizeArticleHref("/platform/connect#example", context)).toBe(
      "/it/platform/connect#example",
    );
    expect(localizeArticleHref("../pricing?plan=Scale", context)).toBe(
      "/it/pricing?plan=Scale",
    );
    expect(localizeArticleHref("//www.ecentic.ai/docs#cli", context)).toBe(
      "/it/docs#cli",
    );
    expect(localizeArticleHref("/platforms/shopify", context)).toBe(
      "/it/platforms/shopify",
    );
    expect(localizeArticleHref("/sign-up", context)).toBe("/it/sign-up");
  });

  test("localizes only published blog translations, including retired aliases", () => {
    expect(
      localizeArticleHref(
        "https://ecentic.ai/blog/published-article?x=1#faq",
        context,
      ),
    ).toBe("/it/blog/published-article?x=1#faq");
    expect(localizeArticleHref("published-article", context)).toBe(
      "/it/blog/published-article",
    );
    expect(localizeArticleHref("/blog/not-translated#faq", context)).toBe(
      "/blog/not-translated#faq",
    );
    expect(localizeArticleHref("/blog/ai-shopping-agents", context)).toBe(
      "/it/blog/best-ai-shopping-agent-optimization-tools-2026",
    );
    expect(
      localizeArticleHref("/compare/best-ai-ecommerce-tools", context),
    ).toBe("/it/blog/best-ecommerce-ai-platforms");
    expect(
      localizeArticleHref("/compare/best-ai-ecommerce-tools", {
        ...context,
        publishedSlugs: new Set(),
      }),
    ).toBe("/compare/best-ai-ecommerce-tools");
  });

  test("preserves explicit language choices rather than overriding the author", () => {
    for (const href of [
      "/fr/blog/published-article",
      "https://ecentic.ai/ja/pricing#plans",
      "/en/blog/published-article",
      "/it/docs",
    ])
      expect(localizeArticleHref(href, context)).toBe(href);
  });

  test("leaves machine endpoints, assets, unknown paths and external links alone", () => {
    for (const href of [
      "https://ecentic.ai/api/mcp",
      "/.well-known/ucp",
      "/openapi.json",
      "/docs/openapi",
      "/images/marketing/catalog-commerce.webp",
      "/docs/sample.pdf",
      "/unknown-page",
      "/blog/tag/english-topic",
      "//example.com/pricing",
      "https://ecentic.ai.example.com/pricing",
      "https://user:password@ecentic.ai/pricing",
      "https://ecentic.ai:8443/pricing",
      "mailto:hello@ecentic.ai",
      "tel:+15550000000",
      "javascript:alert(1)",
      "#article-faq",
      "?utm_source=article#faq",
      "",
    ])
      expect(localizeArticleHref(href, context)).toBe(href);
  });

  test("patches only real href attributes without touching code, media or markup", () => {
    const html = `<p data-example="/pricing">Read <a title="A > B" HREF='/pricing?a=1&amp;b=2#plans' target="_blank">plans</a>.</p><img src="/pricing" alt="/pricing"><pre><code><a href="/pricing">example</a></code></pre><code>/pricing</code><template><a href="/pricing">template</a></template><a href="/pricing" download>Download</a><!-- <a href="/pricing">comment</a> -->`;
    const expected = html.replace(
      "HREF='/pricing?a=1&amp;b=2#plans'",
      'href="/it/pricing?a=1&amp;b=2#plans"',
    );
    expect(localizeBlogHtmlLinks(html, context)).toBe(expected);
  });

  test("escapes changed href values and never mutates the original HTML", () => {
    const html =
      '<a href=/pricing>Pricing</a><a href="/blog/not-translated">English article</a>';
    expect(localizeBlogHtmlLinks(html, context)).toBe(
      '<a href="/it/pricing">Pricing</a><a href="/blog/not-translated">English article</a>',
    );
    expect(html).toBe(
      '<a href=/pricing>Pricing</a><a href="/blog/not-translated">English article</a>',
    );
  });

  test("uses the requested language and leaves English rendering unchanged", () => {
    const html = '<a href="https://ecentic.ai/pricing">Pricing</a>';
    expect(localizeBlogHtmlLinks(html, { ...context, locale: "zh-CN" })).toBe(
      '<a href="/zh-CN/pricing">Pricing</a>',
    );
    expect(localizeBlogHtmlLinks(html, { ...context, locale: "en" })).toBe(
      html,
    );
  });
});
