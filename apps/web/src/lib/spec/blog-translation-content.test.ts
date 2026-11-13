import { describe, expect, test } from "bun:test";
import { validateTranslationUnit } from "@/i18n/translation/runner";
import { hasFaqSection, splitBlogHtmlByH2 } from "../blog-html";
import { blogReadingMinutes, blogTopicSlug } from "../blog-locale";
import {
  type BlogTranslationSource,
  blogBatchContext,
  blogSourceHash,
  createBlogHtmlTranslation,
  createBlogTranslation,
  nextBlogTranslationBatch,
} from "../blog-translation-content";

const source: BlogTranslationSource = {
  slug: "sample",
  source: "repo",
  externalId: null,
  title: "A merchant guide",
  description: "Compare your product",
  introduction: "Start here.",
  category: "Catalogs",
  tags: ["Shopping agents"],
  takeaways: ["Keep the price unchanged."],
  faqs: [{ question: "How does it work?", answer: "Read [the guide](/docs)." }],
  sections: [
    {
      number: "01",
      title: "Connect",
      content: "Connect your store.\n\n- Import your catalog",
    },
  ],
  contentHtml: null,
  publishedAt: "2026-11-12",
  thumbnailUrl: "/example.png",
};

test("only reviewed protocol topic labels may use canonical acronym case", () => {
  const articleFor = (
    slug: string,
    origin: string,
    label = "ucp product profile",
  ) =>
    createBlogTranslation({
      ...source,
      slug,
      source: origin,
      category: label,
      tags: [label, label],
      contentHtml: `<p>${label}</p><code>ucp</code>`,
    });
  const article = articleFor("ucp-product-profile", "blg");
  const allowed = article.units.filter((unit) => unit.canonicalTerms);
  expect(allowed.map((unit) => unit.id)).toEqual(["meta.category", "tags.1"]);
  for (const unit of allowed) {
    expect(validateTranslationUnit(unit, "Profilo prodotto UCP", "it")).toEqual(
      [],
    );
    expect(validateTranslationUnit(unit, "Profilo prodotto ucp", "it")).toEqual(
      [],
    );
    for (const target of [
      "Profilo prodotto",
      "Profilo prodotto UCP UCP",
      "Profilo prodotto Ucp",
      "Profilo prodotto MCP",
    ]) {
      expect(
        validateTranslationUnit(unit, target, "it").length,
      ).toBeGreaterThan(0);
    }
    expect(
      validateTranslationUnit(
        { ...unit, text: "`ucp` product profile" },
        "Profilo prodotto `UCP`",
        "it",
      ).length,
    ).toBeGreaterThan(0);
    expect(
      validateTranslationUnit(
        { ...unit, text: "https://example.com/ucp product profile" },
        "Profilo prodotto https://example.com/UCP",
        "it",
      ).length,
    ).toBeGreaterThan(0);
  }
  for (const candidate of [
    articleFor("another-article", "blg"),
    articleFor("ucp-product-profile", "repo"),
    articleFor("ucp-product-profile", "blg", "ucp product profiles"),
  ]) {
    expect(candidate.units.some((unit) => unit.canonicalTerms)).toBe(false);
  }
  for (const id of ["tags.0", "html.body.0.0"]) {
    const unit = article.units.find((entry) => entry.id === id);
    if (!unit) throw new Error("Expected unannotated source label");
    expect(unit.canonicalTerms).toBeUndefined();
    expect(
      validateTranslationUnit(unit, "Profilo prodotto UCP", "it").length,
    ).toBeGreaterThan(0);
  }
});

