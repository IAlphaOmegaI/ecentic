import { describe, expect, test } from "bun:test";
import type {
  FormEvidence,
  FormIntent,
  StoreWorkflow,
  Tool,
} from "@/lib/webmcp";
import {
  classifyStoreForm,
  inspectStoreCoverage,
  workflowsForTool,
} from "@/server/utils/webmcp-commerce";

const PAGE = "https://store.example/";
const SOURCE = "https://cdn.example/store-tools.js";
const tool = (name: string | null, overrides: Partial<Tool> = {}): Tool => ({
  name,
  description: "Available store operation.",
  kind: "imperative",
  sourceUrl: SOURCE,
  pageUrl: PAGE,
  inputNames: [],
  parameters: [],
  schemaState: "absent",
  execution: "declared",
  issues: [],
  ...overrides,
});
const field = (
  name: string,
  type = "text",
): FormEvidence["fields"][number] => ({
  name,
  type,
  description: null,
  required: false,
});
const form = (overrides: Partial<FormEvidence> = {}): FormEvidence => ({
  id: `${PAGE}#form-1`,
  pageUrl: PAGE,
  selector: "#form",
  label: null,
  action: PAGE,
  method: "get",
  declared: false,
  toolName: null,
  sensitive: false,
  autoSubmit: false,
  fields: [],
  ...overrides,
});

