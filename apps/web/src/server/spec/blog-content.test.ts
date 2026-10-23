import { describe, expect, test } from "bun:test";
import { RETIRED_BLOG_POSTS } from "@/lib/blog-redirects";
import * as BlogContent from "@/server/utils/blog-content";

const frontmatter = (fields: Record<string, string>) =>
  [
    "---",
    ...Object.entries(fields).map(([key, value]) => `${key}: ${value}`),
    "---",
  ].join("\n");

const BASE = {
  title: "What shopping agents read",
  description: "The product data an AI shopping agent reads.",
  date: "2026-10-22",
};

const BODY = `
Agents read your product data.

## What they read

Titles, prices and stock.

## FAQ

### Do I need a new site?

No. Agents read the store you have.

### How often should I check?

When prices change.

## Sources

1. [UCP](https://ucp.dev), checked October 2026.
`;

const file = (
  fields: Record<string, string> = BASE,
  body = BODY,
  slug = "what-shopping-agents-read",
) => ({
  path: `content/blog/${slug}.md`,
  raw: `${frontmatter(fields)}\n${body}`,
});

const parse = (...args: Parameters<typeof file>) =>
  BlogContent.parse(file(...args));

const rules = (report: BlogContent.Report) =>
  report.errors.map((issue) => issue.rule);

describe("frontmatter", () => {
  test("a complete post parses into the row values", () => {
    const report = parse({
      ...BASE,
      keyword: "ai shopping agents",
      tags: "[ai shopping, product data]",
      image: "/blog/what-shopping-agents-read.png",
    });

    expect(report.errors).toEqual([]);
    expect(report.post).toMatchObject({
      slug: "what-shopping-agents-read",
      title: "What shopping agents read",
      publishedAt: "2026-10-22",
      category: "ai shopping agents",
      tags: ["ai shopping", "product data"],
      thumbnailUrl: "/blog/what-shopping-agents-read.png",
      draft: false,
    });
    expect(report.images).toEqual(["/blog/what-shopping-agents-read.png"]);
  });

  test("the BabyLoveGrowth spellings are accepted", () => {
    const report = parse({
      title: BASE.title,
      meta_description: BASE.description,
      published_at: BASE.date,
      seedKeyword: "agent checkout",
      keywords: "agents, checkout",
      hero_image_url: "https://media.example.com/hero.png",
    });

    expect(report.errors).toEqual([]);
    expect(report.post).toMatchObject({
      description: BASE.description,
      publishedAt: "2026-10-22",
      category: "agent checkout",
      tags: ["agents", "checkout"],
      thumbnailUrl: "https://media.example.com/hero.png",
    });
  });

  test("a canonical key wins over its alias", () => {
    const report = parse({ ...BASE, metaDescription: "The alias." });
    expect(report.post?.description).toBe(BASE.description);
  });

  test("an unknown key is a warning, not an error", () => {
    const report = parse({ ...BASE, readingTime: "5 min" });
    expect(report.errors).toEqual([]);
    expect(report.warnings.map((issue) => issue.message)).toEqual([
      '"readingTime" is not a known field and is ignored',
    ]);
  });

  test("defaults: Guide category, tags from the keyword, no image", () => {
    expect(parse().post).toMatchObject({
      category: "Guide",
      tags: [],
      thumbnailUrl: null,
    });
    expect(parse({ ...BASE, keyword: "ucp" }).post?.tags).toEqual(["ucp"]);
  });

  test("a full ISO timestamp is cut to the day", () => {
    expect(
      parse({ ...BASE, date: "2026-10-22T09:30:00Z" }).post?.publishedAt,
    ).toBe("2026-10-22");
  });

  test("required fields are reported with their line", () => {
    const report = parse({ title: BASE.title, date: "22/10/2026" });
    expect(report.post).toBeNull();
    expect(report.errors).toContainEqual(
      expect.objectContaining({
        line: 3,
        message: "date must be YYYY-MM-DD",
      }),
    );
    expect(report.errors).toContainEqual(
      expect.objectContaining({ message: "description is required" }),
    );
  });

  test("a description of 160 characters or more fails", () => {
    expect(rules(parse({ ...BASE, description: "a".repeat(159) }))).toEqual([]);
    expect(
      parse({ ...BASE, description: "a".repeat(160) }).errors.map(
        (issue) => issue.message,
      ),
    ).toEqual(["description must be under 160 characters"]);
  });

  test("an image that could break out of a CSS url() is refused", () => {
    for (const image of [
      "/blog/hero (1).png",
      "http://example.com/hero.png",
      "/blog/../secrets.png",
      "/blog/hero.svg",
      "//example.com/hero.png",
    ])
      expect(rules(parse({ ...BASE, image }))).toEqual(["frontmatter"]);
  });

  test("draft is a real boolean", () => {
    expect(parse({ ...BASE, draft: "true" }).post?.draft).toBe(true);
    expect(rules(parse({ ...BASE, draft: "yes" }))).toEqual(["frontmatter"]);
  });

  test("a non-default author is a warning: the byline is fixed", () => {
    const report = parse({ ...BASE, author: "Okara" });
    expect(report.errors).toEqual([]);
    expect(report.warnings.map((issue) => issue.rule)).toEqual(["author"]);
  });

  test("missing frontmatter and broken YAML fail without throwing", () => {
    expect(
      rules(BlogContent.parse({ path: "content/blog/x.md", raw: "# Hi" })),
    ).toEqual(["frontmatter"]);
    expect(
      rules(
        BlogContent.parse({
          path: "content/blog/x.md",
          raw: "---\ntitle: [unclosed\n---\nBody\n",
        }),
      ),
    ).toContain("frontmatter");
  });
});

