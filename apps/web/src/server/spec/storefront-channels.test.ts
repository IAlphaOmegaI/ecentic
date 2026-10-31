import { describe, expect, test } from "bun:test";
import type { Product, Store, Variant } from "../app/storefront/catalog";
import * as ChatGPT from "../app/storefront/chatgpt";
import * as Google from "../app/storefront/google";

const store: Store = {
  origin: "https://acme.com",
  host: "acme.com",
  name: "Acme Outdoor",
  platform: "shopify",
  returnPolicy: "https://acme.com/policies/refund-policy",
};

const variant: Variant = {
  id: "1001",
  options: {},
  price: "79.99",
  compareAtPrice: null,
  availability: "in_stock",
  sku: "TRAIL-BLK",
  barcode: "036000291452",
  image: null,
};

const product: Product = {
  id: "500",
  origin: "shopify",
  url: "https://acme.com/products/trail",
  title: "Trail running shoes",
  description: "Waterproof trail shoes with a rubber outsole.",
  currency: "USD",
  brand: "Northline",
  mpn: null,
  productType: "Shoes",
  images: ["https://cdn.shopify.com/s/files/1/trail.jpg"],
  variants: [variant],
};

const several: Product = {
  ...product,
  variants: [
    {
      ...variant,
      id: "1001",
      options: { Color: "Black", Size: "10" },
    },
    {
      ...variant,
      id: "1002",
      options: { Color: "Black", Size: "11" },
      barcode: null,
    },
  ],
};

const row = ChatGPT.toRows(product, store)[0] as ChatGPT.Row;

const codes = (findings: { code: string }[]) =>
  findings.map(({ code }) => code);

const errors = (findings: { code: string; severity: string }[]) =>
  codes(findings.filter(({ severity }) => severity === "error"));

