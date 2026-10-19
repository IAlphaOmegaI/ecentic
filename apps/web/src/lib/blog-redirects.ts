/**
 * Blog posts folded into another post: each retired slug maps to the post that
 * now answers its searches. One map drives every place a retired post could
 * still surface, so they cannot drift apart: the permanent redirects in
 * `next.config.ts` (EN and `/es`), the public catalog in `server/app/blog.ts`
 * (sitemap, llms.txt, RSS, index and tag pages, static params), and the links
 * CMS bodies still carry (`lib/blog-html.ts`). The rows stay in Postgres —
 * BabyLoveGrowth may re-send them, and the redirect still wins.
 *
 * No imports: `next.config.ts` loads this file, where path aliases do not
 * resolve.
 */

const SHOPPING_AGENT_PILLAR = "best-ai-shopping-agent-optimization-tools-2026";

export const RETIRED_BLOG_POSTS: ReadonlyMap<string, string> = new Map([
  // Three near-identical BLG how-tos ("…for AI Shopping Agents", the same
  // headings) split one intent. Search Console, 3 months to 2026-10-17: the
  // tools post drew 1,197 impressions at position 7.2 — the how-to queries
  // included — while these drew 4, 39 and 24, with no clicks.
  ["ai-shopping-agents", SHOPPING_AGENT_PILLAR],
  ["optimize-for-ai-overviews", SHOPPING_AGENT_PILLAR],
  ["optimize-for-shopping-bots", SHOPPING_AGENT_PILLAR],
]);
