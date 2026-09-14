import type {
  Audit,
  AuditCheck,
  AuditCode,
  AuditFinding,
  FormEvidence,
  FormIntent,
  Report,
  Tool,
} from "@/lib/webmcp";
import {
  classifyStoreForm,
  inspectStoreCoverage,
  workflowsForTool,
} from "./webmcp-commerce";

type Evidence = Pick<
  Report,
  "url" | "tools" | "forms" | "signals" | "limitations"
> & { registrations?: Tool[]; pages?: Report["pages"] };

const relatedNames = (intent: FormIntent, tools: Tool[]) => {
  const workflow = {
    search: "catalogSearch",
    product: "productDetails",
    variant: "variants",
  } as const;
  const match = {
    search: /^(?:search(?:_catalog|_products|_store)?|find_products)$/i,
    product: /^(?:get_product|read_product|product_details|lookup_product)$/i,
    variant: /^(?:show_variant|select_variant|get_variant|choose_variant)$/i,
    cart: /^(?:update_cart|add_to_cart|add_to_bag|manage_cart)$/i,
    coupon: /^(?:apply_coupon|apply_discount|add_discount_code)$/i,
    shipping: /^(?:estimate_shipping|calculate_shipping|get_shipping_rates)$/i,
    checkout: /^(?:proceed_to_checkout|begin_checkout|start_checkout)$/i,
    orderTracking:
      /^(?:manage_orders|track_order|get_order_status|order_history)$/i,
    returns: /^(?:request_return|start_return|return_order)$/i,
    newsletter: /^(?:subscribe(?:_newsletter)?|newsletter_signup)$/i,
    contact: /^(?:contact(?:_support)?|send_message|submit_contact)$/i,
    account: /^(?:login|sign_in|manage_account)$/i,
    other: /$^/,
  }[intent];
  return [
    ...new Set(
      tools.flatMap((tool) =>
        tool.name &&
        (match.test(
          tool.name
            .replace(/([a-z\d])([A-Z])/g, "$1_$2")
            .replace(/[-.\s]+/g, "_"),
        ) ||
          ((intent === "search" ||
            intent === "product" ||
            intent === "variant") &&
            workflowsForTool(tool).includes(workflow[intent])))
          ? [tool.name]
          : [],
      ),
    ),
  ];
};

const escapeAttribute = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const requiresFormReview = (form: FormEvidence, intent: FormIntent) =>
  form.sensitive ||
  form.autoSubmit ||
  form.method === "dialog" ||
  // Product identifiers/options alone cannot tell us whether submitting reads,
  // selects, adds to a cart or purchases. Keep guidance without inventing effects.
  [
    "product",
    "variant",
    "account",
    "checkout",
    "orderTracking",
    "returns",
    "other",
  ].includes(intent);

/** Attribute additions only: preserve the merchant's action, fields and consent flow. */
const formSnippet = (
  form: FormEvidence,
  intent: FormIntent,
  index: number,
  names: Set<string>,
) => {
  if (requiresFormReview(form, intent)) return null;
  const suggestions: Partial<Record<FormIntent, readonly [string, string]>> = {
    search: [
      "search_store",
      "Search the store using the supplied search fields.",
    ],
    cart: [
      "update_store_cart",
      "Update the shopping cart using the selected items and quantities.",
    ],
    coupon: [
      "apply_store_discount",
      "Apply the supplied discount code and review its effect on the cart total.",
    ],
    shipping: [
      "estimate_store_shipping",
      "Estimate shipping for the supplied destination without placing an order.",
    ],
    newsletter: [
      "subscribe_newsletter",
      "Subscribe to store updates after the visitor gives consent.",
    ],
    contact: [
      "contact_store",
      "Send the visitor's message to the store after they confirm submission.",
    ],
  };
  const suggestion = suggestions[intent];
  if (!suggestion) return null;
  const [base, description] = suggestion;
  const candidate = `${base}_${index + 1}`;
  const name =
    Array.from({ length: names.size + 1 }, (_, offset) =>
      offset ? `${candidate}_${offset}` : candidate,
    ).find((name) => !names.has(name)) ?? `${candidate}_${names.size + 1}`;
  names.add(name);
  return `toolname="${escapeAttribute(name)}"\ntooldescription="${escapeAttribute(description)}"`;
};

