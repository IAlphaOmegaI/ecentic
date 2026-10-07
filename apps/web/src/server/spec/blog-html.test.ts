import { describe, expect, test } from "bun:test";
import { leadingTags, splitBlogHtmlByH2 } from "@/lib/blog-html";

const render = (html: string) =>
  splitBlogHtmlByH2(html)
    .map((section) => section.html)
    .join("\n");

describe("CMS article links", () => {
  test("an outbound link the CMS left followed is qualified", () => {
    const html = render(
      '<h2>Sources</h2><p>A partner’s <a href="https://partner.example/plan" target="_blank" rel="noopener">plan</a>.</p>',
    );

    expect(html).toContain(
      '<a href="https://partner.example/plan" target="_blank" rel="nofollow noopener noreferrer">',
    );
  });

  test("an outbound link with no rel gains one", () => {
    const html = render(
      '<h2>Sources</h2><p><a href="https://partner.example/">partner</a></p>',
    );

    expect(html).toContain(
      '<a href="https://partner.example/" rel="nofollow noopener noreferrer">',
    );
  });

  test("links to ecentic itself are left as written", () => {
    const anchors = [
      '<a href="https://ecentic.ai/pricing">pricing</a>',
      '<a href="https://www.ecentic.ai/blog">blog</a>',
      '<a href="/blog/rank-in-chatgpt">guide</a>',
      '<a href="#faq">FAQ</a>',
    ];
    const html = render(`<h2>Next</h2><p>${anchors.join(" ")}</p>`);

    for (const anchor of anchors) expect(html).toContain(anchor);
    expect(html).not.toContain("nofollow");
  });

  test("a lookalike host is still outbound", () => {
    const html = render(
      '<h2>Sources</h2><p><a href="https://ecentic.ai.partner.example/">x</a></p>',
    );

    expect(html).toContain('rel="nofollow noopener noreferrer"');
  });
});

describe("leadingTags", () => {
  test("keeps the first three tags in order", () => {
    expect(
      leadingTags([
        "best zero click seo tools",
        "zero click search tools",
        "how to improve zero click rate",
        "free zero click SEO tools",
        "top SEO tools for zero clicks",
      ]),
    ).toEqual([
      "best zero click seo tools",
      "zero click search tools",
      "how to improve zero click rate",
    ]);
  });

  test("returns a short list unchanged", () => {
    expect(leadingTags(["ai shopping agents"])).toEqual(["ai shopping agents"]);
  });
});
