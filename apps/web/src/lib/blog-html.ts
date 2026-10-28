import { isLocale, type Locale, routing } from "@/i18n/routing";
import { RETIRED_BLOG_POSTS } from "@/lib/blog-redirects";
import { isOptimizable, optimizedUrl } from "@/lib/image-hosts";
import { seo } from "@/lib/seo";

export type BlogHtmlSection = {
  number: string;
  title: string;
  html: string;
};

/**
 * Headings are CMS content, so section classification has to be matched per
 * locale. Spanish bodies are Azure translations of the English article, so the
 * English-only patterns let "Tabla de contenidos" / "Recomendado" through as
 * ordinary numbered sections and never found "Conclusiones clave" for the `00`
 * lead — /es posts rendered three spurious sections and an English
 * "Introduction" heading.
 */
const STRUCTURE = {
  en: {
    skip: new Set(["table of contents", "recommended"]),
    takeaways: /^key takeaways?$/i,
    faq: /^(faqs?|frequently asked questions)\b/i,
    editorialFaq: /\b(faqs?|frequently asked questions)\b/i,
    introduction: "Introduction",
    article: "Article",
  },
  es: {
    skip: new Set([
      "tabla de contenidos",
      "tabla de contenido",
      "índice",
      "recomendado",
      "recomendados",
    ]),
    takeaways: /^(conclusiones?|puntos?|ideas?) clave$/i,
    faq: /^(faqs?|preguntas\s+(m[áa]s\s+)?frecuentes)\b/i,
    editorialFaq: /\b(faqs?|preguntas\s+(m[áa]s\s+)?frecuentes)\b/i,
    introduction: "Introducción",
    article: "Artículo",
  },
} as const satisfies Record<
  Locale,
  {
    skip: ReadonlySet<string>;
    takeaways: RegExp;
    faq: RegExp;
    editorialFaq: RegExp;
    introduction: string;
    article: string;
  }
>;

const structureFor = (locale: string) =>
  isLocale(locale) ? STRUCTURE[locale] : STRUCTURE[routing.defaultLocale];

/**
 * Whether a CMS body already carries its own FAQ block. Only decides whether
 * the page renders a *second*, visible one from `blog_post.faqs` — the stored
 * pairs are what the `FAQPage` JSON-LD is built from either way, so a heading
 * this misses costs a duplicated section on screen, never missing structured
 * data. BabyLoveGrowth writes "FAQ"; its Spanish translations vary.
 *
 * Anchored on purpose: a CMS heading that merely mentions FAQs ("How to add FAQ
 * schema") is an ordinary section, and matching it would hide the real block.
 */
export const hasFaqSection = (
  sections: readonly BlogHtmlSection[],
  locale: string = routing.defaultLocale,
) => sections.some((section) => isFaqHeading(section.title, locale));

/**
 * The heading test behind `hasFaqSection`, shared with the repo-post renderer
 * so the FAQ it extracts into `faqs` is the same block the page later hides.
 */
export const isFaqHeading = (
  title: string,
  locale: string = routing.defaultLocale,
) => structureFor(locale).faq.test(title.trim());

/**
 * The same question for an editorial post's own `sections`, where FAQ prose used
 * to live before `blog_post.faqs` existed. Rows written back then still carry
 * it, so the page drops the section rather than print the same answers twice —
 * which is what lets the stored pairs land before the code that reads them.
 *
 * Unanchored, unlike `hasFaqSection`: these titles are ours and include forms
 * like "How to choose (and FAQ)", and the section this hides is one whose
 * content the `faqs` column already holds.
 */
export const isFaqSectionTitle = (
  title: string,
  locale: string = routing.defaultLocale,
) => structureFor(locale).editorialFaq.test(title.trim());

const stripTags = (value: string) =>
  value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

const stripScripts = (html: string) =>
  html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").trim();

const isExternal = (href: string) =>
  /^https?:\/\//i.test(href) &&
  URL.canParse(href) &&
  new URL(href).hostname.replace(/^www\./, "") !== new URL(seo.host).hostname;