test("only the reviewed owned pricing passage carries explicit dollar context", () => {
  const paragraph =
    "Every tool in this list charges a flat fee except one. I am biased here, obviously, but I think a store that gets little AI traffic today should not pay a few hundred dollars a month to find that out. That is the case our pay-as-you-go plan was built for.";
  const target =
    "这份清单中的工具，除了一款之外都收取固定费用。我显然有自己的立场，但我认为，一家目前从AI获得的流量很少的商店，不应该每月花几百美元来确认这一点。我们的按效果付费方案正是为这种情况设计的。";
  const unitFor = (slug: string, origin: string, text = paragraph) => {
    const article = createBlogTranslation({
      ...source,
      slug,
      source: origin,
      contentHtml: `<p>${text}</p>`,
    });
    const unit = article.units.find((entry) => entry.id === "html.body.0.0");
    if (!unit) throw new Error("Expected source paragraph");
    return unit;
  };
  const owned = unitFor("vizby-alternatives", "repo");
  expect(owned.dollarCurrency).toBe("USD");
  expect(validateTranslationUnit(owned, target, "zh-CN")).toEqual([]);
  expect(
    validateTranslationUnit(owned, target.replace("美元", "欧元"), "zh-CN")
      .length,
  ).toBeGreaterThan(0);
  for (const unit of [
    unitFor("another-article", "repo"),
    unitFor("vizby-alternatives", "blg"),
    unitFor(
      "vizby-alternatives",
      "repo",
      paragraph.replace("hundred dollars", "hundred Canadian dollars"),
    ),
  ]) {
    expect(unit.dollarCurrency).toBeUndefined();
    expect(
      validateTranslationUnit(unit, target, "zh-CN").length,
    ).toBeGreaterThan(0);
  }
});

test("the reviewed Compete verb heading translates without renaming the plan", () => {
  const heading =
    "Compete With Amazon in AI: Simulate Shopify and WooCommerce Feeds";
  const article = createBlogTranslation({
    ...source,
    title: heading,
    contentHtml: `<h2>${heading}</h2><p>Compete costs $14.90 per month.</p>`,
  });
  const headings = article.units.filter((unit) => unit.text === heading);
  expect(headings).toHaveLength(2);
  for (const unit of headings) {
    expect(unit.translatableTerms).toEqual(["Compete"]);
    expect(
      validateTranslationUnit(
        unit,
        "在AI购物中与Amazon竞争：模拟Shopify和WooCommerce商品数据源",
        "zh-CN",
      ),
    ).toEqual([]);
  }
  const plan = article.units.find((unit) =>
    unit.text.startsWith("Compete costs"),
  );
  if (!plan) throw new Error("Expected plan source unit");
  expect(plan.translatableTerms).toBeUndefined();
  expect(
    validateTranslationUnit(plan, "竞争方案每月$14.90。", "zh-CN").some(
      (issue) => issue.message.includes("Compete"),
    ),
  ).toBe(true);
});

test.each([
  [
    "Running Audits at Scale: What Actually Works",
    "Audits in großem Maßstab durchführen: Was tatsächlich funktioniert",
  ],
  [
    "How Do You Scale GEO Across a Larger Catalog?",
    "Wie weiten Sie GEO auf einen größeren Katalog aus?",
  ],
  [
    "What Actually Matters When You Scale This",
    "Was bei der Ausweitung wirklich zählt",
  ],
])(
  "ordinary heading %s translates without renaming the Scale plan",
  (heading, target) => {
    const article = createBlogTranslation({
      ...source,
      title: heading,
      contentHtml: `<h2>${heading}</h2><p>Scale costs $44.90 per month.</p>`,
    });
    const headings = article.units.filter((unit) => unit.text === heading);
    expect(headings).toHaveLength(2);
    for (const unit of headings) {
      expect(unit.translatableTerms).toEqual(["Scale"]);
      expect(validateTranslationUnit(unit, target, "de")).toEqual([]);
    }
    const plan = article.units.find((unit) =>
      unit.text.startsWith("Scale costs"),
    );
    if (!plan) throw new Error("Expected plan source unit");
    expect(plan.translatableTerms).toBeUndefined();
    expect(
      validateTranslationUnit(
        plan,
        "Wachstum kostet $44.90 pro Monat.",
        "de",
      ).some((issue) => issue.message.includes("Scale")),
    ).toBe(true);
  },
);

