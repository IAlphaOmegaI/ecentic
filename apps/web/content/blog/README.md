# Blog posts

Every `.md` file in this folder, except this README, is a post on
[ecentic.ai/blog](https://ecentic.ai/blog). Merging a pull request that adds or
edits one publishes it in English at `/blog/<slug>` and in Spanish at
`/es/blog/<slug>`. The Spanish version is a machine translation made
automatically; never write it yourself.

If you are an AI writing tool opening a pull request here, this is the whole
contract. A post touches at most two places:

1. `apps/web/content/blog/<slug>.md`, the post itself.
2. `apps/web/public/blog/<slug>.png` (or `.jpg`, `.webp`), its hero image, if it has one.

Do not change any other file. Posts never go in `scripts/seed.ts`, a page
component, a database migration or a messages file.

## File name

The file name is the slug and the URL: `apps/web/content/blog/ai-shopping-agents.md`
is published at `https://ecentic.ai/blog/ai-shopping-agents`. Lowercase letters,
digits and single hyphens only.

To rewrite a post that is already live, edit its file, or, if the post has no
file here yet, add one with the same slug. The file replaces the live post in
both languages.

## Frontmatter

The file starts with a YAML block between two `---` lines.

| Field | Required | What it is |
|-------|----------|------------|
| `title` | yes | The headline. |
| `description` | yes | The meta description, under 160 characters. |
| `date` | yes | Publication date, `YYYY-MM-DD`. |
| `keyword` | no | The target search keyword. Shown as the post's category. |
| `tags` | no | A list of short topics. The first three are shown. Defaults to the keyword. |
| `image` | no | The hero image: `/blog/<slug>.png` for a file in `apps/web/public/blog/`, or an absolute `https://` URL. |
| `author` | no | Defaults to Xhurian Shaba, the byline every post is shown under. |
| `draft` | no | `true` keeps the post from being published. It does not take down a post that is already live. |

## Body

Plain markdown (GitHub-flavored: tables and lists work).

- Optionally start with the title as a `#` heading. Every other heading is `##` or deeper.
- Sections are `##` headings, in sentence case.
- Near the end, a `## FAQ` section with each question as a `###` heading and its answer under it. These questions also become the post's FAQ structured data for search engines.
- Close with a `## Sources` section: a numbered list of the primary sources, marked inline as `[1]`, `[2]`.
- No raw HTML. It is not published, so the check fails rather than let it disappear.
- Links are `https://...`, `mailto:...`, or a `/path` on ecentic.ai.
- Images inside the body work the same as the hero: `![alt text](/blog/<file>.png)` with the file in `apps/web/public/blog/`.

## Voice

Posts are written as Xhurian Shaba, co-founder and CEO of ecentic. Follow
[`docs/context/seo/blog-voice.md`](../../../../docs/context/seo/blog-voice.md),
which is the same text as Okara's article settings.

The check enforces the parts a machine can: no em dashes or double hyphens, no
words from the banned list (leverage, seamless, unlock and the rest), no
"Conclusion" or "Final thoughts" heading, no "paying customers", and never the
names of stores we audited or pilot with.

## Checks

Run from `apps/web`:

```bash
bun run blog:check
```

It runs on every pull request that touches this folder or `apps/web/public/blog/`,
and prints each problem with its file, line and a fix. A post that fails it is
not published even if merged.

## How a post goes live

1. The pull request is reviewed and merged into `main`, and Vercel deploys it.
2. Within about 15 minutes, the blog cron reads the post from the deployment,
   saves the English version and translates it to Spanish (a few minutes).
3. The cache is cleared and both pages update.

If the blog cron is busy with another post that tick, it takes the next one, so
plan on up to about 30 minutes. Editing a file later republishes it the same
way. Deleting a file does not take the post down; that is done by hand.

## Example

`apps/web/content/blog/what-shopping-agents-read.md`:

```markdown
---
title: What AI shopping agents read before they pick a product
description: A plain look at the product data ChatGPT and Gemini read when they choose what to recommend, and how a store can check its own.
date: 2026-10-22
keyword: ai shopping agents
tags: [ai shopping agents, product data]
image: /blog/what-shopping-agents-read.png
---

When someone asks an AI assistant for a product, it answers from the product data it can read: titles, prices, stock, shipping and reviews. If a field is missing, the agent picks a store that has it.

I think this is the least glamorous part of AI shopping and the part that decides most sales.

## What does the agent actually read?

Agents read the same feed and page data a search engine does, plus checkout details when they can buy inside the answer. Google documents its agent checkout standard, UCP, at ucp.dev [1].

## FAQ

### Do I need a new website for AI agents?

No. Agents read the store you already have. What changes is how complete and consistent the product data is.

### How often should I check my product data?

Whenever prices, stock or shipping rules change. A stale price is a reason for an agent to pick someone else.

## Sources

1. [Universal Commerce Protocol](https://ucp.dev), the specification site, checked October 2026.
```
