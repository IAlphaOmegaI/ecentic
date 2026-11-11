import { describe, expect, test } from "bun:test";
import { splitBlogHtmlByH2 } from "../blog-html";

describe("blog presentation normalization", () => {
  test("keeps content and destinations while removing stored theme overrides", () => {
    const sections = splitBlogHtmlByH2(
      '<h2 style="font-weight:700">A heading</h2><p>Use <code>style="color:red"</code> as an example.</p><a href="/sign-up" style="background:#1572FA;color:white;font-weight:700">Get started</a><img src="/sample.png" alt="A product" style=width:100%>',
    );
    const html = sections.map((section) => section.html).join("\n");
    expect(html).toContain("<h2>A heading</h2>");
    expect(html).toContain('<code>style="color:red"</code>');
    expect(html).toContain('<a href="/sign-up">Get started</a>');
    expect(html).toContain('<img src="/sample.png" alt="A product">');
    expect(html).not.toContain("font-weight:700");
  });

  test("makes wide tables keyboard-focusable without changing their cells", () => {
    const [section] = splitBlogHtmlByH2(
      "<h2>Results</h2><table><thead><tr><th>Product</th><th>Result</th></tr></thead><tbody><tr><td>A</td><td>12</td></tr></tbody></table>",
    );
    expect(section?.html).toContain(
      '<div class="blog-table-scroll" tabindex="0"><table>',
    );
    expect(section?.html).toContain("<td>A</td><td>12</td>");
    expect(section?.html.match(/blog-table-scroll/g)).toHaveLength(1);
  });

  test("preserves style-like text inside quoted attributes", () => {
    const [section] = splitBlogHtmlByH2(
      `<h2>Example</h2><p title="Use style='color:red' in CSS" data-example='style="font-weight:700"'>Visible text</p>`,
    );
    expect(section?.html).toContain(`title="Use style='color:red' in CSS"`);
    expect(section?.html).toContain(
      'data-example="style=&quot;font-weight:700&quot;"',
    );
    expect(section?.html).toContain(">Visible text</p>");
  });

  test("removes styles after quoted angle brackets without changing destinations", () => {
    const [section] = splitBlogHtmlByH2(
      `<h2>Example</h2><a title="A > B" href="/guide?comparison=a>b&amp;style=color:red" STYLE="color:red;font-weight:700">Read A &gt; B</a><img alt='A < B' src="/product.png?size=small&amp;format=webp" style='width:100%'>`,
    );
    expect(section?.html).toContain('title="A > B"');
    expect(section?.html).toContain(
      'href="/guide?comparison=a>b&amp;style=color:red"',
    );
    expect(section?.html).toContain("Read A &gt; B</a>");
    expect(section?.html).toContain(
      '<img alt="A < B" src="/product.png?size=small&amp;format=webp">',
    );
    expect(section?.html).not.toMatch(/\sstyle=/i);
  });

  test("removes style elements while preserving escaped examples and template content", () => {
    const [section] = splitBlogHtmlByH2(
      '<h2>Example</h2><style>.blog-content p { color:red; font-weight:900 }</style><p>Keep this text.</p><pre><code>&lt;style&gt;p { color:red }&lt;/style&gt;</code></pre><template><style>p { color:blue }</style><p style="font-weight:900">Template text</p></template>',
    );
    expect(section?.html).not.toContain("<style>");
    expect(section?.html).not.toContain("font-weight:900");
    expect(section?.html).toContain("<p>Keep this text.</p>");
    expect(section?.html).toContain(
      "<code>&lt;style&gt;p { color:red }&lt;/style&gt;</code>",
    );
    expect(section?.html).toContain(
      "<template><p>Template text</p></template>",
    );
  });
});
