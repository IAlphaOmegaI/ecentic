import { describe, expect, test } from "bun:test";
import type { Result } from "@zenncore/utils";
import * as HTTP from "../utils/http";
import { normalizeScanUrl, scanWebsite } from "../utils/webmcp";
import { HTML_LIMIT_BYTES } from "../utils/webmcp-limits";

const page = (
  url: string,
  body: string,
  contentType = "text/html",
  status = 200,
): Result<HTTP.Page> => ({
  success: true,
  data: {
    url,
    body,
    status,
    headers: new Headers({ "content-type": contentType }),
  },
});

const fixture = (pages: Record<string, Result<HTTP.Page>>) => {
  const requests: { url: string; options: Parameters<typeof HTTP.page>[1] }[] =
    [];
  const read: typeof HTTP.page = async (url, options) => {
    requests.push({ url, options });
    return (
      pages[url] ?? { success: false, error: new Error("Unavailable fixture") }
    );
  };
  return { read, requests };
};

describe("WebMCP scan coverage", () => {
  test("audits distinct registration sites without inflating the deduplicated inventory", async () => {
    const target = "https://store.example/";
    const declaration =
      '<form toolname="find_products" tooldescription="Find products using the supplied search terms."><input name="query"></form>';
    const registration =
      'document.modelContext.registerTool({name:"read_cart",description:"Read the current cart without changing its contents.",execute(){}});';
    const outcome = await scanWebsite(
      target,
      fixture({
        [target]: page(
          target,
          `${declaration}${declaration}<script>${registration}${registration}</script>`,
        ),
      }),
    );
    expect(outcome.kind).toBe("complete");
    if (outcome.kind !== "complete") return;
    expect(outcome.report.tools).toHaveLength(2);
    expect(outcome.report.forms).toHaveLength(2);
    expect(
      outcome.report.audit.findings
        .filter((finding) => finding.code === "duplicateToolName")
        .map((finding) => finding.subject),
    ).toEqual(["find_products", "read_cart"]);
    expect(
      outcome.report.audit.checks.find((check) => check.id === "metadata")
        ?.status,
    ).toBe("attention");
  });

  test("retains unannotated automatic-submission evidence without offering an enablement snippet", async () => {
    const target = "https://store.example/";
    const outcome = await scanWebsite(
      target,
      fixture({
        [target]: page(
          target,
          '<form action="/cart/add" method="post" toolautosubmit><input name="quantity" type="number"></form>',
        ),
      }),
    );
    expect(outcome.kind).toBe("complete");
    if (outcome.kind !== "complete") return;
    expect(outcome.report.forms[0]?.autoSubmit).toBe(true);
    expect(outcome.report.audit.summary.opportunities).toBe(0);
    expect(
      outcome.report.audit.findings.find(
        (finding) => finding.code === "formReview",
      )?.snippet,
    ).toBeNull();
  });

  test("reads and inspects a large storefront through the actual bounded body reader", async () => {
    const markup = `<!doctype html><html><head><title>Large storefront</title></head><body><!--${"x".repeat(4_700_000)}--><form toolname="search_catalog" tooldescription="Search products"><input name="query"></form></body></html>`;
    const read: typeof HTTP.page = async (url, options) => {
      const body = await HTTP.read(new Response(markup), {
        limit: options?.limit,
      });
      return body.success ? page(url, body.data) : body;
    };
    const outcome = await scanWebsite("store.example", { read });
    expect(outcome.kind).toBe("complete");
    if (outcome.kind !== "complete") return;
    expect(outcome.report.tools[0]?.name).toBe("search_catalog");
    expect(outcome.report.limitations).toEqual(["staticOnly"]);
  });

  test("distinguishes the scanner's size limit from an inaccessible storefront", async () => {
    const read: typeof HTTP.page = async (url, options) => {
      const body = await HTTP.read(
        new Response("x".repeat(HTML_LIMIT_BYTES + 1)),
        { limit: options?.limit },
      );
      return body.success ? page(url, body.data) : body;
    };
    expect(await scanWebsite("store.example", { read })).toEqual({
      kind: "tooLarge",
    });
  });

  test("counts one document when catalog links redirect to the same page", async () => {
    const target = "https://store.example/";
    const markup =
      '<a href="/shop">Shop</a><a href="/catalog">Catalog</a><form toolname="search" tooldescription="Find products"></form>';
    const outcome = await scanWebsite(
      target,
      fixture({
        [target]: page(target, markup),
        "https://store.example/shop": page(target, markup),
        "https://store.example/catalog": page(target, markup),
      }),
    );
    expect(outcome.kind).toBe("complete");
    if (outcome.kind !== "complete") return;
    expect(outcome.report.coverage.pages).toBe(1);
    expect(outcome.report.pages).toHaveLength(1);
    expect(outcome.report.tools).toHaveLength(1);
  });

  test("keeps a requested product path and defaults bare domains to HTTPS", () => {
    expect(normalizeScanUrl(" store.example/products/shoe#details ")).toBe(
      "https://store.example/products/shoe",
    );
    expect(normalizeScanUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeScanUrl("https://user:password@store.example")).toBeNull();
    expect(normalizeScanUrl("not a url")).toBeNull();
  });

  test("inspects linked catalog pages and fetches shared CDN scripts once", async () => {
    const target = "https://store.example/";
    const shared = '<script src="https://cdn.example/webmcp.js"></script>';
    const transport = fixture({
      [target]: page(
        target,
        `${shared}<a href="/products/shoe">Shoe</a><a href="/shop">Shop</a><a href="https://other.example/products/hat">Other</a>`,
      ),
      "https://store.example/products/shoe": page(
        "https://store.example/products/shoe",
        `${shared}<form toolname="size_guide" tooldescription="Find your size"><input name="size"></form>`,
      ),
      "https://store.example/shop": page("https://store.example/shop", shared),
      "https://cdn.example/webmcp.js": page(
        "https://cdn.example/webmcp.js",
        'document.modelContext.registerTool({name:"search",description:"Find products",execute(){}})',
        "text/javascript",
      ),
    });
    const outcome = await scanWebsite(target, transport);
    expect(outcome.kind).toBe("complete");
    if (outcome.kind !== "complete") return;
    expect(outcome.report.status).toBe("markup-found");
    expect(outcome.report.coverage.pages).toBe(3);
    expect(outcome.report.coverage.scripts).toBe(1);
    expect(
      outcome.report.tools.some((tool) => tool.name === "size_guide"),
    ).toBe(true);
    expect(
      outcome.report.tools
        .filter((tool) => tool.name === "search")
        .map((tool) => tool.pageUrl),
    ).toEqual([target]);
    expect(
      transport.requests.filter(
        ({ url }) => url === "https://cdn.example/webmcp.js",
      ),
    ).toHaveLength(1);
    expect(
      transport.requests.some(({ url }) => url.includes("other.example")),
    ).toBe(false);
    expect(outcome.report.limitations).toEqual(["staticOnly"]);
  });

  test("caps fanout, prioritizes explicitly linked WebMCP and excludes action URLs", async () => {
    const target = "https://store.example/";
    const scripts = Array.from(
      { length: 14 },
      (_, index) => `https://store.example/assets/${index}.js`,
    );
    const markup = [
      ...scripts.map((url) => `<script src="${url}"></script>`),
      '<script src="/webmcp.js"></script>',
      '<a href="/shop?add-to-cart=1">Cart</a>',
      '<a href="/products/delete">Delete</a>',
      '<a href="/products/a">A</a><a href="/products/b">B</a><a href="/products/c">C</a>',
    ].join("");
    const transport = fixture({
      [target]: page(target, markup),
      ...Object.fromEntries(
        scripts.map((url) => [
          url,
          page(url, "void 0", "application/javascript"),
        ]),
      ),
      "https://store.example/webmcp.js": page(
        "https://store.example/webmcp.js",
        'navigator.modelContext.registerTool({name:"search",description:"Search",execute(){}})',
        "application/javascript",
      ),
      "https://store.example/products/a": page(
        "https://store.example/products/a",
        "<h1>A</h1>",
      ),
      "https://store.example/products/b": page(
        "https://store.example/products/b",
        "<h1>B</h1>",
      ),
    });
    const outcome = await scanWebsite(target, transport);
    expect(outcome.kind).toBe("complete");
    if (outcome.kind !== "complete") return;
    expect(outcome.report.coverage).toEqual({
      pages: 3,
      scripts: 12,
      skippedScripts: 3,
      failedResources: 0,
    });
    expect(outcome.report.status).toBe("script-signals");
    expect(outcome.report.limitations).toEqual([
      "staticOnly",
      "pageLimit",
      "scriptLimit",
    ]);
    expect(transport.requests).toHaveLength(15);
    expect(
      transport.requests.every(
        ({ options }) =>
          (options?.timeout ?? 0) <= 6000 &&
          (options?.limit ?? 0) <= HTML_LIMIT_BYTES,
      ),
    ).toBe(true);
    expect(
      transport.requests.some(({ url }) =>
        /add-to-cart|delete|products\/c/.test(url),
      ),
    ).toBe(false);
  });

  test("samples a product and a collection even when navigation lists collections first", async () => {
    const target = "https://store.example/";
    const collection = `${target}collections/bags`;
    const product = `${target}collections/bags/products/carry-on`;
    const transport = fixture({
      [target]: page(
        target,
        '<a href="/collections/bags">Bags</a><a href="/collections/new">New</a><a href="/collections/bags/products/carry-on">Carry on</a>',
      ),
      [collection]: page(collection, "<h1>Bags</h1>"),
      [product]: page(product, "<h1>Carry on</h1>"),
    });
    const outcome = await scanWebsite(target, transport);
    expect(transport.requests.map(({ url }) => url)).toEqual([
      target,
      product,
      collection,
    ]);
    expect(outcome.kind).toBe("complete");
    if (outcome.kind !== "complete") return;
    expect(outcome.report.audit.commerce.context).toBe("storefront");
    expect(outcome.report.audit.commerce.signals).toEqual(
      expect.arrayContaining([
        { kind: "productPage", url: product },
        { kind: "catalogPage", url: collection },
      ]),
    );
    expect(outcome.report.limitations).toContain("pageLimit");
  });

  test("uses a collection's observed product link for the last slot, including WooCommerce paths", async () => {
    const target = "https://store.example/";
    const collection = `${target}product-category/bags`;
    const product = `${target}product/carry-on`;
    const transport = fixture({
      [target]: page(
        target,
        '<a href="/product-category/bags">Bags</a><a href="/shop">Shop</a>',
      ),
      [collection]: page(
        collection,
        '<a href="/product/carry-on">Carry on</a><a href="/product/account/profile">Account</a><a href="/product/orders/1">Order</a><a href="/product/delete">Delete</a><a href="/product/other?add-to-cart=1">Add</a><a href="https://foreign.example/product/bag">Foreign</a>',
      ),
      [product]: page(product, "<h1>Carry on</h1>"),
    });
    const outcome = await scanWebsite(target, transport);
    expect(transport.requests.map(({ url }) => url)).toEqual([
      target,
      collection,
      product,
    ]);
    expect(outcome.kind).toBe("complete");
    if (outcome.kind !== "complete") return;
    expect(outcome.report.coverage.pages).toBe(3);
    expect(outcome.report.limitations).toContain("pageLimit");
    expect(
      outcome.report.audit.commerce.workflows.every(
        (workflow) => workflow.status === "notObserved",
      ),
    ).toBe(true);
  });

  test("prioritizes a catalog when the supplied URL already is a product page", async () => {
    const target = "https://store.example/products/a";
    const collection = "https://store.example/collections/bags";
    const product = "https://store.example/products/b";
    const transport = fixture({
      [target]: page(
        target,
        '<a href="/products/b">B</a><a href="/products/c">C</a><a href="/collections/bags">Bags</a>',
      ),
      [collection]: page(collection, "<h1>Bags</h1>"),
      [product]: page(product, "<h1>B</h1>"),
    });
    await scanWebsite(target, transport);
    expect(transport.requests.map(({ url }) => url)).toEqual([
      target,
      collection,
      product,
    ]);
  });

  test("reports partial inspection for blocked pages, script failures and invalid JavaScript", async () => {
    const target = "https://store.example/";
    const transport = fixture({
      [target]: page(
        target,
        '<a href="/shop">Shop</a><script src="/blocked.js"></script><script>function {</script>',
      ),
      "https://store.example/shop": page(
        "https://store.example/shop",
        "Forbidden",
        "text/html",
        403,
      ),
      "https://store.example/blocked.js": page(
        "https://store.example/blocked.js",
        "<h1>Challenge</h1>",
        "text/html",
      ),
    });
    const outcome = await scanWebsite(target, transport);
    expect(outcome.kind).toBe("complete");
    if (outcome.kind !== "complete") return;
    expect(outcome.report.status).toBe("no-evidence");
    expect(outcome.report.coverage.failedResources).toBe(2);
    expect(outcome.report.pages[1]).toMatchObject({
      status: "unavailable",
      httpStatus: 403,
    });
    expect(outcome.report.limitations).toContain("resourceFailures");
    expect(outcome.report.limitations).toContain("parseFailures");
  });

  test("follows a conditional script loader and extracts tool definitions from its imported module", async () => {
    const target = "https://store.example/";
    const loader = `<script>
      function load(source, {doc = document} = {}) {
        function ready() {
          const script = doc.createElement("script");
          script.src = source;
          doc.head.appendChild(script);
        }
        if (doc.modelContext) ready();
      }
      load("https://cdn.example/webmcp/bootstrap.js");
    </script>`;
    const transport = fixture({
      [target]: page(target, `${loader}<a href="/shop">Shop</a>`),
      "https://store.example/shop": page("https://store.example/shop", loader),
      "https://cdn.example/webmcp/bootstrap.js": page(
        "https://cdn.example/webmcp/v1/bootstrap.js",
        'import "./tools.js";',
        "text/javascript",
      ),
      "https://cdn.example/webmcp/v1/tools.js": page(
        "https://cdn.example/webmcp/v1/tools.js",
        `const definitions = {
          search: {name: "search_catalog", description: "Search products", inputSchema: {type: "object", properties: {query: {type: "string"}}}},
          cart: {name: "get_cart", description: "Read the cart", inputSchema: {type: "object", properties: {}}}
        };
        const tools = Object.values(definitions).map(definition => ({...definition, execute(){}}));
        for (const tool of tools) document.modelContext.registerTool(tool);
        import "../bootstrap.js";`,
        "application/javascript",
      ),
    });
    const outcome = await scanWebsite(target, transport);
    expect(outcome.kind).toBe("complete");
    if (outcome.kind !== "complete") return;
    expect(outcome.report.tools.map((tool) => tool.name)).toEqual([
      "search_catalog",
      "get_cart",
    ]);
    expect(outcome.report.tools[0]).toMatchObject({
      description: "Search products",
      inputNames: ["query"],
      sourceUrl: "https://cdn.example/webmcp/v1/tools.js",
      pageUrl: target,
    });
    expect(transport.requests.map(({ url }) => url)).toEqual([
      target,
      "https://store.example/shop",
      "https://cdn.example/webmcp/bootstrap.js",
      "https://cdn.example/webmcp/v1/tools.js",
    ]);
    expect(outcome.report.coverage.failedResources).toBe(0);
  });

  test("promotes an already linked module when the WebMCP bootstrap imports it", async () => {
    const target = "https://store.example/";
    const scripts = Array.from(
      { length: 14 },
      (_, index) => `https://store.example/assets/${index}.js`,
    );
    const transport = fixture({
      [target]: page(
        target,
        `${scripts.map((url) => `<script src="${url}"></script>`).join("")}<script src="/webmcp.js"></script>`,
      ),
      ...Object.fromEntries(
        scripts.map((url) => [url, page(url, "void 0;", "text/javascript")]),
      ),
      "https://store.example/webmcp.js": page(
        "https://store.example/webmcp.js",
        'import "./assets/13.js";',
        "text/javascript",
      ),
      "https://store.example/assets/13.js": page(
        "https://store.example/assets/13.js",
        'document.modelContext.registerTool({name:"search_catalog", description:"Search", execute(){}});',
        "text/javascript",
      ),
    });
    const outcome = await scanWebsite(target, transport);
    expect(outcome.kind).toBe("complete");
    if (outcome.kind !== "complete") return;
    expect(outcome.report.tools.map((tool) => tool.name)).toEqual([
      "search_catalog",
    ]);
    expect(outcome.report.coverage.scripts).toBe(12);
    expect(
      transport.requests.filter(({ url }) => url.endsWith("/13.js")),
    ).toHaveLength(1);
  });

  test("bounds dependency depth and reports the skipped module", async () => {
    const target = "https://store.example/";
    const transport = fixture({
      [target]: page(target, '<script src="/webmcp/0.js"></script>'),
      ...Object.fromEntries(
        Array.from({ length: 5 }, (_, index) => {
          const url = `https://store.example/webmcp/${index}.js`;
          return [
            url,
            page(url, `import "./${index + 1}.js";`, "text/javascript"),
          ];
        }),
      ),
    });
    const outcome = await scanWebsite(target, transport);
    expect(outcome.kind).toBe("complete");
    if (outcome.kind !== "complete") return;
    expect(outcome.report.coverage).toMatchObject({
      scripts: 4,
      skippedScripts: 1,
      failedResources: 0,
    });
    expect(outcome.report.limitations).toContain("scriptLimit");
    expect(transport.requests.some(({ url }) => url.endsWith("/4.js"))).toBe(
      false,
    );
  });

  test("resolves inline imports and injected script paths against the HTML base URL", async () => {
    const target = "https://store.example/";
    const transport = fixture({
      [target]: page(
        target,
        '<base href="/assets/"><script>const script = document.createElement("script"); script.src = "webmcp.js";</script><script type="module">import "./webmcp.js";</script>',
      ),
      "https://store.example/assets/webmcp.js": page(
        "https://store.example/assets/webmcp.js",
        'document.modelContext.registerTool({name:"get_cart", description:"Read cart", execute(){}});',
        "text/javascript",
      ),
    });
    const outcome = await scanWebsite(target, transport);
    expect(outcome.kind).toBe("complete");
    if (outcome.kind !== "complete") return;
    expect(outcome.report.tools[0]?.name).toBe("get_cart");
    expect(outcome.report.coverage.failedResources).toBe(0);
    expect(transport.requests).toHaveLength(2);
  });

  test("does not treat an unreachable homepage or JSON manifest as absent WebMCP", async () => {
    const target = "https://store.example/";
    expect(await scanWebsite(target, fixture({}))).toEqual({
      kind: "unreachable",
    });
    expect(
      await scanWebsite(
        target,
        fixture({ [target]: page(target, "{}", "application/json") }),
      ),
    ).toEqual({ kind: "unreachable" });
  });

  test("resolves linked pages against the final homepage and excludes off-site redirects", async () => {
    const target = "https://store.example/";
    const transport = fixture({
      [target]: page(
        "https://www.store.example/",
        '<a href="/products/a">A</a>',
      ),
      "https://www.store.example/products/a": page(
        "https://foreign.example/products/a",
        '<form toolname="foreign" tooldescription="Unrelated"></form>',
      ),
    });
    const outcome = await scanWebsite(target, transport);
    expect(outcome.kind).toBe("complete");
    if (outcome.kind !== "complete") return;
    expect(outcome.report.url).toBe("https://www.store.example/");
    expect(outcome.report.tools).toEqual([]);
    expect(outcome.report.coverage.failedResources).toBe(1);
  });
});
