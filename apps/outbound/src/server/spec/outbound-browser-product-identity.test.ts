import { describe, expect, mock, test } from "bun:test";
import { createHash } from "node:crypto";
import type {
  BrowserResearch,
  RawCapture,
} from "@/server/utils/outbound/live-shopping-contract";

mock.module("server-only", () => ({}));
const Browser = await import("@/server/utils/outbound/live-shopping-browser");

// Synthetic split-name product page. No merchant capture or provider is needed.
const product = {
  name: "WIDE LEG JEANS | SHORE",
  url: "https://samplegoods.test/products/wide-leg-jeans-shore",
};
const receivedAt = "2026-11-27T14:58:22.453Z";
const now = Date.parse(receivedAt) + 1000;
const digest = (body: string) =>
  createHash("sha256").update(body).digest("hex");
const group = () => ({
  "@type": "ProductGroup",
  "@id": "/products/wide-leg-jeans-shore#product",
  name: product.name,
  url: product.url,
  category: "Jeans",
  hasVariant: [
    { "@type": "Product", name: "WIDE LEG JEANS | SHORE - SHORE / 00" },
  ],
});
const rendered = () => ({
  url: product.url,
  status: 200,
  checkedAt: receivedAt,
  title: "High-Rise Palazzo Jeans - Shore Dark Wash | Sample Goods",
  headings: ["Wide Leg Jeans"],
  text: "Wide Leg Jeans\nRegular price\n$78.00\nSeasonal promotion\nColor: Shore\nSize Guide\nSize\nSelect a size\nAdd to bag\nDetails\nHigh-rise\nWide legs\nSuper-stretch fabric\nDark wash\nStyle with\nOther Denim Jeans",
  structured: [JSON.stringify(group())],
  selected: ["Select a size"],
  locale: "en-US",
  screenshot: "c3ludGhldGljLW5vLWltYWdl",
});
type Rendered = ReturnType<typeof rendered>;
const raw = (url: string, body: string, status = 200): RawCapture => ({
  url,
  status,
  receivedAt,
  body,
  sha256: digest(body),
});
const execution = (page: Rendered = rendered()) =>
  raw(
    "https://api.firecrawl.dev/v2/interact/cce23dc1-ff37-49c3-a2a0-3c2c8c8a6ad0/execute",
    JSON.stringify({
      success: true,
      stdout: JSON.stringify(page),
      exitCode: 0,
      truncated: false,
    }),
  );
const held = (
  page = rendered(),
): Extract<BrowserResearch, { status: "held" }> => {
  const profile = raw(
    "https://samplegoods.test/.well-known/ucp",
    JSON.stringify({
      ucp: { capabilities: { "dev.ucp.shopping.catalog": {} } },
    }),
  );
  return {
    status: "held",
    reason:
      "The merchant product could not be verified in the rendered browser capture.",
    sources: [
      {
        id: "ucp",
        kind: "ucp",
        capture: "http",
        url: profile.url,
        checkedAt: profile.receivedAt,
        artifact: `sha256:${profile.sha256}`,
        content: `HTTP 200\n${profile.body}`,
      },
    ],
    raw: [
      raw("https://samplegoods.test/robots.txt", "User-agent: *\nAllow: /"),
      profile,
      execution(page),
    ],
  };
};
const project = (page: Rendered) =>
  Browser.projectBrowserExecution({
    capture: execution(page),
    url: product.url,
    id: "product-browser",
    productName: product.name,
    startedAt: receivedAt,
    now,
  });