describe("ChatGPT toRows", () => {
  test("a single variant is one clean row with every required cell", () => {
    expect(ChatGPT.toRows(product, store)).toEqual([
      {
        item_id: "1001",
        title: "Trail running shoes",
        description: "Waterproof trail shoes with a rubber outsole.",
        url: "https://acme.com/products/trail",
        brand: "Northline",
        seller_name: "Acme Outdoor",
        image_url: "https://cdn.shopify.com/s/files/1/trail.jpg",
        availability: "in_stock",
        price: "79.99 USD",
        sale_price: null,
        gtin: "036000291452",
        mpn: null,
        group_id: null,
        listing_has_variations: "false",
        variant_dict: null,
        seller_url: "https://acme.com",
        return_policy: "https://acme.com/policies/refund-policy",
        store_country: null,
        is_eligible_search: "true",
        is_ads_eligible: null,
      },
    ]);
    expect(errors(ChatGPT.validate(row))).toEqual([]);
  });

  test("variants get their own stable item_id, a shared group, options and a selected url", () => {
    const [first, second] = ChatGPT.toRows(several, store) as [
      ChatGPT.Row,
      ChatGPT.Row,
    ];
    expect(first.item_id).toBe("1001");
    expect(second.item_id).toBe("1002");
    expect(first.group_id).toBe("500");
    expect(second.group_id).toBe("500");
    expect(first.listing_has_variations).toBe("true");
    expect(first.variant_dict).toBe('{"color":"Black","size":"10"}');
    expect(first.title).toBe("Trail running shoes - Black / 10");
    expect(first.url).toBe("https://acme.com/products/trail?variant=1001");
    expect(errors(ChatGPT.validate(first))).toEqual([]);
    expect(ChatGPT.toRows(several, store)).toEqual(
      ChatGPT.toRows(several, store),
    );
  });

  test("group_id still differs from item_id when the product id equals a variant id", () => {
    const [first] = ChatGPT.toRows(
      { ...several, id: "1001" },
      store,
    ) as ChatGPT.Row[];
    expect(first?.group_id).toBe("group-1001");
    expect(errors(ChatGPT.validate(first as ChatGPT.Row))).toEqual([]);
  });

  test("only a Shopify numeric variant id reaches the url", () => {
    const [woo] = ChatGPT.toRows(
      { ...several, origin: "woocommerce" },
      store,
    ) as ChatGPT.Row[];
    expect(woo?.url).toBe("https://acme.com/products/trail");
    const [hashed] = ChatGPT.toRows(
      {
        ...several,
        variants: several.variants.map((entry, index) => ({
          ...entry,
          id: `hash-${index}`,
        })),
      },
      store,
    ) as ChatGPT.Row[];
    expect(hashed?.url).toBe("https://acme.com/products/trail");
  });

  test("a compare-at above price becomes price, and the live price becomes sale_price", () => {
    const [sale] = ChatGPT.toRows(
      {
        ...product,
        variants: [{ ...variant, price: "59.99", compareAtPrice: "79.99" }],
      },
      store,
    ) as ChatGPT.Row[];
    expect(sale?.price).toBe("79.99 USD");
    expect(sale?.sale_price).toBe("59.99 USD");
    const [flat] = ChatGPT.toRows(
      {
        ...product,
        variants: [{ ...variant, price: "79.99", compareAtPrice: "59.99" }],
      },
      store,
    ) as ChatGPT.Row[];
    expect(flat?.price).toBe("79.99 USD");
    expect(flat?.sale_price).toBeNull();
  });

  test("amounts take the currency's digits without changing value", () => {
    const amount = (price: string, currency: string) =>
      ChatGPT.toRows(
        { ...product, currency, variants: [{ ...variant, price }] },
        store,
      )[0]?.price;
    expect(amount("1200.00", "JPY")).toBe("1200 JPY");
    expect(amount("1200", "JPY")).toBe("1200 JPY");
    expect(amount("80", "USD")).toBe("80.00 USD");
    expect(amount("5.250", "KWD")).toBe("5.250 KWD");
    // Non-zero excess is never rounded away: it reaches validate as read.
    expect(amount("12.345", "USD")).toBe("12.345 USD");
    expect(amount("1200.50", "JPY")).toBe("1200.50 JPY");
    expect(amount("1,299.00", "USD")).toBe("1,299.00 USD");
  });

  test("a Shopify CDN webp asks for a jpg, and other hosts stay as read", () => {
    const image = (url: string) =>
      ChatGPT.toRows({ ...product, images: [url] }, store)[0]?.image_url;
    expect(image("https://cdn.shopify.com/s/files/1/a.webp?v=1")).toBe(
      "https://cdn.shopify.com/s/files/1/a.webp?v=1&format=jpg",
    );
    expect(image("https://acme.com/cdn/shop/files/a.webp")).toBe(
      "https://acme.com/cdn/shop/files/a.webp?format=jpg",
    );
    expect(image("https://images.acme.com/a.webp")).toBe(
      "https://images.acme.com/a.webp",
    );
  });

  test("is_ads_eligible is true only when asked for", () => {
    expect(ChatGPT.toRows(product, store)[0]?.is_ads_eligible).toBeNull();
    expect(
      ChatGPT.toRows(product, store, { ads: true })[0]?.is_ads_eligible,
    ).toBe("true");
  });

  test("nothing is invented: what the store omits stays empty", () => {
    const [bare] = ChatGPT.toRows(
      {
        ...product,
        url: null,
        description: null,
        brand: null,
        currency: null,
        images: [],
        variants: [
          { ...variant, price: null, availability: "unknown", barcode: null },
        ],
      },
      { ...store, name: null, returnPolicy: null },
    ) as ChatGPT.Row[];
    expect(bare?.price).toBeNull();
    expect(bare?.brand).toBeNull();
    expect(bare?.seller_name).toBeNull();
    expect(bare?.image_url).toBeNull();
    expect(bare?.gtin).toBeNull();
    expect(bare?.mpn).toBeNull();
    expect(bare?.return_policy).toBeNull();
    expect(bare?.availability).toBe("unknown");
  });

  test("a sku is never used as mpn", () => {
    expect(row.mpn).toBeNull();
    expect(ChatGPT.toRows({ ...product, mpn: "NL-10" }, store)[0]?.mpn).toBe(
      "NL-10",
    );
  });

  test("a leading zero on a GTIN is kept", () => {
    expect(row.gtin).toBe("036000291452");
    expect(
      ChatGPT.toRows(
        {
          ...product,
          variants: [{ ...variant, barcode: "09506000134352" }],
        },
        store,
      )[0]?.gtin,
    ).toBe("09506000134352");
  });
});

