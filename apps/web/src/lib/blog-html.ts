export type BlogHtmlSection = {
  number: string;
  title: string;
  html: string;
};

const SKIP_TITLES = new Set(["table of contents", "recommended"]);

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

const isTakeaways = (title: string) => /^key takeaways?$/i.test(title.trim());

/**
 * Split BabyLoveGrowth (or other CMS) article HTML into editorial sections.
 * Each `<h2>` becomes a left-rail title; its following siblings become the
 * right-rail body. Skips TOC / Recommended blocks that the split UI replaces.
 */
export const splitBlogHtmlByH2 = (html: string): BlogHtmlSection[] => {
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
    return [{ number: "01", title: "Article", html: trimmed }];
  }

  const preface = withoutLeadingTitle.slice(0, matches[0]?.index ?? 0).trim();

  const extracted = matches
    .map((match, index) => {
      const heading = match[0];
      const title = stripTags(match[1] ?? "") || "Article";
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
      if (SKIP_TITLES.has(section.title.toLowerCase())) return false;
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
              title: "Introduction",
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