describe("same-page ProductGroup split-color identity", () => {
  test("corroborates the exact stored name without replacing its raw capture or date", () => {
    const browser = held();
    const before = JSON.stringify(browser);
    const saved = Browser.replayHeldProductCapture({ browser, product, now });
    expect(saved?.status).toBe("captured");
    expect(project(rendered())?.source.checkedAt).toBe(receivedAt);
    expect(saved?.raw).toEqual(browser.raw);
    expect(
      saved?.sources.find((source) => source.id === "product-browser")
        ?.artifact,
    ).toBe(`sha256:${browser.raw[2]?.sha256}`);
    expect(saved?.checkout.status).toBe("notTested");
    expect(saved?.candidates).toEqual([]);
    expect(
      saved && Browser.reusableProductCapture({ browser: saved, product, now }),
    ).not.toBeNull();
    expect(JSON.stringify(browser)).toBe(before);
    expect(product.name).toBe("WIDE LEG JEANS | SHORE");
  });

  test.each([
    [
      "different current URL",
      { url: "https://samplegoods.test/products/other-jeans" },
    ],
    ["different heading", { headings: ["Other Denim Jeans"] }],
    [
      "multiple product headings",
      { headings: ["Wide Leg Jeans", "Other Denim Jeans"] },
    ],
    [
      "navigation before the product block",
      { text: "Menu\nWide Leg Jeans\nColor: Shore\nDetails\nWide legs" },
    ],
    [
      "color only in navigation",
      { text: "Wide Leg Jeans\nMenu\nColor: Shore\nDetails\nWide legs" },
    ],
    [
      "color only on a recommendation",
      { text: "Wide Leg Jeans\nDetails\nWide legs\nStyle with\nColor: Shore" },
    ],
    [
      "different visible color",
      { text: rendered().text.replace("Color: Shore", "Color: Ink") },
    ],
    [
      "multiple leading colors",
      {
        text: rendered().text.replace(
          "Color: Shore",
          "Color: Shore\nColor: Ink",
        ),
      },
    ],
    ["blocked content", { title: "Just a moment" }],
    ["bad status", { status: 403 }],
  ] as [string, Partial<Rendered>][])("rejects %s", (_label, change) => {
    expect(project({ ...rendered(), ...change })).toBeNull();
    expect(
      Browser.replayHeldProductCapture({
        browser: held({ ...rendered(), ...change }),
        product,
        now,
      }),
    ).toBeNull();
  });

  test.each([
    [
      "different structured URL",
      { ...group(), url: "https://samplegoods.test/products/other-jeans" },
    ],
    [
      "different exact structured name",
      { ...group(), name: "WIDE LEG JEANS | INK" },
    ],
    [
      "different structured identity",
      { ...group(), "@id": "/products/other-jeans#product" },
    ],
    ["variant instead of product group", { ...group(), "@type": "Product" }],
    [
      "embedded recommendation",
      { "@type": "ItemList", itemListElement: [group()] },
    ],
    ["graph wrapper", { "@graph": [group()] }],
  ])("rejects %s", (_label, structured) => {
    expect(
      project({ ...rendered(), structured: [JSON.stringify(structured)] }),
    ).toBeNull();
  });

  test("rejects malformed or ambiguous groups and late unrelated color text", () => {
    expect(project({ ...rendered(), structured: ["{broken"] })).toBeNull();
    expect(
      project({
        ...rendered(),
        structured: [JSON.stringify(group()), JSON.stringify(group())],
      }),
    ).toBeNull();
    expect(
      project({
        ...rendered(),
        text: `Wide Leg Jeans\n${Array.from({ length: 21 }, (_, index) => `Other detail ${index}`).join("\n")}\nColor: Shore`,
      }),
    ).toBeNull();
  });

  test("keeps the existing fully visible name path intact", () => {
    const page = {
      ...rendered(),
      text: `${product.name}\nWide legs`,
      structured: [],
    };
    expect(project(page)).not.toBeNull();
    // The special replay scope still requires the new split-name proof.
    expect(
      Browser.replayHeldProductCapture({ browser: held(page), product, now }),
    ).toBeNull();
  });

  test("replay rejects changed proof bytes, source identity, robots and state", () => {
    const browser = held();
    expect(
      Browser.replayHeldProductCapture({
        browser: { ...browser, reason: "A different hold." },
        product,
        now,
      }),
    ).toBeNull();
    expect(
      Browser.replayHeldProductCapture({
        browser: {
          ...browser,
          raw: browser.raw.map((item, index) =>
            index === 2 ? { ...item, body: `${item.body} ` } : item,
          ),
        },
        product,
        now,
      }),
    ).toBeNull();
    expect(
      Browser.replayHeldProductCapture({
        browser: {
          ...browser,
          sources: browser.sources.map((source) => ({
            ...source,
            artifact: `sha256:${"0".repeat(64)}`,
          })),
        },
        product,
        now,
      }),
    ).toBeNull();
    expect(
      Browser.replayHeldProductCapture({
        browser: { ...browser, raw: [...browser.raw, execution()] },
        product,
        now,
      }),
    ).toBeNull();
    expect(
      Browser.replayHeldProductCapture({
        browser: {
          ...browser,
          raw: browser.raw.map((item, index) =>
            index === 0
              ? raw(item.url, "User-agent: *\nDisallow: /products/")
              : item,
          ),
        },
        product,
        now,
      }),
    ).toBeNull();
    expect(
      Browser.replayHeldProductCapture({
        browser,
        product,
        now: Date.parse(receivedAt) - 1,
      }),
    ).toBeNull();
  });
});