describe("ChatGPT validate", () => {
  const rejected: [string, Partial<ChatGPT.Row>, string][] = [
    ["item_id empty", { item_id: "" }, "item_id_missing"],
    ["title empty", { title: "  " }, "title_missing"],
    ["description null", { description: null }, "description_missing"],
    ["url null", { url: null }, "url_missing"],
    ["brand null", { brand: null }, "brand_missing"],
    ["seller_name null", { seller_name: null }, "seller_name_missing"],
    ["image_url null", { image_url: null }, "image_url_missing"],
    ["availability omitted", { availability: null }, "availability_missing"],
    ["availability empty", { availability: "" }, "availability_missing"],
    ["price null", { price: null }, "price_missing"],
    ["title over 150", { title: "x".repeat(151) }, "title_too_long"],
    ["title HTML", { title: "<b>Shoes</b>" }, "title_html"],
    [
      "description over 5000",
      { description: "x".repeat(5001) },
      "description_too_long",
    ],
    [
      "description HTML",
      { description: "<p>Waterproof</p>" },
      "description_html",
    ],
    [
      "availability cased",
      { availability: "In Stock" },
      "availability_invalid",
    ],
    [
      "availability spaced",
      { availability: "in stock" },
      "availability_invalid",
    ],
    ["unknown brand", { brand: "unknown" }, "brand_placeholder"],
    ["cased placeholder", { brand: "N/A" }, "brand_placeholder"],
    ["null title", { title: "null" }, "title_placeholder"],
    ["placeholder mpn", { mpn: "n/a" }, "mpn_placeholder"],
    ["placeholder gtin", { gtin: "unknown" }, "gtin_placeholder"],
    ["thousands", { price: "1,299.00 USD" }, "price_format"],
    ["decimal comma", { price: "79,99 EUR" }, "price_format"],
    ["exponent", { price: "1e3 USD" }, "price_format"],
    ["currency first", { price: "USD 79.99" }, "price_format"],
    ["no space", { price: "79.99USD" }, "price_format"],
    ["lowercase currency", { price: "79.99 usd" }, "price_format"],
    ["bare amount", { price: "79.99" }, "currency_missing"],
    ["made-up currency", { price: "79.99 ZZZ" }, "currency_invalid"],
    ["JPY decimals", { price: "1200.00 JPY" }, "price_digits"],
    ["USD three decimals", { price: "12.345 USD" }, "price_digits"],
    ["KWD four decimals", { price: "5.2500 KWD" }, "price_digits"],
    ["zero price", { price: "0.00 USD" }, "price_not_positive"],
    ["sale equal", { sale_price: "79.99 USD" }, "sale_price_not_below"],
    ["sale above", { sale_price: "89.99 USD" }, "sale_price_not_below"],
    ["sale zero", { sale_price: "0.00 USD" }, "sale_price_not_positive"],
    ["sale other currency", { sale_price: "59.99 EUR" }, "sale_price_currency"],
    ["sale thousands", { sale_price: "1,000.00 USD" }, "sale_price_format"],
    ["GTIN bad check digit", { gtin: "036000291453" }, "gtin_invalid"],
    ["GTIN dashes", { gtin: "036-000-291452" }, "gtin_invalid"],
    ["GTIN spaces", { gtin: "036000 291452" }, "gtin_invalid"],
    ["GTIN ten digits", { gtin: "0360002914" }, "gtin_invalid"],
    ["relative url", { url: "/products/trail" }, "url_invalid"],
    ["ftp url", { url: "ftp://acme.com/trail" }, "url_invalid"],
    ["localhost url", { url: "http://localhost:3000/trail" }, "url_invalid"],
    ["local suffix url", { url: "https://acme.local/trail" }, "url_invalid"],
    ["IP url", { url: "http://192.168.1.10/trail" }, "url_invalid"],
    ["decimal IP url", { url: "http://2130706433/trail" }, "url_invalid"],
    ["IPv6 url", { url: "http://[::1]/trail" }, "url_invalid"],
    ["credentials url", { url: "https://me:pw@acme.com/trail" }, "url_invalid"],
    ["spaced url", { url: "https://acme.com/my trail" }, "url_invalid"],
    ["bad seller_url", { seller_url: "acme.com" }, "seller_url_invalid"],
    [
      "bad return_policy",
      { return_policy: "30 days" },
      "return_policy_invalid",
    ],
    [
      "localhost image",
      { image_url: "http://localhost/a.jpg" },
      "image_url_invalid",
    ],
    [
      "webp image",
      { image_url: "https://acme.com/a.webp" },
      "image_url_format",
    ],
    [
      "avif image",
      { image_url: "https://acme.com/a.AVIF" },
      "image_url_format",
    ],
    [
      "gif image",
      { image_url: "https://acme.com/a.gif?v=2" },
      "image_url_format",
    ],
    ["svg image", { image_url: "https://acme.com/a.svg" }, "image_url_format"],
    [
      "non-Shopify format param",
      { image_url: "https://acme.com/a.webp?format=jpg" },
      "image_url_format",
    ],
    [
      "uppercase boolean",
      { is_eligible_search: "TRUE" },
      "is_eligible_search_invalid",
    ],
    ["yes boolean", { is_ads_eligible: "yes" }, "is_ads_eligible_invalid"],
    ["lowercase country", { store_country: "us" }, "store_country_invalid"],
    [
      "group equals item",
      {
        group_id: "1001",
        listing_has_variations: "true",
        variant_dict: '{"size":"10"}',
      },
      "group_id_same",
    ],
    [
      "variant without flag",
      { group_id: "500", listing_has_variations: "false" },
      "listing_has_variations_missing",
    ],
    [
      "flag without group",
      { listing_has_variations: "true", variant_dict: '{"size":"10"}' },
      "group_id_missing",
    ],
    [
      "flag without options",
      { group_id: "500", listing_has_variations: "true" },
      "variant_dict_missing",
    ],
    [
      "options not JSON",
      {
        group_id: "500",
        listing_has_variations: "true",
        variant_dict: "color=Black",
      },
      "variant_dict_invalid",
    ],
    [
      "options an array",
      {
        group_id: "500",
        listing_has_variations: "true",
        variant_dict: '["Black"]',
      },
      "variant_dict_invalid",
    ],
    [
      "options an empty value",
      {
        group_id: "500",
        listing_has_variations: "true",
        variant_dict: '{"color":""}',
      },
      "variant_dict_invalid",
    ],
    [
      "options an empty key",
      {
        group_id: "500",
        listing_has_variations: "true",
        variant_dict: '{"":"Black"}',
      },
      "variant_dict_invalid",
    ],
    [
      "options a number",
      {
        group_id: "500",
        listing_has_variations: "true",
        variant_dict: '{"size":10}',
      },
      "variant_dict_invalid",
    ],
  ];

  for (const [name, patch, code] of rejected)
    test(`rejects ${name}`, () => {
      const findings = ChatGPT.validate({ ...row, ...patch });
      expect(errors(findings)).toContain(code);
      expect(findings.every(({ channel }) => channel === "chatgpt")).toBe(true);
    });

  const accepted: [string, Partial<ChatGPT.Row>][] = [
    ["every availability", { availability: "backorder" }],
    ["unknown availability", { availability: "unknown" }],
    ["JPY without decimals", { price: "1200 JPY" }],
    ["KWD with three decimals", { price: "5.250 KWD" }],
    ["a whole USD amount", { price: "80 USD" }],
    ["a real sale", { sale_price: "59.99 USD" }],
    ["GTIN-8", { gtin: "96385074" }],
    ["GTIN-14 with a leading zero", { gtin: "09506000134352" }],
    ["no mpn and no gtin", { mpn: null, gtin: null }],
    ["a title of exactly 150", { title: "x".repeat(150) }],
    ["a description of exactly 5000", { description: "x".repeat(5000) }],
    ["a less-than sign in copy", { description: "Weighs < 200 g." }],
    ["png", { image_url: "https://acme.com/a.PNG" }],
    [
      "a Shopify webp asked for as jpg",
      { image_url: "https://cdn.shopify.com/s/files/1/a.webp?format=jpg" },
    ],
    [
      "a real variant row",
      {
        group_id: "500",
        listing_has_variations: "true",
        variant_dict: '{"color":"Black"}',
      },
    ],
    ["omitted optional cells", { seller_url: null, return_policy: null }],
  ];

  for (const [name, patch] of accepted)
    test(`accepts ${name}`, () => {
      expect(errors(ChatGPT.validate({ ...row, ...patch }))).toEqual([]);
    });

  test("unknown availability passes the enum and still tells the merchant", () => {
    expect(
      codes(ChatGPT.validate({ ...row, availability: "unknown" })),
    ).toEqual(["availability_unknown"]);
  });

  test("an image with no extension passes with a warning", () => {
    const findings = ChatGPT.validate({
      ...row,
      image_url: "https://acme.com/images/trail",
    });
    expect(errors(findings)).toEqual([]);
    expect(codes(findings)).toEqual(["image_url_unconfirmed"]);
  });

  test("a placeholder is reported once, not also as a bad format", () => {
    expect(codes(ChatGPT.validate({ ...row, price: "n/a" }))).toEqual([
      "price_placeholder",
    ]);
    expect(codes(ChatGPT.validate({ ...row, url: "unknown" }))).toEqual([
      "url_placeholder",
    ]);
  });

  test("variant_dict without the variant flags warns that it is ignored", () => {
    const findings = ChatGPT.validate({
      ...row,
      variant_dict: '{"size":"10"}',
    });
    expect(errors(findings)).toEqual([]);
    expect(codes(findings)).toEqual(["variant_dict_ignored"]);
  });

  test("a variant title over the limit is a finding, never a silent cut", () => {
    const long = { ...several, title: "x".repeat(148) };
    const [first] = ChatGPT.toRows(long, store) as ChatGPT.Row[];
    expect(first?.title).toBe(`${"x".repeat(148)} - Black / 10`);
    expect(errors(ChatGPT.validate(first as ChatGPT.Row))).toContain(
      "title_too_long",
    );
  });
});

