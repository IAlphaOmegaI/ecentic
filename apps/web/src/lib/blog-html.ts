import { isLocale, type Locale, routing } from "@/i18n/routing";

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
    introduction: "Introducción",
    article: "Artículo",
  },
} as const satisfies Record<
  Locale,
  {
    skip: ReadonlySet<string>;
    takeaways: RegExp;
    introduction: string;
    article: string;
  }
>;

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

  const withoutScripts = stripScripts(html);
  const withoutLeadingTitle = withoutScripts.replace(
    /^\s*<h1\b[^>]*>[\s\S]*?<\/h1>\s*/i,
    "",
  );

  const headingPattern = /<h2\b[^>]*>([\s\S]*?)<\/h2>/gi;
  const matches = [...withoutLeadingTitle.matchAll(headingPattern)];

  if (matches.length === 0) {
    const trimmed = withoutLeadingTitle.trim();
    if (!trimmed) return [];
    return [{ number: "01", title: structure.article, html: trimmed }];
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
            html: leadHtml,
          },
        ]
      : preface
        ? [
            {
              number: "00",
              title: structure.introduction,
              html: preface,
            },
          ]
        : []),
    ...body.map((section, index) => ({
      number: String(index + 1).padStart(2, "0"),
      title: section.title,
      html: section.html,
    })),
  ];
};
