import { describe, expect, test } from "bun:test";
import { leadingTags, splitBlogHtmlByH2 } from "@/lib/blog-html";
import { RETIRED_BLOG_POSTS } from "@/lib/blog-redirects";
import { isOptimizable } from "@/lib/image-hosts";

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

describe("links to retired posts", () => {
  const [retired, target] = [...RETIRED_BLOG_POSTS][0] ?? ["", ""];

  test("an absolute link points at the post that replaced it", () => {
    const html = render(
      `<h2>Next</h2><p><a href="https://ecentic.ai/blog/${retired}" target="_blank" rel="noopener">guide</a></p>`,
    );

    expect(html).toContain(
      `<a href="https://ecentic.ai/blog/${target}" target="_blank" rel="noopener">`,
    );
  });

  test("the link keeps its own host form, locale, query and fragment", () => {
    const html = render(
      [
        "<h2>Next</h2><p>",
        `<a href="/blog/${retired}">a</a>`,
        `<a href="https://www.ecentic.ai/es/blog/${retired}/?ref=x#faq">b</a>`,
        "</p>",
      ].join(""),
    );

    expect(html).toContain(`<a href="/blog/${target}">`);
    expect(html).toContain(
      `<a href="https://www.ecentic.ai/es/blog/${target}/?ref=x#faq">`,
    );
    expect(html).not.toContain(`/blog/${retired}`);
  });

  test("links to live posts and to other sites are left alone", () => {
    const anchors = [
      '<a href="/blog/rank-in-chatgpt">guide</a>',
      `<a href="/blog/${retired}-comparison">near miss</a>`,
      `<a href="/blog/tag/${retired}">tag</a>`,
    ];
    const html = render(`<h2>Next</h2><p>${anchors.join(" ")}</p>`);

    for (const anchor of anchors) expect(html).toContain(anchor);
    expect(
      render(
        `<h2>Sources</h2><p><a href="https://partner.example/blog/${retired}">x</a></p>`,
      ),
    ).toContain(`https://partner.example/blog/${retired}`);
  });
});

describe("RETIRED_BLOG_POSTS", () => {
  test("every post redirects straight to a live one", () => {
    for (const [slug, target] of RETIRED_BLOG_POSTS) {
      expect(target).not.toBe(slug);
      expect(RETIRED_BLOG_POSTS.has(target)).toBe(false);
    }
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

describe("CMS article images", () => {
  const card =
    "https://media.babylovegrowth.ai/blog-images/organization-49436/1792564518313_card.jpeg";

  test("an image on an optimizer host is resized through /_next/image", () => {
    const html = render(`<h2>Next</h2><p><img src="${card}" alt="A card"></p>`);
    const encoded = encodeURIComponent(card);

    expect(html).toContain(
      `src="/_next/image?url=${encoded}&amp;w=1080&amp;q=75"`,
    );
    expect(html).toContain(
      `/_next/image?url=${encoded}&amp;w=640&amp;q=75 640w`,
    );
    expect(html).toContain('sizes="(max-width: 768px) 100vw, 720px"');
    expect(html).toContain('alt="A card"');
    expect(html).toContain('loading="lazy" decoding="async"');
  });

  test("a local image is resized too", () => {
    const html = render(
      '<h2>Next</h2><p><img src="/blog/chart.png" alt=""></p>',
    );

    expect(html).toContain(
      'src="/_next/image?url=%2Fblog%2Fchart.png&amp;w=1080',
    );
  });

  test("an image on any other host is only made lazy", () => {
    const html = render(
      '<h2>Next</h2><p><img src="https://cdn.example.com/a.jpg" alt=""></p>',
    );

    expect(html).toContain(
      '<img src="https://cdn.example.com/a.jpg" alt="" loading="lazy" decoding="async">',
    );
  });

  test("an SVG, a set srcset and explicit loading are left as written", () => {
    const html = render(
      [
        "<h2>Next</h2>",
        '<p><img src="/blog/diagram.svg" alt=""></p>',
        `<p><img src="${card}" srcset="${card} 1x" alt=""></p>`,
        `<p><img src="${card}" loading="eager" alt=""></p>`,
      ].join(""),
    );

    expect(html).toContain(
      '<img src="/blog/diagram.svg" alt="" loading="lazy"',
    );
    expect(html).toContain(`srcset="${card} 1x"`);
    expect(html).not.toContain('loading="eager" alt="" loading="lazy"');
    expect(html.match(/loading="lazy"/g)?.length).toBe(2);
  });
});

describe("isOptimizable", () => {
  test("accepts local paths and the configured remote prefixes", () => {
    expect(isOptimizable("/images/blog/best-ai-tools.jpg")).toBe(true);
    expect(
      isOptimizable(
        "https://csuxjmfbwmkxiegfpljm.supabase.co/storage/v1/object/public/blog-images/a.jpeg",
      ),
    ).toBe(true);
  });

  test("refuses other paths, hosts, protocols and SVG", () => {
    expect(
      isOptimizable(
        "https://csuxjmfbwmkxiegfpljm.supabase.co/storage/private/a.jpeg",
      ),
    ).toBe(false);
    expect(
      isOptimizable(
        "https://media.babylovegrowth.ai.example.com/blog-images/a.jpeg",
      ),
    ).toBe(false);
    expect(
      isOptimizable("http://media.babylovegrowth.ai/blog-images/a.jpeg"),
    ).toBe(false);
    expect(isOptimizable("//media.babylovegrowth.ai/blog-images/a.jpeg")).toBe(
      false,
    );
    expect(isOptimizable("/images/logo.svg")).toBe(false);
  });
});