describe("ChatGPT assess", () => {
  test("a clean product has nothing to resolve, with no MPN required", () => {
    expect(ChatGPT.assess(product, store)).toEqual([]);
  });

  test("findings dedupe by code and field across variants, and name the field", () => {
    const findings = ChatGPT.assess(
      { ...several, brand: null, description: null },
      store,
    );
    expect(codes(findings).sort()).toEqual([
      "brand_missing",
      "description_missing",
    ]);
    expect(findings[0]?.message).toStartWith("description");
    expect(findings[1]?.message).toStartWith("brand");
  });

  test("a missing price is a missing cell plus an error", () => {
    expect(
      errors(
        ChatGPT.assess(
          { ...product, variants: [{ ...variant, price: null }] },
          store,
        ),
      ),
    ).toEqual(["price_missing"]);
  });

  test("an unstated currency is an error, not a default", () => {
    expect(
      errors(ChatGPT.assess({ ...product, currency: null }, store)),
    ).toEqual(["currency_missing"]);
  });

  test("a missing store name is an error, not the hostname", () => {
    expect(errors(ChatGPT.assess(product, { ...store, name: null }))).toEqual([
      "seller_name_missing",
    ]);
  });

  test("a barcode that is not a GTIN stays out and warns", () => {
    const junk = {
      ...product,
      variants: [{ ...variant, barcode: "036000291453" }],
    };
    expect(ChatGPT.toRows(junk, store)[0]?.gtin).toBeNull();
    expect(ChatGPT.assess(junk, store)).toMatchObject([
      { field: "gtin", code: "gtin_ignored", severity: "warning" },
    ]);
  });

  test("repeated variant ids are an error", () => {
    expect(
      errors(
        ChatGPT.assess(
          {
            ...several,
            variants: several.variants.map((entry) => ({
              ...entry,
              id: "1001",
            })),
          },
          store,
        ),
      ),
    ).toContain("item_id_duplicate");
  });

  test("no message claims a listing in ChatGPT", () => {
    const messages = [
      ...ChatGPT.assess(
        {
          ...several,
          title: "",
          brand: "unknown",
          description: null,
          url: null,
          images: [],
          currency: null,
        },
        { ...store, name: null },
      ),
      ...rejectedMessages(),
    ].map(({ message }) => message);
    for (const message of messages)
      expect(message).not.toMatch(/(in|listed in) ChatGPT/);
  });
});

