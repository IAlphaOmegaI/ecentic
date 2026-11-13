import { type DefaultTreeAdapterMap, parseFragment } from "parse5";
import { localizePath } from "@/i18n/locale";
import { defaultLocale, isLocale, type Locale } from "@/i18n/locales";
import { RETIRED_BLOG_POSTS } from "@/lib/blog-redirects";
import { marketingRoutes } from "@/lib/marketing-routes";
import { seo } from "@/lib/seo";

const articleRoutes = new Set<string>([
  ...marketingRoutes.map((route) => route.path),
  // Existing public aliases and account entry points used in article CTAs.
  "/features",
  "/features/product-listings",
  "/how-it-works",
  "/enterprise",
  "/platforms/shopify",
  "/platforms/woocommerce",
  "/stories/dua-flavors",
  "/developers",
  "/developer",
  "/api-docs",
  "/documentation",
  "/docs/webhooks",
  "/agents",
  "/techstars",
  "/yc",
  "/sign-in",
  "/sign-up",
  "/onboarding/connect",
  "/dashboard",
]);

export type ArticleLinkContext = {
  locale: Locale;
  articlePath: string;
  publishedSlugs: ReadonlySet<string>;
};

/** Local navigation only; explicit locale choices and machine URLs stay intact. */
export const localizeArticleHref = (
  href: string,
  { locale, articlePath, publishedSlugs }: ArticleLinkContext,
) => {
  if (locale === defaultLocale || /^[?#]/.test(href.trim()) || !href.trim())
    return href;
  const base = new URL(articlePath, seo.host);
  if (!URL.canParse(href, base)) return href;
  const url = new URL(href, base);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.hostname.replace(/^www\./, "") !== new URL(seo.host).hostname ||
    url.username ||
    url.password ||
    url.port ||
    isLocale(url.pathname.split("/")[1] ?? "")
  )
    return href;

  const path = url.pathname.replace(/\/$/, "") || "/";
  const blogSlug = (() => {
    const match = path.match(/^\/blog\/([^/]+)$/)?.[1];
    if (path === "/compare/best-ai-ecommerce-tools")
      return "best-ecommerce-ai-platforms";
    if (!match) return null;
    try {
      const slug = decodeURIComponent(match);
      return RETIRED_BLOG_POSTS.get(slug) ?? slug;
    } catch {
      return null;
    }
  })();
  if (blogSlug) {
    if (!publishedSlugs.has(blogSlug)) return href;
    return `${localizePath(`/blog/${encodeURIComponent(blogSlug)}`, locale)}${url.search}${url.hash}`;
  }
  if (!articleRoutes.has(path)) return href;
  return `${localizePath(url.pathname, locale)}${url.search}${url.hash}`;
};

const protectedElements = new Set([
  "pre",
  "code",
  "script",
  "style",
  "template",
  "svg",
  "math",
]);

const escapeAttribute = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

/** Patch href attributes by source offset, without rewriting stored HTML or code. */
export const localizeBlogHtmlLinks = (
  html: string,
  context: ArticleLinkContext,
) => {
  if (context.locale === defaultLocale) return html;
  const fragment = parseFragment(html, { sourceCodeLocationInfo: true });
  const replacements = (
    node: DefaultTreeAdapterMap["node"],
  ): { start: number; end: number; value: string }[] => {
    if ("tagName" in node && protectedElements.has(node.tagName)) return [];
    const children =
      "childNodes" in node ? node.childNodes.flatMap(replacements) : [];
    if (!("tagName" in node) || node.tagName !== "a") return children;
    if (node.attrs.some((attribute) => attribute.name === "download"))
      return children;
    const href = node.attrs.find((attribute) => attribute.name === "href");
    const location = node.sourceCodeLocation?.attrs?.href;
    if (!href || !location) return children;
    const localized = localizeArticleHref(href.value, context);
    if (localized === href.value) return children;
    return [
      ...children,
      {
        start: location.startOffset,
        end: location.endOffset,
        value: `href="${escapeAttribute(localized)}"`,
      },
    ];
  };
  return replacements(fragment)
    .sort((left, right) => right.start - left.start)
    .reduce(
      (output, replacement) =>
        output.slice(0, replacement.start) +
        replacement.value +
        output.slice(replacement.end),
      html,
    );
};