describe("slug", () => {
  test("the file name must be a slug", () => {
    expect(rules(parse(BASE, BODY, "Bad_Slug"))).toEqual(["slug"]);
  });

  test("a frontmatter slug must match the file name", () => {
    expect(rules(parse({ ...BASE, slug: "something-else" }))).toEqual(["slug"]);
    expect(
      rules(parse({ ...BASE, slug: "what-shopping-agents-read" })),
    ).toEqual([]);
  });

  test("a retired slug is refused, since it only redirects", () => {
    const [retired] = [...RETIRED_BLOG_POSTS.keys()];
    expect(retired).toBeDefined();
    expect(rules(parse(BASE, BODY, retired))).toEqual(["slug"]);
  });

  test("two files cannot publish the same slug", () => {
    const reports = BlogContent.validate([file(), file()]);
    expect(reports.every((report) => report.post === null)).toBe(true);
    expect(reports[0]?.errors.at(-1)?.message).toBe(
      "another file also publishes /blog/what-shopping-agents-read",
    );
  });
});

describe("FAQ extraction", () => {
  test("each ### under ## FAQ is a question; the section ends at the next ##", () => {
    expect(parse().post?.faqs).toEqual([
      {
        question: "Do I need a new site?",
        answer: "No. Agents read the store you have.",
      },
      { question: "How often should I check?", answer: "When prices change." },
    ]);
  });

  test("answers are plain text, lists kept as lines", () => {
    const body = `
## Frequently asked questions

### What does it read?

Mostly **titles** and [prices](https://example.com).

- stock
- shipping

### No answer here?
`;
    expect(parse(BASE, body).post?.faqs).toEqual([
      {
        question: "What does it read?",
        answer: "Mostly titles and prices.\n\n- stock\n- shipping",
      },
    ]);
  });

  test("a post without an FAQ has no pairs", () => {
    expect(parse(BASE, "\nJust a paragraph.\n").post?.faqs).toEqual([]);
  });

  test("an FAQ heading with no questions under it fails", () => {
    expect(rules(parse(BASE, "\nIntro.\n\n## FAQ\n\nSome text.\n"))).toEqual([
      "faq",
    ]);
  });

  test("the FAQ stays in the body, so the page does not render it twice", () => {
    expect(parse().post?.contentHtml).toContain("<h2>FAQ</h2>");
  });
});