const rejectedMessages = () =>
  ChatGPT.validate({
    ...row,
    price: "12.345 USD",
    sale_price: "99.00 USD",
    availability: "In Stock",
    gtin: "1",
    url: "nope",
    image_url: "https://acme.com/a.webp",
  });

describe("ChatGPT csv", () => {
  test("writes every column in order, with empty cells empty", () => {
    const [header, line] = ChatGPT.csv([row]).split("\n");
    expect(header).toBe(ChatGPT.COLUMNS.join(","));
    expect(line).toBe(
      "1001,Trail running shoes,Waterproof trail shoes with a rubber outsole.,https://acme.com/products/trail,Northline,Acme Outdoor,https://cdn.shopify.com/s/files/1/trail.jpg,in_stock,79.99 USD,,036000291452,,,false,,https://acme.com,https://acme.com/policies/refund-policy,,true,",
    );
  });

  test("quotes commas, quotes and newlines, doubling embedded quotes", () => {
    const output = ChatGPT.csv([
      {
        ...row,
        title: 'Shoes, 10" wide',
        description: "Line one\nLine two",
        variant_dict: '{"color":"Black","size":"10"}',
      },
    ]);
    expect(output).toContain('"Shoes, 10"" wide"');
    expect(output).toContain('"Line one\nLine two"');
    expect(output).toContain('"{""color"":""Black"",""size"":""10""}"');
  });

  test("keeps a GTIN's leading zero and writes only the rows passed in", () => {
    expect(ChatGPT.csv([row])).toContain(",036000291452,");
    expect(ChatGPT.csv([]).split("\n")).toEqual([ChatGPT.COLUMNS.join(",")]);
    const valid = ChatGPT.toRows(several, store).filter(
      (entry) => errors(ChatGPT.validate(entry)).length === 0,
    );
    expect(ChatGPT.csv(valid).split("\n")).toHaveLength(3);
  });

  test("round-trips through a CSV reader", () => {
    const title = 'A "quoted", title\nwith a break';
    const parsed = parseCsv(ChatGPT.csv([{ ...row, title }]));
    expect(parsed[0]).toEqual([...ChatGPT.COLUMNS]);
    expect(parsed[1]?.[ChatGPT.COLUMNS.indexOf("title")]).toBe(title);
    expect(parsed[1]).toHaveLength(ChatGPT.COLUMNS.length);
  });
});

/** A small RFC 4180 reader, so the round trip does not lean on the writer's own logic. */
const parseCsv = (text: string) => {
  const matches = text.matchAll(/("(?:[^"]|"")*"|[^,\n]*)(,|\n|$)/g);
  const { rows } = [...matches].reduce<{
    rows: string[][];
    current: string[];
    done: boolean;
  }>(
    ({ rows, current, done }, match) => {
      if (done) return { rows, current, done };
      const raw = match[1] ?? "";
      const value =
        raw.startsWith('"') && raw.endsWith('"')
          ? raw.slice(1, -1).replaceAll('""', '"')
          : raw;
      const next = [...current, value];
      if (match[2] === ",") return { rows, current: next, done };
      return { rows: [...rows, next], current: [], done: match[2] === "" };
    },
    { rows: [], current: [], done: false },
  );
  return rows;
};

const item = Google.toItems(product, store)[0] as Google.Item;