const priorityOrder: Record<AuditFinding["priority"], number> = {
  high: 0,
  medium: 1,
  low: 2,
  opportunity: 3,
  info: 4,
};

/** Deterministic source checks, not a browser conformance or agent-visibility score. */
export const buildAudit = (report: Evidence): Audit => {
  const commerce = inspectStoreCoverage(report);
  const findings: AuditFinding[] = [];
  const add = (
    code: AuditCode,
    priority: AuditFinding["priority"],
    target: Partial<Omit<AuditFinding, "id" | "code" | "priority">> = {},
  ) => {
    const finding: Omit<AuditFinding, "id"> = {
      pageUrl: report.url,
      sourceUrl: report.url,
      subject: null,
      evidence: [],
      relatedTools: [],
      formId: null,
      formIntent: null,
      occurrences: [],
      snippet: null,
      ...target,
      code,
      priority,
    };
    const entry = {
      ...finding,
      id: JSON.stringify([
        code,
        finding.pageUrl,
        finding.sourceUrl,
        finding.formId ?? finding.subject,
        findings.length,
      ]),
    };
    findings.push(entry);
    return entry;
  };
  const named = report.tools.filter((tool) => tool.name);
  const names = new Set(
    named.flatMap((tool) => (tool.name ? [tool.name] : [])),
  );
  for (const tool of report.tools) {
    const target = {
      pageUrl: tool.pageUrl,
      sourceUrl: tool.sourceUrl,
      subject: tool.name,
    };
    if (tool.issues.includes("missingName"))
      add("missingToolName", "high", target);
    if (tool.issues.includes("missingDescription"))
      add("missingToolDescription", "high", target);
    if (tool.execution === "missing") add("missingHandler", "high", target);
    if (
      tool.issues.includes("unresolvedDefinition") ||
      tool.execution === "unresolved"
    )
      add("unresolvedDefinition", "info", target);
    // A quality suggestion with a visible threshold, never a spec violation.
    if (tool.description && tool.description.length < 40)
      add("briefDescription", "low", {
        ...target,
        evidence: [tool.description],
      });
    if (tool.schemaState === "resolved" || tool.kind === "declarative") {
      const undescribed = tool.parameters
        .filter((parameter) => !parameter.description)
        .map((parameter) => parameter.name);
      if (undescribed.length)
        add("missingParameterDescriptions", "low", {
          ...target,
          evidence: undescribed,
        });
    }
    if (tool.issues.includes("autoSubmit"))
      add("automaticSubmission", "medium", target);
  }
  // Separate pages can legitimately expose the same name. Only flag definitions
  // that could compete within one document; execution order still needs review.
  const duplicates = new Map<string, Tool[]>();
  for (const tool of report.registrations ?? named) {
    if (!tool.name) continue;
    const key = JSON.stringify([tool.pageUrl, tool.name]);
    duplicates.set(key, [...(duplicates.get(key) ?? []), tool]);
  }
  for (const tools of duplicates.values()) {
    const first = tools[0];
    if (tools.length < 2 || !first) continue;
    add("duplicateToolName", "medium", {
      pageUrl: first.pageUrl,
      sourceUrl: first.sourceUrl,
      subject: first.name,
      evidence: [...new Set(tools.map((tool) => tool.sourceUrl))],
    });
  }

  const formPatterns = new Map<string, AuditFinding>();
  report.forms.forEach((form, index) => {
    if (!form.fields.length) return;
    const intent = classifyStoreForm(form);
    const occurrence = {
      formId: form.id,
      pageUrl: form.pageUrl,
      selector: form.selector,
    };
    const target = {
      pageUrl: form.pageUrl,
      sourceUrl: form.pageUrl,
      subject: form.label ?? form.selector,
      formId: form.id,
      formIntent: intent,
      occurrences: [occurrence],
      evidence: [
        form.selector,
        `${form.method.toUpperCase()} ${form.action ?? form.pageUrl}`,
      ],
    };
    const unnamed = form.fields.filter((field) => !field.name);
    if (unnamed.length && form.declared)
      add("unnamedFields", "medium", {
        ...target,
        evidence: [form.selector, ...unnamed.map((field) => field.type)],
      });
    if (form.declared) return;
    const relatedTools = relatedNames(intent, report.tools);
    if (
      relatedTools.length ||
      commerce.context !== "storefront" ||
      requiresFormReview(form, intent)
    ) {
      add("formReview", "info", { ...target, relatedTools });
      return;
    }
    const pattern = JSON.stringify([
      intent,
      form.action,
      form.method,
      form.fields.map((field) => [field.name, field.type, field.required]),
    ]);
    const existing = formPatterns.get(pattern);
    if (existing) {
      existing.occurrences.push(occurrence);
      return;
    }
    const finding = add("formOpportunity", "opportunity", {
      ...target,
      evidence: [
        ...target.evidence,
        ...form.fields.flatMap((field) => (field.name ? [field.name] : [])),
      ],
      snippet: formSnippet(form, intent, index, names),
    });
    formPatterns.set(pattern, finding);
  });

  const partial = report.limitations.some(
    (limitation) => limitation !== "staticOnly",
  );
  if (partial) add("incompleteCoverage", "info");
  if (!report.tools.length && !report.signals.length)
    add("noToolEvidence", "info");
  add("runtimeUnverified", "info");

  const count = (...codes: AuditCode[]) =>
    findings.filter((finding) => codes.includes(finding.code)).length;
  const check = (
    id: AuditCheck["id"],
    status: AuditCheck["status"],
    total = 0,
  ): AuditCheck => ({ id, status, findings: total });
  const metadata = count(
    "missingToolName",
    "missingToolDescription",
    "briefDescription",
    "duplicateToolName",
  );
  const unknownMetadata = report.tools.filter(
    (tool) =>
      (!tool.name && !tool.issues.includes("missingName")) ||
      (!tool.description && !tool.issues.includes("missingDescription")),
  ).length;
  const unknownHandlers = report.tools.filter(
    (tool) => tool.execution === "unresolved",
  ).length;
  const parameters = count("missingParameterDescriptions", "unnamedFields");
  const implementation = count("missingHandler", "automaticSubmission");
  const opportunities = count("formOpportunity");
  const checks: AuditCheck[] = [
    check(
      "discovery",
      named.length ? "pass" : "unknown",
      count("noToolEvidence"),
    ),
    check(
      "metadata",
      metadata
        ? "attention"
        : unknownMetadata || !named.length
          ? "unknown"
          : "pass",
      metadata + unknownMetadata,
    ),
    check(
      "parameters",
      parameters
        ? "attention"
        : report.tools.length &&
            report.tools.every((tool) => tool.schemaState !== "unresolved")
          ? "pass"
          : "unknown",
      parameters,
    ),
    check(
      "implementation",
      implementation
        ? "attention"
        : unknownHandlers || !named.length
          ? "unknown"
          : "pass",
      implementation + unknownHandlers,
    ),
    check(
      "forms",
      opportunities || count("unnamedFields")
        ? "attention"
        : count("formReview")
          ? "unknown"
          : report.forms.length
            ? "pass"
            : "unknown",
      opportunities + count("unnamedFields", "formReview"),
    ),
    check(
      "coverage",
      partial ? "unknown" : "pass",
      count("incompleteCoverage"),
    ),
    check("runtime", "unknown", 1),
  ];
  return {
    commerce,
    checks,
    findings: findings.sort(
      (first, second) =>
        priorityOrder[first.priority] - priorityOrder[second.priority],
    ),
    summary: {
      high: findings.filter((finding) => finding.priority === "high").length,
      improvements: findings.filter(
        (finding) =>
          finding.priority === "medium" || finding.priority === "low",
      ).length,
      opportunities,
      passed: checks.filter((check) => check.status === "pass").length,
      unknown: checks.filter((check) => check.status === "unknown").length,
    },
  };
};
