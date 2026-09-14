import { describe, expect, test } from "bun:test";
import type { FormEvidence, Tool } from "@/lib/webmcp";
import { buildAudit } from "../utils/webmcp-audit";

const pageUrl = "https://store.example/";
const storePages = [
  {
    url: `${pageUrl}products/carry-on`,
    status: "scanned" as const,
    httpStatus: 200,
  },
];
const tool = (changes: Partial<Tool> = {}): Tool => ({
  name: "read_cart",
  description: "Read the current shopping cart without changing its contents.",
  kind: "imperative",
  pageUrl,
  sourceUrl: `${pageUrl}webmcp.js`,
  inputNames: [],
  parameters: [],
  schemaState: "absent",
  execution: "declared",
  issues: [],
  ...changes,
});
const form = (changes: Partial<FormEvidence> = {}): FormEvidence => ({
  id: `${pageUrl}#form-1`,
  pageUrl,
  selector: 'form[id="search"]',
  label: "Search store",
  action: `${pageUrl}search`,
  method: "get",
  declared: false,
  toolName: null,
  sensitive: false,
  autoSubmit: false,
  fields: [
    {
      name: "q",
      type: "search",
      description: "Search products",
      required: true,
    },
  ],
  ...changes,
});
const audit = (tools: Tool[] = [], forms: FormEvidence[] = []) =>
  buildAudit({
    url: pageUrl,
    tools,
    forms,
    signals: [],
    limitations: ["staticOnly"],
    pages: storePages,
  });