describe("store workflow source coverage", () => {
  test("maps the ten observed Monos tool names to all eight workflows and preserves references", () => {
    const definitions = [
      "browse_store",
      "cancel_cart",
      "get_cart",
      "get_product",
      "manage_orders",
      "proceed_to_checkout",
      "search_catalog",
      "search_shop_policies_and_faqs",
      "show_variant",
      "update_cart",
    ].map((name) => tool(name));
    const report = inspectStoreCoverage({
      url: PAGE,
      tools: definitions,
      forms: [],
    });
    expect(report.context).toBe("storefront");
    expect(report.signals).toEqual([{ kind: "commerceTool", url: SOURCE }]);
    expect(report.workflows.map(({ id, status }) => [id, status])).toEqual([
      ["catalogSearch", "toolFound"],
      ["productDetails", "toolFound"],
      ["variants", "toolFound"],
      ["cartRead", "toolFound"],
      ["cartUpdate", "toolFound"],
      ["checkout", "toolFound"],
      ["policies", "toolFound"],
      ["orders", "toolFound"],
    ]);
    expect(
      report.workflows.find(({ id }) => id === "cartUpdate")?.tools,
    ).toEqual(
      ["cancel_cart", "update_cart"].map((name) => ({
        name,
        sourceUrl: SOURCE,
        pageUrl: PAGE,
      })),
    );
  });

  test("recognizes camel, kebab and noun-first names without rewriting the reported names", () => {
    const names: [string, StoreWorkflow][] = [
      ["searchProducts", "catalogSearch"],
      ["getProductById", "productDetails"],
      ["select-product-variant", "variants"],
      ["cart-read", "cartRead"],
      ["addItemToCart", "cartUpdate"],
      ["navigateToCheckout", "checkout"],
      ["getReturnPolicy", "policies"],
      ["requestOrderReturn", "orders"],
    ];
    for (const [name, workflow] of names) {
      const report = inspectStoreCoverage({
        url: PAGE,
        forms: [],
        tools: [tool(name)],
      });
      expect(
        report.workflows
          .filter(({ status }) => status === "toolFound")
          .map(({ id }) => id),
      ).toEqual([workflow]);
      expect(
        report.workflows.find(({ id }) => id === workflow)?.tools[0]?.name,
      ).toBe(name);
    }
  });

  test("keeps parameterless cart reads valid and reports unresolved definitions for review", () => {
    const report = inspectStoreCoverage({
      url: PAGE,
      forms: [],
      tools: [
        tool("get_cart"),
        tool("get_product", {
          description: null,
          issues: ["missingDescription"],
        }),
        tool("show_variant", { execution: "missing" }),
        tool("update_cart", { execution: "unresolved" }),
        tool("proceed_to_checkout", { schemaState: "unresolved" }),
        tool(null, {
          description: "Search the catalog for products.",
          issues: ["missingName"],
        }),
      ],
    });
    expect(report.workflows.find(({ id }) => id === "cartRead")?.status).toBe(
      "toolFound",
    );
    for (const workflow of [
      "catalogSearch",
      "productDetails",
      "variants",
      "cartUpdate",
      "checkout",
    ])
      expect(report.workflows.find(({ id }) => id === workflow)?.status).toBe(
        "review",
      );
    expect(
      report.workflows.find(({ id }) => id === "catalogSearch")?.tools,
    ).toEqual([]);
  });

  test("does not turn descriptions' prohibitions and cross-references into extra workflows", () => {
    const report = inspectStoreCoverage({
      url: PAGE,
      forms: [],
      tools: [
        tool("search_catalog", {
          description:
            "Search the catalog. Do not update the cart or proceed to checkout. Use get_product to inspect details, show_variant for variants, and manage_orders for orders.",
        }),
        tool("help", {
          description:
            "Do not update the cart. This help tool documents checkout, orders and products.",
        }),
        tool("other", {
          description:
            "Answer questions about how to search products or get the cart.",
        }),
      ],
    });
    expect(
      report.workflows
        .filter(({ status }) => status !== "notObserved")
        .map(({ id }) => id),
    ).toEqual(["catalogSearch"]);
    expect(workflowsForTool(tool("searchProductCatalog"))).toEqual([
      "catalogSearch",
    ]);
  });

  test("uses a narrow opening purpose for unfamiliar names without treating generic names as store context", () => {
    const report = inspectStoreCoverage({
      url: PAGE,
      forms: [],
      tools: [
        tool("lookup", {
          description:
            "Read the current shopping cart. Do not change it or start checkout.",
        }),
      ],
    });
    expect(report.workflows.find(({ id }) => id === "cartRead")?.status).toBe(
      "toolFound",
    );
    expect(report.workflows.find(({ id }) => id === "cartUpdate")?.status).toBe(
      "notObserved",
    );
    expect(report.workflows.find(({ id }) => id === "checkout")?.status).toBe(
      "notObserved",
    );
    expect(report.context).toBe("unconfirmed");
  });

  test("generic search, contact, newsletter and FAQ features do not establish store context", () => {
    const report = inspectStoreCoverage({
      url: "https://news.example/search",
      tools: [
        tool("search", {
          pageUrl: "https://news.example/search",
          description: "Search articles by their title.",
        }),
        tool("contact", { description: "Contact the editorial team." }),
        tool("get_faq", { description: "Get frequently asked questions." }),
      ],
      forms: [
        form({
          id: "articles",
          label: "Search articles",
          fields: [field("q")],
        }),
        form({
          id: "contact",
          label: "Contact us",
          fields: [field("email"), field("message")],
        }),
        form({
          id: "newsletter",
          label: "Subscribe to our newsletter",
          fields: [field("email")],
        }),
      ],
    });
    expect(report.context).toBe("unconfirmed");
    expect(report.signals).toEqual([]);
    expect(
      report.workflows.find(({ id }) => id === "catalogSearch"),
    ).toMatchObject({ status: "formOnly", formIds: ["articles"], tools: [] });
    expect(
      report.workflows.filter(({ status }) => status !== "notObserved"),
    ).toHaveLength(1);
  });

  test("uses inspected product and collection routes, excluding failed and documentation URLs", () => {
    const pages = [
      {
        url: `${PAGE}fr/products/bag`,
        status: "scanned" as const,
        httpStatus: 200,
      },
      {
        url: `${PAGE}collections/travel`,
        status: "scanned" as const,
        httpStatus: 200,
      },
      {
        url: `${PAGE}product-category/suitcases`,
        status: "scanned" as const,
        httpStatus: 200,
      },
      {
        url: `${PAGE}products/unreachable`,
        status: "unavailable" as const,
        httpStatus: 403,
      },
      {
        url: `${PAGE}docs/products/search`,
        status: "scanned" as const,
        httpStatus: 200,
      },
      {
        url: `${PAGE}api/products/bag`,
        status: "scanned" as const,
        httpStatus: 200,
      },
    ];
    const report = inspectStoreCoverage({
      url: PAGE,
      pages,
      tools: [],
      forms: [],
    });
    expect(report.context).toBe("storefront");
    expect(report.signals).toEqual([
      { kind: "productPage", url: `${PAGE}fr/products/bag` },
      { kind: "catalogPage", url: `${PAGE}collections/travel` },
      { kind: "catalogPage", url: `${PAGE}product-category/suitcases` },
    ]);
    expect(
      report.workflows.every(({ status }) => status === "notObserved"),
    ).toBe(true);
    expect(
      inspectStoreCoverage({
        url: `${PAGE}products/blocked`,
        pages: [
          {
            url: `${PAGE}products/blocked`,
            status: "unavailable",
            httpStatus: 403,
          },
        ],
        tools: [],
        forms: [],
      }).context,
    ).toBe("unconfirmed");
  });

  test("reports form-only operations with relevant form IDs, independently of the request method", () => {
    const report = inspectStoreCoverage({
      url: PAGE,
      tools: [],
      forms: [
        form({
          id: "add",
          action: `${PAGE}cart/add`,
          method: "post",
          fields: [field("id"), field("quantity")],
        }),
        form({
          id: "coupon",
          label: "Apply coupon",
          fields: [field("coupon_code")],
        }),
        form({
          id: "orders",
          action: `${PAGE}orders/track`,
          fields: [field("order_number")],
        }),
        form({
          id: "newsletter",
          action: `${PAGE}subscribe`,
          method: "get",
          fields: [field("email")],
        }),
      ],
    });
    expect(report.signals).toEqual([{ kind: "cartForm", url: PAGE }]);
    expect(
      report.workflows.find(({ id }) => id === "cartUpdate"),
    ).toMatchObject({ status: "formOnly", formIds: ["add", "coupon"] });
    expect(report.workflows.find(({ id }) => id === "cartRead")?.status).toBe(
      "notObserved",
    );
    expect(report.workflows.find(({ id }) => id === "orders")).toMatchObject({
      status: "formOnly",
      formIds: ["orders"],
    });
    expect(report.workflows.flatMap(({ formIds }) => formIds)).not.toContain(
      "newsletter",
    );
  });

  test("a complete declarative tool has the same source status as an imperative definition", () => {
    const report = inspectStoreCoverage({
      url: PAGE,
      tools: [
        tool("search_products", {
          kind: "declarative",
          sourceUrl: PAGE,
          execution: "form",
          schemaState: "notApplicable",
        }),
      ],
      forms: [
        form({
          id: "search",
          label: "Search products",
          toolName: "search_products",
          declared: true,
          fields: [field("query")],
        }),
      ],
    });
    expect(
      report.workflows.find(({ id }) => id === "catalogSearch"),
    ).toMatchObject({
      status: "toolFound",
      formIds: ["search"],
      tools: [{ name: "search_products", sourceUrl: PAGE, pageUrl: PAGE }],
    });
  });
});

