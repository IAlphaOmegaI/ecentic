import { founder, seo } from "@/lib/seo";
import * as Blog from "@/server/app/blog";

/**
 * RSS 2.0 feed of the English blog — a second discovery path for new posts
 * besides the sitemap. Linked from the blog pages' `<head>` as
 * `rel="alternate" type="application/rss+xml"`. English only, for the same
 * reason the sitemap is: the Spanish articles are noindexed machine
 * translations.
 */
const escapeXml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

export const GET = async () => {
  const posts = await Blog.listPublished("en");

  const items = posts.map((post) => {
    const url = `${seo.host}/blog/${post.slug}`;
    return [
      "<item>",
      `<title>${escapeXml(post.title)}</title>`,
      `<link>${url}</link>`,
      `<guid isPermaLink="true">${url}</guid>`,
      `<description>${escapeXml(post.description)}</description>`,
      `<pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>`,
      `<dc:creator>${escapeXml(founder.name)}</dc:creator>`,
      ...(post.category
        ? [`<category>${escapeXml(post.category)}</category>`]
        : []),
      "</item>",
    ].join("");
  });

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">',
    "<channel>",
    "<title>ecentic blog</title>",
    `<link>${seo.host}/blog</link>`,
    `<atom:link href="${seo.host}/rss.xml" rel="self" type="application/rss+xml"/>`,
    "<description>Guides and research on AI shopping optimization: how ChatGPT, Claude, Gemini and Perplexity choose products, and what merchants can change to get picked.</description>",
    "<language>en</language>",
    ...(posts[0]
      ? [
          `<lastBuildDate>${new Date(posts[0].updatedAt).toUTCString()}</lastBuildDate>`,
        ]
      : []),
    ...items,
    "</channel>",
    "</rss>",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
};