describe("Google toItems", () => {
  test("maps a single variant like the feed export, without its defaults", () => {
    expect(Google.toItems(product, store)).toEqual([
      {
        id: "1001",
        itemGroupId: null,
        title: "Trail running shoes",
        description: "Waterproof trail shoes with a rubber outsole.",
        link: "https://acme.com/products/trail",
        imageLink: "https://cdn.shopify.com/s/files/1/trail.jpg",
        additionalImageLinks: [],
        price: "79.99",
        salePrice: null,
        currency: "USD",
        availability: "in stock",
        condition: "new",
        brand: "Northline",
        gtin: "036000291452",
        mpn: null,
        identifierExists: true,
        productType: "Shoes",
        color: null,
        size: null,
        material: null,
        pattern: null,
      },
    ]);
  });

  test("variants share item_group_id, select their url and carry their options", () => {
    const [first, second] = Google.toItems(several, store) as [
      Google.Item,
      Google.Item,
    ];
    expect(first.itemGroupId).toBe("500");
    expect(second.itemGroupId).toBe("500");
    expect(first.id).not.toBe(second.id);
    expect(first.link).toBe("https://acme.com/products/trail?variant=1001");
    expect(first.color).toBe("Black");
    expect(second.size).toBe("11");
  });

  test("a compare-at above price becomes price, and the live price becomes sale_price", () => {
    const [sale] = Google.toItems(
      {
        ...product,
        variants: [{ ...variant, price: "59.99", compareAtPrice: "79.99" }],
      },
      store,
    );
    expect(sale?.price).toBe("79.99");
    expect(sale?.salePrice).toBe("59.99");
    const [flat] = Google.toItems(
      {
        ...product,
        variants: [{ ...variant, price: "59.99", compareAtPrice: "59.99" }],
      },
      store,
    );
    expect(flat?.price).toBe("59.99");
    expect(flat?.salePrice).toBeNull();
  });

  test("availability uses Google's wording and never defaults", () => {
    const availability = (value: Variant["availability"]) =>
      Google.toItems(
        { ...product, variants: [{ ...variant, availability: value }] },
        store,
      )[0]?.availability;
    expect(availability("in_stock")).toBe("in stock");
    expect(availability("out_of_stock")).toBe("out of stock");
    expect(availability("pre_order")).toBe("preorder");
    expect(availability("backorder")).toBe("backorder");
    expect(availability("unknown")).toBeNull();
  });

  test("a variant's image leads, and additional images stop at 10", () => {
    const images = Array.from(
      { length: 14 },
      (_, index) => `https://acme.com/${index}.jpg`,
    );
    const [entry] = Google.toItems(
      {
        ...product,
        images,
        variants: [{ ...variant, image: "https://acme.com/3.jpg" }],
      },
      store,
    );
    expect(entry?.imageLink).toBe("https://acme.com/3.jpg");
    expect(entry?.additionalImageLinks).toHaveLength(10);
    expect(entry?.additionalImageLinks).not.toContain("https://acme.com/3.jpg");
  });

  test("identifiers: valid GTIN only, stated MPN only, never the sku", () => {
    const entry = (patch: Partial<Product>, barcode: string | null) =>
      Google.toItems(
        { ...product, ...patch, variants: [{ ...variant, barcode }] },
        store,
      )[0] as Google.Item;
    expect(entry({}, "036000291452")).toMatchObject({
      gtin: "036000291452",
      mpn: null,
      identifierExists: true,
    });
    expect(entry({}, "036000291453")).toMatchObject({
      gtin: null,
      mpn: null,
      identifierExists: false,
    });
    expect(entry({}, null)).toMatchObject({
      gtin: null,
      mpn: null,
      identifierExists: false,
    });
    expect(entry({ mpn: "NL-10" }, null)).toMatchObject({
      gtin: null,
      mpn: "NL-10",
      identifierExists: true,
    });
  });
});

describe("Google condition", () => {
  const blockers = (over: Partial<Product>) =>
    errors(Google.assess({ ...product, ...over }, store));

  test("a listing that says it is not new is held out of the feed", () => {
    expect(blockers({ title: "Arc Ultra - Certified Refurbished" })).toContain(
      "condition_not_new",
    );
    expect(blockers({ title: "Pre-owned Leather Bag" })).toContain(
      "condition_not_new",
    );
  });

  test("so is a variant whose condition option says so", () => {
    const [variant] = product.variants;
    if (!variant) throw new Error("no variant");
    expect(
      blockers({
        variants: [{ ...variant, options: { Condition: "Used - Good" } }],
      }),
    ).toContain("condition_not_new");
  });

  test("ordinary titles are left alone", () => {
    expect(blockers({ title: "Reused Cotton Tote" })).not.toContain(
      "condition_not_new",
    );
  });
});