describe("rendering", () => {
  test("output is the plain HTML shape BabyLoveGrowth stores", () => {
    const html = parse().post?.contentHtml ?? "";
    expect(html).toContain("<h2>What they read</h2>");
    expect(html).toContain("<h3>Do I need a new site?</h3>");
    expect(html).toContain("<ol>\n<li>");
  });

  test("external links get target and rel; internal links are left alone", () => {
    const html =
      parse(
        BASE,
        "\nSee [pricing](/pricing), [us](https://www.ecentic.ai/x) and [them](https://vendor.example/pricing).\n",
      ).post?.contentHtml ?? "";
    expect(html).toContain('<a href="/pricing">pricing</a>');
    expect(html).toContain('<a href="https://www.ecentic.ai/x">us</a>');
    expect(html).toContain(
      '<a href="https://vendor.example/pricing" target="_blank" rel="noopener">them</a>',
    );
  });

  test("ampersands use named references the section splitter decodes", () => {
    expect(
      parse(BASE, "\n## Shopify & WooCommerce\n\nText.\n").post?.contentHtml,
    ).toContain("<h2>Shopify &amp; WooCommerce</h2>");
  });

  test("raw HTML is an error rather than silently dropped", () => {
    const report = parse(
      BASE,
      '\nText <script>alert(1)</script>\n\n<iframe src="https://evil.example"></iframe>\n\n<img src=x onerror="alert(1)">\n',
    );
    expect(report.post).toBeNull();
    expect(new Set(rules(report))).toEqual(new Set(["raw-html"]));
  });

  test("HTML comments are allowed and not published", () => {
    const report = parse(BASE, "\nText.\n\n<!-- editor note -->\n");
    expect(report.errors).toEqual([]);
    expect(report.post?.contentHtml).not.toContain("editor note");
  });

  test("a javascript: link is an error, and never reaches the HTML", () => {
    expect(rules(parse(BASE, "\n[click](javascript:alert(1))\n"))).toEqual([
      "link",
    ]);
  });

  test("only the first line may be a # heading", () => {
    expect(rules(parse(BASE, "\n# Title\n\nText.\n"))).toEqual([]);
    expect(rules(parse(BASE, "\nText.\n\n# Another\n"))).toEqual(["heading"]);
  });

  test("footnote links point at ids that exist", () => {
    const html =
      parse(BASE, "\nA claim.[^1]\n\n[^1]: The source.\n").post?.contentHtml ??
      "";
    expect(html).toContain('href="#user-content-fn-1"');
    expect(html).toContain('id="user-content-fn-1"');
  });

  test("body images are listed for the existence check", () => {
    expect(
      parse(
        BASE,
        "\n![chart](/blog/chart.png)\n\n![x](https://a.example/b.png)\n",
      ).images,
    ).toEqual(["/blog/chart.png"]);
  });
});

describe("change detection", () => {
  const post = (fields: Record<string, string> = BASE, body = BODY) => {
    const report = parse(fields, body);
    if (!report.post) throw new Error("fixture does not parse");
    return report.post;
  };

  const row = (
    locale: "en" | "es",
    source: string,
    externalId: string | null,
    slug = "what-shopping-agents-read",
  ) => ({ slug, locale, source, externalId });

  const plan = (
    posts: BlogContent.Post[],
    rows: BlogContent.StoredRow[],
    slugs = posts.map((entry) => entry.slug),
  ) => BlogContent.plan({ posts, rows, slugs: new Set(slugs) });

  test("the external id is the path plus a hash of the file", () => {
    expect(post().externalId).toMatch(
      /^content\/blog\/what-shopping-agents-read\.md#[0-9a-f]{64}$/,
    );
  });

  test("a post already stored from these exact bytes needs nothing", () => {
    const current = post();
    expect(
      plan(
        [current],
        [
          row("en", "repo", current.externalId),
          row("es", "repo", current.externalId),
        ],
      ).pending,
    ).toEqual([]);
  });

  test("changing one sentence re-ingests that post", () => {
    const before = post();
    const after = post(BASE, BODY.replace("Titles", "Titles, images"));
    expect(after.externalId).not.toBe(before.externalId);
    expect(
      plan(
        [after],
        [
          row("en", "repo", before.externalId),
          row("es", "repo", before.externalId),
        ],
      ).pending.map((entry) => entry.slug),
    ).toEqual(["what-shopping-agents-read"]);
  });

  test("an English row whose Spanish translation failed is retried", () => {
    const current = post();
    const before = post(BASE, `${BODY}\nOld.\n`);
    expect(
      plan(
        [current],
        [
          row("en", "repo", current.externalId),
          row("es", "repo", before.externalId),
        ],
      ).pending,
    ).toHaveLength(1);
    expect(
      plan([current], [row("en", "repo", current.externalId)]).pending,
    ).toHaveLength(1);
  });

  test("posts with no rows go first, then missing a locale, then stale", () => {
    const fresh = BlogContent.parse(file(BASE, BODY, "fresh")).post;
    const halfway = BlogContent.parse(file(BASE, BODY, "halfway")).post;
    const stale = BlogContent.parse(file(BASE, BODY, "stale")).post;
    if (!fresh || !halfway || !stale) throw new Error("fixture");

    const result = plan(
      [stale, halfway, fresh],
      [
        row("en", "repo", "old", "stale"),
        row("es", "repo", "old", "stale"),
        row("en", "repo", halfway.externalId, "halfway"),
      ],
    );
    expect(result.pending.map((entry) => entry.slug)).toEqual([
      "fresh",
      "halfway",
      "stale",
    ]);
  });

  test("drafts are never pending", () => {
    expect(plan([post({ ...BASE, draft: "true" })], []).pending).toEqual([]);
  });

  test("repo rows without a file are orphaned; an invalid file is not", () => {
    const result = plan(
      [],
      [
        row("en", "repo", "x", "deleted-post"),
        row("es", "repo", "x", "deleted-post"),
        row("en", "repo", "x", "broken-post"),
        row("en", "blg", "123", "a-blg-post"),
      ],
      ["broken-post"],
    );
    expect(result.orphaned).toEqual(["deleted-post"]);
  });
});