describe("blog translation preservation", () => {
  test("joins punctuation-only translations to an inline link without its old word separator", () => {
    const html =
      '<p>Use <a href="/features/product-listings?mode=all#example" rel="noopener">product listing optimization</a> \ttools.</p>';
    const article = createBlogHtmlTranslation(html);
    const targets = new Map([
      ["Use", "Usa gli strumenti per"],
      [
        "product listing optimization",
        "l’ottimizzazione delle schede prodotto",
      ],
      ["tools.", "."],
    ]);
    expect(
      article.apply(
        new Map(
          article.units.map((unit) => [
            unit.id,
            targets.get(unit.text) ?? unit.text,
          ]),
        ),
      ),
    ).toBe(
      '<p>Usa gli strumenti per <a href="/features/product-listings?mode=all#example" rel="noopener">l’ottimizzazione delle schede prodotto</a>.</p>',
    );
    for (const punctuation of [",", "...", "…", "。", "，", "、", "．"]) {
      const values = new Map(
        article.units.map((unit) => [
          unit.id,
          unit.text === "tools." ? punctuation : unit.text,
        ]),
      );
      expect(article.apply(values)).toContain(`</a>${punctuation}</p>`);
    }
  });

  test("punctuation joins preserve explicit target spacing, French spacing and newline layout", () => {
    const render = (prefix: string, target: string) => {
      const article = createBlogHtmlTranslation(
        `<p><a href="/docs">Guide</a>${prefix}word.</p>`,
      );
      return article.apply(
        new Map(
          article.units.map((unit) => [
            unit.id,
            unit.text === "word." ? target : unit.text,
          ]),
        ),
      );
    };
    for (const punctuation of [":", ";", "?", "!"]) {
      expect(render(" ", punctuation)).toBe(
        `<p><a href="/docs">Guide</a> ${punctuation}</p>`,
      );
    }
    for (const target of [" .", "\u00a0.", "\u202f;", ". ", ".\n"]) {
      expect(render(" ", target)).toBe(
        `<p><a href="/docs">Guide</a> ${target}</p>`,
      );
    }
    for (const prefix of ["\n  ", "\r\n\t", "\u00a0", "\u202f"]) {
      expect(render(prefix, ".")).toBe(
        `<p><a href="/docs">Guide</a>${prefix}.</p>`,
      );
    }
  });

  test("ordinary translated words retain all source spacing and protected HTML", () => {
    const html =
      '<p title="Keep  spacing"> \tRead <a href="https://example.com/a,b?q=word#part" data-copy=" . ">Guide</a> tools. \n</p><pre>  tools. </pre><code> tools.</code>';
    const article = createBlogHtmlTranslation(html);
    const values = new Map(
      article.units.map((unit) => [
        unit.id,
        unit.text === "tools." ? "strumenti." : unit.text,
      ]),
    );
    expect(article.apply(values)).toBe(
      html.replace("</a> tools.", "</a> strumenti."),
    );
    expect(article.units.filter((unit) => unit.text === "tools.")).toHaveLength(
      1,
    );
  });

  test("accessible attributes keep their explicit spacing when translated to punctuation", () => {
    const article = createBlogHtmlTranslation(
      '<img src="/a,b.png" alt="Description" title="Name">',
    );
    const values = new Map(
      article.units.map((unit) => [
        unit.id,
        unit.id.endsWith(".alt") ? " . " : " ; ",
      ]),
    );
    expect(article.apply(values)).toBe(
      '<img src="/a,b.png" alt=" . " title=" ; ">',
    );
  });

  test("translates visible and accessible text without serializing protected HTML", () => {
    const html = `<section id='intro' data-item="a>b"><h2>Product guide</h2>\n<p>Compare <strong>your listing</strong> now &amp; later.</p><a href='/docs?x=1&amp;y=2' title="Read &quot;docs&quot;">Read the guide</a><img src="/product.jpg" alt='A product' /><img src=/empty.png alt=""><script type='application/ld+json'>{"name":"Keep English JSON"}</script><pre><code>const title = "Do not translate";</code></pre><!-- keep exact --></section>`;
    const result = createBlogHtmlTranslation(html);
    const values = new Map(
      result.units.map((unit) => [unit.id, `FR ${unit.text}`]),
    );
    const translated = result.apply(values);
    expect(translated).toContain("<section id='intro' data-item=\"a>b\">");
    expect(translated).toContain("href='/docs?x=1&amp;y=2'");
    expect(translated).toContain('title="FR Read &quot;docs&quot;"');
    expect(translated).toContain("alt='FR A product'");
    expect(translated).toContain('<img src=/empty.png alt="">');
    expect(translated).toContain(
      '<pre><code>const title = "Do not translate";</code></pre>',
    );
    expect(translated).toContain(
      '<script type=\'application/ld+json\'>{"name":"Keep English JSON"}</script>',
    );
    expect(translated).toContain("FR now &amp; later.");
    expect(translated).toContain("<!-- keep exact -->");
    expect(
      result.units.some((unit) => unit.text.includes("Do not translate")),
    ).toBe(false);
  });

  test("keeps unquoted attribute syntax valid and escapes returned HTML text", () => {
    const result = createBlogHtmlTranslation(
      "<img src=/x alt=Product><p>Shop</p>",
    );
    const translated = result.apply(
      new Map(
        result.units.map((unit) => [
          unit.id,
          unit.id.includes("attribute") ? "Notre produit" : "<script>",
        ]),
      ),
    );
    expect(translated).toContain("alt=Notre&#32;produit");
    expect(translated).toContain("&lt;script&gt;");
  });

  test("never publishes partial arrays, answers or body content", () => {
    const article = createBlogTranslation(source);
    const values = new Map(
      article.units.map((unit) => [unit.id, `FR ${unit.text}`]),
    );
    values.delete("faqs.0.answer");
    expect(() => article.apply(values)).toThrow(
      "Missing translated article unit faqs.0.answer",
    );
    expect(() =>
      createBlogHtmlTranslation("<p>Required</p>").apply(new Map()),
    ).toThrow("Missing translated HTML unit");
  });

  test("source and policy changes invalidate checkpoints", () => {
    expect(blogSourceHash(source, "1")).not.toBe(
      blogSourceHash(
        { ...source, faqs: [{ question: "Changed?", answer: "Yes." }] },
        "1",
      ),
    );
    expect(blogSourceHash(source, "1")).not.toBe(blogSourceHash(source, "2"));
    const article = createBlogTranslation(source);
    const translated = article.apply(
      new Map(article.units.map((unit) => [unit.id, `FR ${unit.text}`])),
    );
    expect(translated.sections[0]?.number).toBe("01");
    expect(translated.publishedAt).toBe(source.publishedAt);
    expect(translated.thumbnailUrl).toBe(source.thumbnailUrl);
    expect(translated.source).toBe("repo");
  });

  test("CJK topics have useful slugs and reading times", () => {
    expect(blogTopicSlug("商品データ と AI")).toBe("商品データ-と-ai");
    expect(blogTopicSlug("商品 数据")).toBe("商品-数据");
    expect(
      blogReadingMinutes("商品情報を確認します。".repeat(300), "ja"),
    ).toBeGreaterThan(1);
    expect(
      blogReadingMinutes("比较商品价格与配送信息。".repeat(300), "zh-CN"),
    ).toBeGreaterThan(1);
  });

  test("recognizes localized FAQ headings without printing duplicate FAQs", () => {
    const samples = [
      ["fr", "Questions fréquentes"],
      ["de", "Häufig gestellte Fragen"],
      ["it", "Domande frequenti"],
      ["ja", "よくある質問"],
      ["zh-CN", "常见问题"],
    ] as const;
    for (const [locale, heading] of samples)
      expect(
        hasFaqSection(
          splitBlogHtmlByH2(`<h2>${heading}</h2><p>Answer</p>`, locale),
          locale,
        ),
      ).toBe(true);
  });
});