describe("Google validate", () => {
  test("a clean item has no errors", () => {
    expect(errors(Google.validate(item))).toEqual([]);
  });

  test("a registry blocker is an error and a registry warning is a warning", () => {
    const findings = Google.validate({
      ...item,
      link: null,
      description: "Trail running shoes",
    });
    expect(findings.find(({ code }) => code === "link-missing")).toMatchObject({
      channel: "google",
      field: "link",
      severity: "error",
    });
    expect(
      findings.find(({ code }) => code === "description-identical-title"),
    ).toMatchObject({ field: "description", severity: "warning" });
  });

  test("an image finding names the feed's field", () => {
    expect(
      Google.validate({ ...item, imageLink: null }).find(
        ({ code }) => code === "image-missing",
      ),
    ).toMatchObject({ field: "image_link", severity: "error" });
  });

  test("unknown availability is an error, because Merchant Center requires it", () => {
    expect(
      Google.validate({ ...item, availability: null }).find(
        ({ code }) => code === "availability_unknown",
      ),
    ).toMatchObject({ field: "availability", severity: "error" });
  });

  test("a missing currency is an error", () => {
    expect(errors(Google.validate({ ...item, currency: null }))).toEqual([
      "currency_missing",
    ]);
  });

  test("a missing price is an error", () => {
    expect(errors(Google.validate({ ...item, price: null }))).toEqual([
      "price-missing",
    ]);
  });

  test("a thousands separator is reported as a format error, not read as 1", () => {
    expect(errors(Google.validate({ ...item, price: "1,299.00" }))).toEqual([
      "price_format",
    ]);
  });

  test("a sale price at or above price warns, per the registry", () => {
    expect(
      Google.validate({ ...item, salePrice: "79.99" }).find(
        ({ code }) => code === "sale-price-not-below",
      ),
    ).toMatchObject({ severity: "warning" });
  });

  test("a bad GTIN set on an item is rejected", () => {
    expect(errors(Google.validate({ ...item, gtin: "036000291453" }))).toEqual([
      "gtin-invalid",
    ]);
  });

  test("the override lint flags title and description, per field and as errors", () => {
    const findings = Google.validate({
      ...item,
      title: "Trail shoes free shipping",
      description: "Great shoes, 20% off today!!",
    });
    expect(
      findings.find(({ code }) => code === "promotional_free_shipping"),
    ).toMatchObject({ field: "title", severity: "error" });
    expect(
      findings.find(({ code }) => code === "promotional_percent_off"),
    ).toMatchObject({ field: "description", severity: "error" });
    expect(
      findings.find(
        ({ code, field }) =>
          code === "repeated_exclamation" && field === "description",
      ),
    ).toMatchObject({ severity: "error" });
    expect(findings.map(({ message }) => message).join(" ")).not.toContain(
      "/i",
    );
  });

  test("a lint hit replaces the registry finding it restates", () => {
    const shout = codes(
      Google.validate({ ...item, title: "TRAIL RUNNING SHOES WATERPROOF" }),
    );
    expect(shout).toContain("title_all_caps");
    expect(shout).not.toContain("title-all-caps");
    const long = codes(Google.validate({ ...item, title: "x".repeat(151) }));
    expect(long).toContain("title_too_long");
    expect(long).not.toContain("title-too-long");
  });

  test("a clean rewrite passes the lint, so it can be pushed", () => {
    expect(
      errors(
        Google.validate({
          ...item,
          title: "Northline waterproof trail running shoes",
          description:
            "Waterproof shoes with a rubber outsole and mesh lining.",
        }),
      ),
    ).toEqual([]);
  });
});

describe("Google assess", () => {
  test("a clean product has no errors", () => {
    expect(errors(Google.assess(product, store))).toEqual([]);
  });

  test("findings dedupe by code and field across variants", () => {
    const findings = Google.assess({ ...several, brand: null }, store);
    expect(
      findings.filter(({ code }) => code === "brand-missing"),
    ).toHaveLength(1);
  });

  test("nothing the store omits is filled in", () => {
    const bare = {
      ...product,
      currency: null,
      variants: [{ ...variant, price: null, availability: "unknown" as const }],
    };
    expect(errors(Google.assess(bare, store)).sort()).toEqual([
      "availability_unknown",
      "currency_missing",
      "price-missing",
    ]);
  });

  test("repeated variant ids are an error", () => {
    expect(
      errors(
        Google.assess(
          {
            ...several,
            variants: several.variants.map((entry) => ({
              ...entry,
              id: "1001",
            })),
          },
          store,
        ),
      ),
    ).toContain("id-duplicate");
  });

  test("a barcode that is not a GTIN stays out and warns", () => {
    const findings = Google.assess(
      { ...product, variants: [{ ...variant, barcode: "12345" }] },
      store,
    );
    expect(errors(findings)).toEqual([]);
    expect(findings.find(({ code }) => code === "gtin_ignored")).toMatchObject({
      field: "gtin",
      severity: "warning",
    });
  });
});