describe("store form operation classification", () => {
  test("recognizes direct purchase actions before interpreting their product and quantity fields", () => {
    for (const action of ["buy-now", "place-order", "complete-purchase"])
      expect(
        classifyStoreForm(
          form({
            pageUrl: `${PAGE}products/shoe`,
            action: `${PAGE}${action}`,
            method: "post",
            fields: [field("product_id"), field("quantity")],
          }),
        ),
      ).toBe("checkout");
    expect(
      classifyStoreForm(
        form({
          action: `${PAGE}checkout`,
          label: "Place your order",
          fields: [field("order_number")],
        }),
      ),
    ).toBe("checkout");
  });

  test("keeps product add-to-cart and mixed cart updates distinct from variant and coupon forms", () => {
    expect(
      classifyStoreForm(
        form({
          action: `${PAGE}cart/add`,
          label: "Choose a variant",
          fields: [field("variant_id"), field("size")],
        }),
      ),
    ).toBe("cart");
    expect(
      classifyStoreForm(
        form({
          action: `${PAGE}cart`,
          fields: [field("coupon_code"), field("cart[abcdef][qty]")],
        }),
      ),
    ).toBe("cart");
    expect(
      classifyStoreForm(
        form({
          action: `${PAGE}cart`,
          label: "Apply coupon",
          fields: [field("coupon_code")],
        }),
      ),
    ).toBe("coupon");
    expect(
      classifyStoreForm(
        form({
          label: "Choose a product variant",
          fields: [field("variant_id")],
        }),
      ),
    ).toBe("variant");
    expect(
      classifyStoreForm(
        form({ label: "Get product details", fields: [field("product_id")] }),
      ),
    ).toBe("product");
  });

  test("requires both postal fields and a shipping cue for shipping estimation", () => {
    expect(
      classifyStoreForm(
        form({
          label: "Estimate delivery",
          fields: [field("shipping_postcode")],
        }),
      ),
    ).toBe("shipping");
    expect(
      classifyStoreForm(
        form({ label: "Calculate shipping", fields: [field("zipCode")] }),
      ),
    ).toBe("shipping");
    expect(
      classifyStoreForm(
        form({
          label: "Find your local representative",
          fields: [field("postcode")],
        }),
      ),
    ).toBe("other");
    expect(
      classifyStoreForm(
        form({
          label: "Subscribe to shipping updates",
          fields: [field("email")],
        }),
      ),
    ).toBe("newsletter");
    expect(classifyStoreForm(form({ fields: [field("discountCode")] }))).toBe(
      "coupon",
    );
  });

  test("recognizes checkout, orders and returns even when sensitive and separates ordinary account forms", () => {
    const cases: { evidence: Partial<FormEvidence>; intent: FormIntent }[] = [
      {
        evidence: {
          action: `${PAGE}checkout`,
          fields: [field("email"), field("card_number")],
        },
        intent: "checkout",
      },
      {
        evidence: {
          action: `${PAGE}account/orders`,
          fields: [field("email"), field("order_number")],
        },
        intent: "orderTracking",
      },
      {
        evidence: { label: "Track your order", fields: [field("email")] },
        intent: "orderTracking",
      },
      {
        evidence: {
          action: `${PAGE}account/returns`,
          fields: [field("order_number"), field("return_reason")],
        },
        intent: "returns",
      },
      {
        evidence: {
          action: `${PAGE}account/login`,
          fields: [field("email"), field("password", "password")],
        },
        intent: "account",
      },
    ];
    for (const { evidence, intent } of cases)
      expect(classifyStoreForm(form({ ...evidence, sensitive: true }))).toBe(
        intent,
      );
  });

  test("does not infer checkout, policies or order coverage from an unrelated shipping estimate", () => {
    const report = inspectStoreCoverage({
      url: PAGE,
      tools: [],
      forms: [
        form({ label: "Estimate shipping", fields: [field("postal_code")] }),
      ],
    });
    expect(report.context).toBe("unconfirmed");
    expect(
      report.workflows.every(({ status }) => status === "notObserved"),
    ).toBe(true);
  });
});