test("translation batches continue independent text without retrying rejected units", () => {
  const units = [
    { id: "done", text: "Already reviewed", context: "Paragraph" },
    {
      id: "blocked",
      text: "Needs a targeted correction",
      context: "Paragraph",
    },
    { id: "next", text: "Independent content", context: "Paragraph" },
  ];
  expect(
    nextBlogTranslationBatch(units, { done: "Terminé" }, 4500, {
      blocked: { text: "Rejected" },
    }).map((unit) => unit.id),
  ).toEqual(["next"]);
});

test("short HTML slots share a bounded batch without changing identity or order", () => {
  const units = Array.from({ length: 70 }, (_, index) => ({
    id: `html.${index}`,
    text: "Short fragment",
    context: "Inline article text",
  }));
  const selected = nextBlogTranslationBatch(units, {});
  expect(selected).toEqual(units.slice(0, 48));
  expect(
    selected.reduce((sum, unit) => sum + unit.text.length, 0),
  ).toBeLessThan(4500);
  expect(
    nextBlogTranslationBatch(
      units,
      Object.fromEntries(selected.map((unit) => [unit.id, "Texte"])),
    ).map((unit) => unit.id),
  ).toEqual(units.slice(48).map((unit) => unit.id));
});

test("inline paragraph slots stay together with an exact source layout", () => {
  const article = createBlogHtmlTranslation(
    "<p>Read <strong>the product</strong> carefully.</p><p>Then compare.</p>",
  );
  expect(
    new Set(article.units.slice(0, 3).map((unit) => unit.group)).size,
  ).toBe(1);
  expect(article.units[1]?.context).toContain(
    "<p>⟦html.body.0.0⟧ <strong>⟦html.body.0.1.0⟧</strong> ⟦html.body.0.2⟧</p>",
  );
  expect(nextBlogTranslationBatch(article.units, {}, 10, {}, 2)).toEqual(
    article.units.slice(0, 3),
  );
});