describe("Google feed", () => {
  test("writes RSS 2.0 with the g: namespace", () => {
    const xml = Google.feed(store, [item]);
    expect(xml).toStartWith('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain(
      '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    );
    expect(xml).toContain("<title>Acme Outdoor</title>");
    expect(xml).toContain("<link>https://acme.com</link>");
    expect(xml).toContain("<g:id>1001</g:id>");
    expect(xml).toContain("<g:price>79.99 USD</g:price>");
    expect(xml).toContain("<g:availability>in stock</g:availability>");
    expect(xml).toContain("<g:condition>new</g:condition>");
    expect(xml).toContain("<g:gtin>036000291452</g:gtin>");
    expect(xml).toContain("<g:product_type>Shoes</g:product_type>");
    expect(xml).not.toContain("g:identifier_exists");
    expect(xml).not.toContain("g:sale_price");
    expect(xml).not.toContain("g:item_group_id");
  });

  test("writes sale_price, variants and identifier_exists when they apply", () => {
    const [first] = Google.toItems(
      {
        ...several,
        variants: [
          {
            ...(several.variants[0] as Variant),
            barcode: null,
            price: "59.99",
            compareAtPrice: "79.99",
          },
          several.variants[1] as Variant,
        ],
      },
      store,
    ) as Google.Item[];
    const xml = Google.feed(store, [first as Google.Item]);
    expect(xml).toContain("<g:price>79.99 USD</g:price>");
    expect(xml).toContain("<g:sale_price>59.99 USD</g:sale_price>");
    expect(xml).toContain("<g:item_group_id>500</g:item_group_id>");
    expect(xml).toContain("<g:identifier_exists>false</g:identifier_exists>");
    expect(xml).toContain("<g:color>Black</g:color>");
    expect(xml).toContain("<g:size>10</g:size>");
  });

  test("a missing cell is absent: no default price, currency or availability", () => {
    const xml = Google.feed(store, [
      { ...item, currency: null, availability: null, brand: null },
    ]);
    expect(xml).not.toContain("g:price");
    expect(xml).not.toContain("g:availability");
    expect(xml).not.toContain("g:brand");
    expect(xml).not.toContain("USD");
  });

  test("escapes markup and drops the control characters XML forbids", () => {
    const xml = Google.feed({ ...store, name: "Acme & Co" }, [
      { ...item, title: "Shoes <b>\"10\"</b> & 'more'\u0007" },
    ]);
    expect(xml).toContain("<title>Acme &amp; Co</title>");
    expect(xml).toContain(
      "<title>Shoes &lt;b&gt;&quot;10&quot;&lt;/b&gt; &amp; &apos;more&apos;</title>",
    );
    expect(xml).not.toContain("\u0007");
  });

  test("an unnamed store's channel falls back to its host, and no item needs it", () => {
    expect(Google.feed({ ...store, name: null }, [])).toContain(
      "<title>acme.com</title>",
    );
  });
});

describe("hard rules: the channels", () => {
  test("ChatGPT's store_country is never assumed", () => {
    const german = { ...store, origin: "https://acme.de", host: "acme.de" };

    expect(ChatGPT.toRows(product, german)[0]?.store_country).toBeNull();
    expect(ChatGPT.csv(ChatGPT.toRows(product, german))).not.toContain(",US,");
  });

  test("an amount with more decimals than its currency has stays out of both feeds", () => {
    const misread: Product = {
      ...product,
      currency: "EUR",
      variants: [{ ...variant, price: "1.299" }],
    };

    expect(errors(Google.assess(misread, store))).toContain("price_digits");
    expect(errors(ChatGPT.assess(misread, store))).toContain("price_digits");
  });

  test("trailing zeros are not excess, and both feeds write the one price", () => {
    const stated: Product = {
      ...product,
      variants: [{ ...variant, price: "12.5000" }],
    };
    const items = Google.toItems(stated, store);

    expect(errors(Google.assess(stated, store))).not.toContain("price_digits");
    expect(Google.feed(store, items)).toContain("<g:price>12.50 USD</g:price>");
    expect(ChatGPT.toRows(stated, store)[0]?.price).toBe("12.50 USD");
  });

  test.each([["pre_order"], ["backorder"]] as const)(
    "Google refuses %s with no ship date, ChatGPT takes it",
    (availability) => {
      const waiting: Product = {
        ...product,
        variants: [{ ...variant, availability }],
      };

      expect(errors(Google.assess(waiting, store))).toContain(
        "availability_date_missing",
      );
      expect(errors(ChatGPT.assess(waiting, store))).toEqual([]);
    },
  );

  test.each([
    [{ condition: "used" as const }],
    [{ condition: "refurbished" as const }],
    [{ title: "Certified Refurbished Trail Shoes" }],
  ])("%j says it is not new, so neither feed takes it", (over) => {
    const secondhand: Product = { ...product, ...over };

    expect(errors(Google.assess(secondhand, store))).toContain(
      "condition_not_new",
    );
    expect(errors(ChatGPT.assess(secondhand, store))).toContain(
      "condition_not_new",
    );
  });

  test("a store stating new is not held back", () => {
    const stated: Product = { ...product, condition: "new" };

    expect(errors(Google.assess(stated, store))).toEqual([]);
    expect(errors(ChatGPT.assess(stated, store))).toEqual([]);
  });

  test("the XML writer drops the code points XML 1.0 forbids", () => {
    const hostile = { ...item, title: "Shoe￾￿\u0007 trail" };

    expect(Google.feed(store, [hostile])).toContain(
      "<title>Shoe trail</title>",
    );
  });
});

describe("hard rules: wording", () => {
  const root = `${import.meta.dir}/../..`;
  const sources = [
    ...new Bun.Glob("app/**/agents/**/*.{ts,tsx}").scanSync(root),
    ...new Bun.Glob("app/**/(stage)/**/*.{ts,tsx}").scanSync(root),
    ...new Bun.Glob("server/app/storefront/*.ts").scanSync(root),
  ];

  test("finds the files it is meant to read", () => {
    expect(sources.length).toBeGreaterThan(15);
  });

  test.each(sources)("%s never places a product in ChatGPT", async (file) => {
    const text = await Bun.file(`${root}/${file}`).text();

    expect(text).not.toMatch(
      /\b(?:live|listed|published|shown|available|now|appears?) (?:in|on) (?:chatgpt|chatgpt shopping)\b/i,
    );
    expect(text).not.toMatch(/\bin chatgpt\b/i);
    expect(text).not.toMatch(/\blisted in chatgpt\b/i);
  });
});