describe("slug clash with BabyLoveGrowth", () => {
  const takeover = BlogContent.parse(file(BASE, BODY, "rank-in-chatgpt")).post;

  test("a repo file claims a slug whose rows came from BLG", () => {
    if (!takeover) throw new Error("fixture");
    const rows = [
      { slug: "rank-in-chatgpt", locale: "en", source: "blg", externalId: "1" },
      { slug: "rank-in-chatgpt", locale: "es", source: "blg", externalId: "1" },
    ];
    expect(BlogContent.isRepoOwned(rows)).toBe(false);
    expect(
      BlogContent.plan({
        posts: [takeover],
        rows,
        slugs: new Set(["rank-in-chatgpt"]),
      }).pending.map((entry) => entry.slug),
    ).toEqual(["rank-in-chatgpt"]);
  });

  test("once any locale row is the repo's, BLG writes skip the slug", () => {
    expect(
      BlogContent.isRepoOwned([
        {
          slug: "rank-in-chatgpt",
          locale: "en",
          source: "repo",
          externalId: "x",
        },
        {
          slug: "rank-in-chatgpt",
          locale: "es",
          source: "blg",
          externalId: "1",
        },
      ]),
    ).toBe(true);
  });
});

describe("voice check", () => {
  const check = (body: string) =>
    BlogContent.checkVoice(`${frontmatter(BASE)}\n${body}`);

  test("em dashes and double hyphens in prose are flagged with their line", () => {
    expect(check("\nOne — two.\n\nThree -- four.\n")).toEqual([
      expect.objectContaining({ line: 7, rule: "em-dash" }),
      expect.objectContaining({ line: 9, rule: "double-hyphen" }),
    ]);
  });

  test("dashes that are markdown syntax, code, URLs or comments pass", () => {
    const body = `
| Plan | Price |
| --- | ---: |
| A | $1 |

---

Run \`bun install --frozen-lockfile\` first.

\`\`\`bash
git log --oneline
\`\`\`

See [the docs](https://example.com/a--b).

<!-- reviewer -- note -->
`;
    expect(check(body)).toEqual([]);
  });

  test("banned words match whole words, any case", () => {
    expect(
      check("\nWe Leverage data.\n").map((issue) => issue.message),
    ).toEqual(['"Leverage"']);
    expect(check("\nWe leveraged data and harnesses.\n")).toEqual([]);
  });

  test("phrases match across curly apostrophes and line breaks", () => {
    expect(check("\nIt’s worth\nnoting that.\n")).toEqual([
      expect.objectContaining({
        line: 7,
        rule: "wording",
        message: '"It’s worth noting"',
      }),
    ]);
  });

  test("a Conclusion or Final thoughts heading is flagged", () => {
    expect(
      check(
        "\n## Conclusion\n\n## Final thoughts:\n\n## Conclusions we drew\n",
      ).map((issue) => issue.rule),
    ).toEqual(["heading", "heading"]);
  });

  test('"paying customers" is flagged', () => {
    expect(check("\nOur paying customers love it.\n")).toHaveLength(1);
  });

  test("private store names are flagged everywhere, code included", () => {
    const issues = BlogContent.checkVoice(
      `${frontmatter({ ...BASE, title: "What Flaviar taught us" })}\n\nWe audited \`red bull shop\`.\n`,
    );
    expect(issues.map((issue) => [issue.line, issue.rule])).toEqual([
      [2, "private-name"],
      [7, "private-name"],
    ]);
  });

  test("a voice hit keeps the post from publishing", () => {
    const report = parse(BASE, `${BODY}\nThis is a seamless flow.\n`);
    expect(report.post).toBeNull();
    expect(rules(report)).toEqual(["wording"]);
  });
});