/**
 * CMS bodies decide per link whether it is followed, and the ones left followed
 * include the vendor's own partner placements. Qualify every outbound link the
 * same way, so no article passes ranking credit on someone else's behalf.
 */
const qualifyExternalLinks = (html: string) =>
  html.replace(/<a\b[^>]*>/gi, (anchor) => {
    const href = anchor.match(/\bhref\s*=\s*(["'])(.*?)\1/i)?.[2];
    if (!href || !isExternal(href)) return anchor;
    return anchor
      .replace(/\s+rel\s*=\s*(["']).*?\1/i, "")
      .replace(/\s*>$/, ' rel="nofollow noopener noreferrer">');
  });

/**
 * Widths `/_next/image` serves for an article image — Next's default
 * `deviceSizes`; any other `w` is a 400. The article rail is ~720px wide on a
 * desktop, so 1200 covers it at a high density and the rest cover phones.
 */
const ARTICLE_IMAGE_WIDTHS = [640, 828, 1080, 1200] as const;

// Escaped for an HTML attribute: this lands in a raw HTML string.
const optimizerUrl = (source: string, width: number) =>
  optimizedUrl(source, width).replaceAll("&", "&amp;");

/**
 * CMS bodies carry bare `<img src>` tags at the uploaded size — ~140KB title
 * cards and diagrams, none lazy — so every image in an article downloaded with
 * its first screen. Each image is made lazy and async-decoded, and one the
 * optimizer can fetch is re-pointed at `/_next/image` with a `srcset`, which
 * sizes it to the rail and serves AVIF or WebP. A tag that brings its own
 * `srcset` keeps it.
 */
const optimizeImages = (html: string) =>
  html.replace(/<img\b([^>]*?)\s*\/?>/gi, (_tag, attributes: string) => {
    const hints = [
      /\sloading\s*=/i.test(attributes) ? "" : ' loading="lazy"',
      /\sdecoding\s*=/i.test(attributes) ? "" : ' decoding="async"',
    ].join("");
    const source = attributes
      .match(/\ssrc\s*=\s*(["'])(.*?)\1/i)?.[2]
      ?.replaceAll("&amp;", "&");

    if (!source || /\ssrcset\s*=/i.test(attributes) || !isOptimizable(source))
      return `<img${attributes}${hints}>`;

    const srcset = ARTICLE_IMAGE_WIDTHS.map(
      (width) => `${optimizerUrl(source, width)} ${width}w`,
    ).join(", ");
    const optimized = attributes.replace(
      /\ssrc\s*=\s*(["']).*?\1/i,
      () =>
        ` src="${optimizerUrl(source, 1080)}" srcset="${srcset}" sizes="(max-width: 768px) 100vw, 720px"`,
    );

    return `<img${optimized}${hints}>`;
  });

/** The replacement for a link to a retired post, or `null` for any other link. */
const retiredPostHref = (href: string) => {
  if (!URL.canParse(href, seo.host)) return null;
  const url = new URL(href, seo.host);
  if (url.hostname.replace(/^www\./, "") !== new URL(seo.host).hostname)
    return null;
  const slug = url.pathname.match(/^(?:\/es)?\/blog\/([^/]+)\/?$/)?.[1];
  const target = slug && RETIRED_BLOG_POSTS.get(slug);
  if (!target) return null;
  return href.replace(`/blog/${slug}`, `/blog/${target}`);
};

/**
 * A retired post keeps a permanent redirect, but a CMS link that still names it
 * costs every reader a hop and keeps telling crawlers the old URL is live. Point
 * it at the post that replaced it — same host form, locale prefix, query and
 * fragment.
 */
const retargetRetiredLinks = (html: string) =>
  html.replace(/<a\b[^>]*>/gi, (anchor) => {
    const href = anchor.match(/\bhref\s*=\s*(["'])(.*?)\1/i)?.[2];
    const target = href ? retiredPostHref(href) : null;
    if (!href || !target) return anchor;
    return anchor.replace(href, () => target);
  });

/**
 * A CMS post arrives with a dozen or more near-identical search phrases as its
 * tags. Printed in full — as chips, `keywords` meta and JSON-LD — that is a
 * keyword list, not navigation; the first few are the ones the article is about.
 */
export const leadingTags = (tags: readonly string[]) => tags.slice(0, 3);

/** Keep wide CMS tables inside the right rail without blowing out the 5fr/8fr grid. */
const wrapScrollableTables = (html: string) =>
  html.replace(
    /<table\b[\s\S]*?<\/table>/gi,
    (table) => `<div class="blog-table-scroll">${table}</div>`,
  );

/**
 * Split BabyLoveGrowth (or other CMS) article HTML into editorial sections.
 * Each `<h2>` becomes a left-rail title; its following siblings become the
 * right-rail body. Skips TOC / Recommended blocks that the split UI replaces.
 */
export const splitBlogHtmlByH2 = (
  html: string,
  // `blog_post.locale` is a plain text column, so narrow rather than index
  // blindly — an unexpected value must degrade to English, not crash the page.
  locale: string = routing.defaultLocale,
): BlogHtmlSection[] => {
  const structure = isLocale(locale)
    ? STRUCTURE[locale]
    : STRUCTURE[routing.defaultLocale];
  const isTakeaways = (title: string) => structure.takeaways.test(title.trim());

  const withoutScripts = optimizeImages(
    qualifyExternalLinks(retargetRetiredLinks(stripScripts(html))),
  );
  const withoutLeadingTitle = withoutScripts.replace(
    /^\s*<h1\b[^>]*>[\s\S]*?<\/h1>\s*/i,
    "",
  );

  const headingPattern = /<h2\b[^>]*>([\s\S]*?)<\/h2>/gi;
  const matches = [...withoutLeadingTitle.matchAll(headingPattern)];

  if (matches.length === 0) {
    const trimmed = withoutLeadingTitle.trim();
    if (!trimmed) return [];
    return [
      {
        number: "01",
        title: structure.article,
        html: wrapScrollableTables(trimmed),
      },
    ];
  }

  const preface = withoutLeadingTitle.slice(0, matches[0]?.index ?? 0).trim();

  const extracted = matches
    .map((match, index) => {
      const heading = match[0];
      const title = stripTags(match[1] ?? "") || structure.article;
      const start = (match.index ?? 0) + match[0].length;
      const end =
        index + 1 < matches.length
          ? (matches[index + 1]?.index ?? withoutLeadingTitle.length)
          : withoutLeadingTitle.length;
      const body = withoutLeadingTitle.slice(start, end).trim();
      // Keep the heading in the article body as well as the left rail.
      // Keep the heading in the article body as well as the left rail.
      return {
        title,
        html: [heading, body].filter(Boolean).join("\n").trim(),
      };
    })
    .filter((section) => {
      if (structure.skip.has(section.title.toLowerCase())) return false;
      return Boolean(section.title.trim() || section.html.trim());
    });

  const takeaways = extracted.find((section) => isTakeaways(section.title));
  const body = extracted.filter((section) => !isTakeaways(section.title));

  // Keep hero/intro markup, but fold it into Key Takeaways (or the first
  // body section) so the left rail matches local editorial posts: 00 first.
  const leadHtml = [preface, takeaways?.html].filter(Boolean).join("\n").trim();

  return [
    ...(takeaways
      ? [
          {
            number: "00",
            title: takeaways.title,
            html: wrapScrollableTables(leadHtml),
          },
        ]
      : preface
        ? [
            {
              number: "00",
              title: structure.introduction,
              html: wrapScrollableTables(preface),
            },
          ]
        : []),
    ...body.map((section, index) => ({
      number: String(index + 1).padStart(2, "0"),
      title: section.title,
      html: wrapScrollableTables(section.html),
    })),
  ];
};