test("larger CLI batches preserve question-answer groups and the section outline", () => {
  const article = createBlogTranslation(source);
  expect(
    article.units.find((unit) => unit.id === "faqs.0.question")?.group,
  ).toBe("faqs.0");
  expect(article.units.find((unit) => unit.id === "faqs.0.answer")?.group).toBe(
    "faqs.0",
  );
  expect(article.documentContext).toContain("Section outline");
  expect(
    blogBatchContext(
      article.units,
      article.units.slice(0, 2),
      article.documentContext,
    ).documentContext,
  ).not.toContain("Import your catalog");
  expect(nextBlogTranslationBatch(article.units, {}, 10000, {}, 96)).toEqual(
    article.units,
  );
});

test("batch context includes relevant inline groups and nearby intact paragraphs only", () => {
  const article = createBlogHtmlTranslation(
    "<p>First nearby.</p><p>Read <strong>the product</strong> carefully.</p><p>Next nearby.</p><p>Another neighbor.</p><p>Distant source text.</p>",
  );
  const context = blogBatchContext(
    article.units,
    article.units.slice(1, 4),
    "Commerce article",
  );
  expect(context.documentContext).toContain("First nearby.");
  expect(context.documentContext).toContain("Another neighbor.");
  expect(context.documentContext).not.toContain("Distant source text.");
  expect(context.documentContext).toContain("⟦html.body.1.2⟧");
  expect(context.units.map((unit) => unit.text)).toContain("carefully.");
  expect(new Set(context.units.map((unit) => unit.context)).size).toBe(1);
});