describe("WebMCP source audit", () => {
  test("accepts imperative tools and optional schemas without requiring declarative forms", () => {
    const report = audit([tool()]);
    expect(report.summary.high).toBe(0);
    expect(report.summary.improvements).toBe(0);
    expect(report.checks.find((check) => check.id === "metadata")?.status).toBe(
      "pass",
    );
    expect(
      report.checks.find((check) => check.id === "parameters")?.status,
    ).toBe("pass");
    expect(report.checks.find((check) => check.id === "forms")?.status).toBe(
      "unknown",
    );
    expect(report.checks.find((check) => check.id === "runtime")?.status).toBe(
      "unknown",
    );
    expect(report.findings.map((finding) => finding.code)).toEqual([
      "runtimeUnverified",
    ]);
  });

  test("prioritizes confidently missing requirements and preserves exact source attribution", () => {
    const report = audit([
      tool({
        name: null,
        description: null,
        execution: "missing",
        issues: ["missingName", "missingDescription"],
      }),
    ]);
    expect(report.summary.high).toBe(3);
    expect(report.findings.slice(0, 3).map((finding) => finding.code)).toEqual([
      "missingToolName",
      "missingToolDescription",
      "missingHandler",
    ]);
    expect(report.findings[0]).toMatchObject({
      pageUrl,
      sourceUrl: `${pageUrl}webmcp.js`,
      priority: "high",
    });
    expect(new Set(report.findings.map((finding) => finding.id)).size).toBe(
      report.findings.length,
    );
  });

  test("leaves dynamic metadata and handlers unknown rather than calling them absent", () => {
    const report = audit([
      tool({
        name: null,
        description: null,
        execution: "unresolved",
        schemaState: "unresolved",
        issues: ["unresolvedDefinition"],
      }),
    ]);
    expect(report.summary.high).toBe(0);
    expect(report.summary.improvements).toBe(0);
    expect(
      report.checks.find((check) => check.id === "implementation")?.status,
    ).toBe("unknown");
    expect(
      report.checks.find((check) => check.id === "parameters")?.status,
    ).toBe("unknown");
    expect(
      report.findings.some((finding) => finding.code === "missingHandler"),
    ).toBe(false);
  });

  test("treats description quality and parameter guidance as advisory improvements", () => {
    const report = audit([
      tool({
        description: "Find products",
        schemaState: "resolved",
        inputNames: ["query", "limit"],
        parameters: [
          { name: "query", type: "string", description: null, required: true },
          {
            name: "limit",
            type: "number",
            description: "Maximum number of results",
            required: false,
          },
        ],
      }),
    ]);
    expect(report.summary.high).toBe(0);
    expect(
      report.findings.find(
        (finding) => finding.code === "missingParameterDescriptions",
      ),
    ).toMatchObject({ priority: "low", evidence: ["query"] });
    expect(
      report.findings.find((finding) => finding.code === "briefDescription")
        ?.priority,
    ).toBe("low");
  });

  test("assigns unknown status to dynamic metadata without obscuring a known handler", () => {
    const report = audit([
      tool({ description: null, issues: ["unresolvedDefinition"] }),
    ]);
    expect(report.checks.find((check) => check.id === "metadata")?.status).toBe(
      "unknown",
    );
    expect(
      report.checks.find((check) => check.id === "implementation")?.status,
    ).toBe("pass");
    expect(report.summary.high).toBe(0);
  });

  test("flags possible name conflicts within a page but allows reuse across documents", () => {
    const repeated = [tool(), tool({ pageUrl: `${pageUrl}shop` })];
    expect(
      audit(repeated).findings.some(
        (finding) => finding.code === "duplicateToolName",
      ),
    ).toBe(false);
    const report = audit([
      ...repeated,
      tool({ sourceUrl: `${pageUrl}other.js` }),
    ]);
    expect(
      report.findings.filter((finding) => finding.code === "duplicateToolName"),
    ).toHaveLength(1);
    expect(
      report.findings.find((finding) => finding.code === "duplicateToolName")
        ?.evidence,
    ).toEqual([`${pageUrl}webmcp.js`, `${pageUrl}other.js`]);
  });

  test("offers annotation additions for useful unannotated forms without replacing their behavior", () => {
    const report = audit([], [form()]);
    const finding = report.findings.find(
      (finding) => finding.code === "formOpportunity",
    );
    expect(report.summary.opportunities).toBe(1);
    expect(finding).toMatchObject({
      priority: "opportunity",
      formId: `${pageUrl}#form-1`,
      evidence: ['form[id="search"]', `GET ${pageUrl}search`, "q"],
    });
    expect(finding?.snippet).toContain('toolname="search_store_1"');
    expect(finding?.snippet).toContain("tooldescription=");
    expect(finding?.snippet).not.toMatch(
      /toolautosubmit|<form|action=|method=|execute/,
    );
  });

  test("recognizes possible existing coverage without claiming a form-to-tool connection", () => {
    const report = audit([tool({ name: "search_catalog" })], [form()]);
    expect(report.summary.opportunities).toBe(0);
    expect(
      report.findings.find((finding) => finding.code === "formReview"),
    ).toMatchObject({
      priority: "info",
      relatedTools: ["search_catalog"],
      snippet: null,
    });
    expect(report.checks.find((check) => check.id === "forms")?.status).toBe(
      "unknown",
    );
  });

  test("keeps sensitive and dialog forms for manual review with no enablement snippet", () => {
    const report = audit(
      [],
      [form({ sensitive: true }), form({ id: "dialog", method: "dialog" })],
    );
    expect(report.summary.opportunities).toBe(0);
    const findings = report.findings.filter(
      (finding) => finding.code === "formReview",
    );
    expect(findings).toHaveLength(2);
    expect(findings.every((finding) => finding.snippet === null)).toBe(true);
  });

  test("does not activate a pre-existing toolautosubmit flag on an unannotated form", () => {
    const report = audit([], [form({ autoSubmit: true })]);
    expect(report.summary.opportunities).toBe(0);
    expect(
      report.findings.find((finding) => finding.code === "formReview")?.snippet,
    ).toBeNull();
  });

  test("recognizes related tools across camel, kebab and snake naming styles", () => {
    for (const name of [
      "searchProducts",
      "search-products",
      "search_products",
    ]) {
      const report = audit([tool({ name })], [form()]);
      expect(report.summary.opportunities).toBe(0);
      expect(
        report.findings.find((finding) => finding.code === "formReview")
          ?.relatedTools,
      ).toEqual([name]);
    }
  });

  test("uses the same shopping-purpose evidence for aliases and form recommendations", () => {
    for (const name of ["searchProductCatalog", "catalog_lookup"]) {
      const report = audit(
        [
          tool({
            name,
            description:
              "Search the store products using a natural language query.",
          }),
        ],
        [form()],
      );
      expect(
        report.commerce.workflows.find(
          (workflow) => workflow.id === "catalogSearch",
        )?.status,
      ).toBe("toolFound");
      expect(report.summary.opportunities).toBe(0);
      expect(
        report.findings.find((finding) => finding.code === "formReview")
          ?.relatedTools,
      ).toEqual([name]);
    }
  });

  test("keeps field-inferred product and variant forms under review without asserting submission effects", () => {
    const product = form({
      label: "",
      selector: "form:nth-of-type(1)",
      action: `${pageUrl}custom`,
      method: "post",
      pageUrl: `${pageUrl}products/shoe`,
      fields: [
        { name: "product_id", type: "text", description: null, required: true },
        { name: "quantity", type: "number", description: null, required: true },
      ],
    });
    const variant = form({
      ...product,
      id: "variant",
      fields: [
        {
          name: "variant_id",
          type: "select",
          description: null,
          required: true,
        },
      ],
    });
    const purchase = form({
      ...product,
      id: "purchase",
      action: `${pageUrl}buy-now`,
    });
    const report = audit([], [product, variant, purchase]);
    expect(report.summary.opportunities).toBe(0);
    expect(
      report.findings
        .filter((finding) => finding.code === "formReview")
        .map((finding) => finding.formIntent),
    ).toEqual(["product", "variant", "checkout"]);
    expect(report.findings.every((finding) => finding.snippet === null)).toBe(
      true,
    );
  });

  test("does not contradict unresolved registrations or API evidence with a no-evidence finding", () => {
    const report = buildAudit({
      url: pageUrl,
      tools: [],
      forms: [],
      signals: [{ kind: "context-api", pageUrl, sourceUrl: pageUrl }],
      limitations: ["staticOnly"],
    });
    expect(
      report.findings.some((finding) => finding.code === "noToolEvidence"),
    ).toBe(false);
    const unresolved = audit([
      tool({
        name: null,
        execution: "unresolved",
        issues: ["unresolvedDefinition"],
      }),
    ]);
    expect(
      unresolved.findings.some((finding) => finding.code === "noToolEvidence"),
    ).toBe(false);
  });

  test("groups matching form opportunities while retaining every source location", () => {
    const second = form({
      id: `${pageUrl}shop#form-1`,
      pageUrl: `${pageUrl}shop`,
    });
    const report = audit([], [form(), second]);
    expect(report.summary.opportunities).toBe(1);
    expect(
      report.findings.find((finding) => finding.code === "formOpportunity")
        ?.occurrences,
    ).toEqual([
      { formId: `${pageUrl}#form-1`, pageUrl, selector: form().selector },
      { formId: second.id, pageUrl: second.pageUrl, selector: second.selector },
    ]);
  });

  test("does not infer a read-only action from GET or add automatic newsletter submission", () => {
    const report = audit(
      [],
      [
        form({
          label: "Newsletter",
          selector: 'form[id="newsletter"]',
          action: "https://lists.example/subscriptions/subscribe",
          method: "get",
          fields: [
            { name: "email", type: "email", description: null, required: true },
          ],
        }),
      ],
    );
    const finding = report.findings.find(
      (finding) => finding.code === "formOpportunity",
    );
    expect(finding?.snippet).toContain("consent");
    expect(finding?.snippet).not.toContain("toolautosubmit");
  });

  test("calls out unnamed inputs only after a form opts in to declarative tools", () => {
    const fields = [
      { name: null, type: "select", description: null, required: false },
    ];
    expect(
      audit([], [form({ fields })]).findings.some(
        (finding) => finding.code === "unnamedFields",
      ),
    ).toBe(false);
    expect(
      audit([], [form({ fields, declared: true })]).findings.some(
        (finding) => finding.code === "unnamedFields",
      ),
    ).toBe(true);
  });

  test("avoids generated tool-name collisions and identifies incomplete scan coverage", () => {
    const report = buildAudit({
      url: pageUrl,
      tools: [
        tool({ name: "search_store_1" }),
        tool({ name: "search_store_1_1" }),
      ],
      forms: [form()],
      signals: [],
      limitations: ["staticOnly", "scriptLimit"],
      pages: storePages,
    });
    expect(
      report.findings.find((finding) => finding.code === "formOpportunity")
        ?.snippet,
    ).toContain('toolname="search_store_1_2"');
    expect(report.checks.find((check) => check.id === "coverage")?.status).toBe(
      "unknown",
    );
    expect(
      report.findings.some((finding) => finding.code === "incompleteCoverage"),
    ).toBe(true);
  });

  test("does not turn generic website forms into shopping integration opportunities", () => {
    const report = buildAudit({
      url: pageUrl,
      tools: [],
      forms: [form({ label: "Search articles" })],
      signals: [],
      limitations: ["staticOnly"],
    });
    expect(report.commerce.context).toBe("unconfirmed");
    expect(report.summary.opportunities).toBe(0);
    expect(
      report.findings.find((finding) => finding.code === "formReview")?.snippet,
    ).toBeNull();
  });

  test("keeps checkout, order tracking, returns and unknown forms for manual review", () => {
    const forms = [
      form({
        id: "checkout",
        label: "Checkout",
        selector: "#checkout",
        action: `${pageUrl}checkout`,
        fields: [
          {
            name: "checkout",
            type: "submit",
            description: null,
            required: false,
          },
        ],
      }),
      form({
        id: "tracking",
        label: "Track order",
        selector: "#tracking",
        action: `${pageUrl}orders/track`,
        fields: [
          {
            name: "order_number",
            type: "text",
            description: null,
            required: true,
          },
        ],
      }),
      form({
        id: "returns",
        label: "Request a return",
        selector: "#returns",
        action: `${pageUrl}returns`,
        fields: [
          { name: "order_id", type: "text", description: null, required: true },
        ],
      }),
      form({
        id: "unknown",
        label: "Custom action",
        selector: "#custom",
        action: `${pageUrl}custom`,
        fields: [
          { name: "value", type: "text", description: null, required: false },
        ],
      }),
    ];
    const report = audit([], forms);
    expect(report.summary.opportunities).toBe(0);
    expect(
      report.findings
        .filter((finding) => finding.code === "formReview")
        .map((finding) => finding.formIntent),
    ).toEqual(["checkout", "orderTracking", "returns", "other"]);
    expect(report.findings.every((finding) => finding.snippet === null)).toBe(
      true,
    );
  });

  test("offers task-specific drafts for discount and shipping forms on a storefront", () => {
    const report = audit(
      [],
      [
        form({
          id: "coupon",
          label: "Apply discount code",
          selector: "#discount",
          action: `${pageUrl}discount`,
          fields: [
            {
              name: "coupon_code",
              type: "text",
              description: null,
              required: true,
            },
          ],
        }),
        form({
          id: "shipping",
          label: "Estimate shipping",
          selector: "#shipping",
          action: `${pageUrl}shipping/estimate`,
          fields: [
            {
              name: "postal_code",
              type: "text",
              description: null,
              required: true,
            },
          ],
        }),
      ],
    );
    const opportunities = report.findings.filter(
      (finding) => finding.code === "formOpportunity",
    );
    expect(opportunities.map((finding) => finding.formIntent)).toEqual([
      "coupon",
      "shipping",
    ]);
    expect(opportunities[0]?.snippet).toContain("apply_store_discount");
    expect(opportunities[1]?.snippet).toContain("estimate_store_shipping");
    expect(
      opportunities.every(
        (finding) => !finding.snippet?.includes("toolautosubmit"),
      ),
    ).toBe(true);
  });
});