test("source layouts preserve inline code, links, entities and omitted batch siblings", () => {
  const article = createBlogHtmlTranslation(
    '<p>A <a href="/catalog?a=1&amp;b=2">catalog</a> uses <code>data.a</code> &amp; <strong>verified facts</strong>.</p>',
  );
  const context = blogBatchContext(
    article.units,
    article.units.slice(0, 1),
    "Guide",
  );
  expect(context.documentContext).toContain('href=\\"/catalog?a=1&amp;b=2\\"');
  expect(context.documentContext).toContain("<code>data.a</code>");
  expect(context.documentContext).toContain('"text":"catalog"');
  expect(context.documentContext).toContain("&amp;");
  expect(context.documentContext).toContain("verified facts");
  expect(
    article.apply(new Map(article.units.map((unit) => [unit.id, unit.text]))),
  ).toBe(
    '<p>A <a href="/catalog?a=1&amp;b=2">catalog</a> uses <code>data.a</code> &amp; <strong>verified facts</strong>.</p>',
  );
});

test("only standalone grammatical articles outside links and attributes may be omitted", () => {
  const article = createBlogHtmlTranslation(
    '<p>The <a href="/guide" title="The">guide</a> explains <code>data.a</code>.</p><p><a href="/a"><strong>A</strong></a> fact.</p><p>The</p><p>A <strong>catalog</strong> entry.</p>',
  );
  const allowed = article.units.filter((unit) => unit.grammaticalArticle);
  expect(allowed.map((unit) => unit.text)).toEqual(["The", "A"]);
  for (const unit of allowed) {
    expect(validateTranslationUnit(unit, "", "ja")).toEqual([]);
    expect(validateTranslationUnit(unit, "", "zh-CN")).toEqual([]);
    expect(validateTranslationUnit(unit, "", "fr").length).toBeGreaterThan(0);
  }
  expect(allowed.every((unit) => unit.context.includes("Source layout"))).toBe(
    true,
  );
  const values = new Map(
    article.units.map((unit) => [
      unit.id,
      unit.grammaticalArticle ? "" : unit.text,
    ]),
  );
  const result = article.apply(values);
  expect(result).toContain(
    '<p> <a href="/guide" title="The">guide</a> explains <code>data.a</code>.</p>',
  );
  expect(result).toContain('<a href="/a"><strong>A</strong></a> fact.');
  expect(result).toContain("<p>The</p>");
  expect(result).toContain("<p> <strong>catalog</strong> entry.</p>");
  const linkLabel = article.units.find((unit) => unit.text === "guide");
  if (!linkLabel) throw new Error("Expected source link label");
  values.set(linkLabel.id, "");
  expect(() => article.apply(values)).toThrow("Missing translated HTML unit");
  values.set(linkLabel.id, linkLabel.text);
  const accessible = article.units.find((unit) =>
    unit.id.endsWith("attribute.title"),
  );
  if (!accessible) throw new Error("Expected source title attribute");
  values.set(accessible.id, "");
  expect(() => article.apply(values)).toThrow("Missing translated HTML unit");
});

test("batch instructions occur once while every inline scaffold and source slot remains", () => {
  const article = createBlogHtmlTranslation(
    Array.from(
      { length: 40 },
      (_, index) =>
        `<p>Read <a href="/guide/${index}">guide ${index}</a> with <code>data.${index}</code>.</p>`,
    ).join(""),
  );
  const context = blogBatchContext(
    article.units,
    article.units,
    "Commerce guide",
  );
  expect(context.documentContext.match(/Each ⟦id⟧/g)).toHaveLength(1);
  expect(context.units.map((unit) => [unit.id, unit.text, unit.group])).toEqual(
    article.units.map((unit) => [unit.id, unit.text, unit.group]),
  );
  expect(context.units.every((unit) => unit.context === "Article p text")).toBe(
    true,
  );
  for (const index of Array.from({ length: 40 }, (_, value) => value)) {
    expect(context.documentContext).toContain(`/guide/${index}`);
    expect(context.documentContext).toContain(`<code>data.${index}</code>`);
  }
});
