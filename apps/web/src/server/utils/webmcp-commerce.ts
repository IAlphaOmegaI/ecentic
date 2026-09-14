import { resultify } from "@zenncore/utils";
import type {
  FormEvidence,
  FormIntent,
  Report,
  StoreCoverage,
  StoreWorkflow,
  Tool,
} from "@/lib/webmcp";

type Evidence = Pick<Report, "url" | "tools" | "forms"> & {
  pages?: Report["pages"];
};

const workflows: StoreWorkflow[] = [
  "catalogSearch",
  "productDetails",
  "variants",
  "cartRead",
  "cartUpdate",
  "checkout",
  "policies",
  "orders",
];
const normalized = (value: string) =>
  value
    .replace(/([A-Z])([A-Z][a-z])/g, "$1_$2")
    .replace(/([a-z\d])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z\d]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
const words = (value: string) => normalized(value).replaceAll("_", " ");
const pathname = (value: string | null) => {
  if (!value) return "";
  const url = resultify(() => new URL(value));
  return url.success && ["https:", "http:"].includes(url.data.protocol)
    ? url.data.pathname.toLowerCase()
    : "";
};

const cartAction = (action: string | null) =>
  /(?:^|\/)(?:cart|basket|bag)(?:[/.]|$)/.test(pathname(action));
const contextOf = (form: FormEvidence) =>
  words(
    [
      form.label,
      form.selector,
      pathname(form.action),
      ...form.fields.map((field) => field.name),
    ]
      .filter(Boolean)
      .join(" "),
  );

/** Classify the visible operation; sensitivity and consent remain separate audit checks. */
export const classifyStoreForm = (form: FormEvidence): FormIntent => {
  const action = pathname(form.action);
  const context = contextOf(form);
  const fields = form.fields.flatMap((field) =>
    field.name ? [normalized(field.name)] : [],
  );
  const postal = fields.some((name) =>
    /(?:^|_)(?:zip|zipcode|postcode|postal)(?:_|$)/.test(name),
  );
  const productContext =
    /\b(?:product|variant|sku)\b/.test(context) ||
    /(?:^|\/)products?\//.test(pathname(form.pageUrl));
  switch (true) {
    case /(?:^|\/)(?:returns?|refunds?|exchanges?)(?:[/.]|$)/.test(action) ||
      /\b(?:request|start|create|submit|initiate) (?:an? |your |product |order )?(?:return|refund|exchange)\b/.test(
        context,
      ) ||
      fields.some((name) =>
        /^(?:return_reason|return_order|refund_reason|exchange_order)(?:_|$)/.test(
          name,
        ),
      ):
      return "returns";
    case /(?:^|\/)(?:checkouts?|payments?)(?:[/.]|$)/.test(action) ||
      /\b(?:checkout|check out|buy now|place (?:an? |your )?order|(?:complete|finish) (?:your |the |a )?purchase)\b/.test(
        context,
      ):
      return "checkout";
    case /(?:^|\/)(?:orders?|order-tracking|tracking)(?:[/.]|$)/.test(action) ||
      /\b(?:track|find|lookup|view|manage|check) (?:your |my |an? )?orders?\b/.test(
        context,
      ) ||
      fields.some((name) =>
        /^(?:order_(?:id|number|reference)|tracking_(?:id|number|code))$/.test(
          name,
        ),
      ):
      return "orderTracking";
    // A product's add-to-cart form remains a cart operation even with variant selectors.
    case /(?:^|\/)(?:cart|basket|bag)\/(?:add|change|update|remove|clear)(?:[/.]|$)/.test(
      action,
    ) ||
      /\badd (?:items? |products? )?to (?:the )?(?:cart|bag|basket)\b/.test(
        context,
      ) ||
      fields.includes("add_to_cart") ||
      (cartAction(form.action) &&
        fields.some((name) =>
          /^(?:updates?(?:_|$)|quantity(?:_|$)|cart_.+_(?:qty|quantity)$)/.test(
            name,
          ),
        )):
      return "cart";
    case postal && /\b(?:shipping|delivery)\b/.test(context):
      return "shipping";
    case fields.some((name) =>
      /(?:^|_)(?:coupon|discount|promo|promotion)(?:_code)?(?:_|$)/.test(name),
    ) ||
      /\b(?:apply|remove) (?:a |the )?(?:coupon|discount|promo code)\b/.test(
        context,
      ):
      return "coupon";
    case cartAction(form.action) ||
      /\b(?:shopping cart|update cart|update basket|update bag)\b/.test(
        context,
      ):
      return "cart";
    case /\b(?:select|choose|show|change) (?:a |the |product )?variant\b/.test(
      context,
    ) ||
      (productContext &&
        fields.some((name) =>
          /^(?:variant(?:_id)?|selected_options?|options?(?:_|$)|color|colour|size)/.test(
            name,
          ),
        )):
      return "variant";
    case form.fields.some((field) => field.type === "password") ||
      /(?:^|\/)(?:accounts?|login|signin|sign-in|register|auth)(?:[/.]|$)/.test(
        action,
      ) ||
      /\b(?:password|sign in|log in|login|create account|customer account)\b/.test(
        context,
      ):
      return "account";
    case /\b(?:newsletter|subscribe|mailing list|email signup)\b/.test(context):
      return "newsletter";
    case /\b(?:contact|message|enquiry|inquiry)\b/.test(context):
      return "contact";
    case /\b(?:lookup|view|show|get|find) (?:a |the |your )?product\b/.test(
      context,
    ) ||
      (productContext &&
        fields.some((name) =>
          /^(?:product_id|product_handle|sku|handle)$/.test(name),
        )):
      return "product";
    case /\b(?:search|query)\b/.test(context) || fields.includes("q"):
      return "search";
    default:
      return "other";
  }
};

const namePatterns: Record<StoreWorkflow, RegExp[]> = {
  catalogSearch: [
    /^(?:search|find|browse|list|query|filter)_(?:store_)?(?:product_catalog|catalog|catalogue|products?|collections?|store|shop|inventory)(?:_(?:products|items|catalog))?$/,
    /^(?:get|read)_(?:products|collections|catalog|catalogue|inventory)$/,
    /^(?:product_)?(?:catalog|catalogue|products?|collections?|store|shop)_(?:search|find|browse|list|query|filter)$/,
  ],
  productDetails: [
    /^(?:get|read|fetch|view|show|inspect|describe|lookup|retrieve)_(?:store_)?product(?:_(?:details?|information|info|by_id))?$/,
    /^product_(?:details?|info|get|read|lookup)$/,
  ],
  variants: [
    /^(?:show|select|choose|set|find|get|list|resolve|read|update|change)_(?:product_)?variants?(?:_options?)?$/,
    /^(?:select|choose|set|change|update)_product_options$/,
    /^(?:product_)?variants?_(?:select|show|get|list|options|update)$/,
  ],
  cartRead: [
    /^(?:get|read|view|show|inspect|fetch|retrieve|list)_(?:shopping_)?(?:cart|basket|bag)(?:_(?:contents|items|summary|state|snapshot))?$/,
    /^(?:shopping_)?(?:cart|basket|bag)_(?:get|read|view|show|contents|summary|snapshot)$/,
  ],
  cartUpdate: [
    /^(?:add|remove|update|modify|change|set|manage|clear|empty|cancel|delete|adjust)_(?:(?:items?|products?|line_items?)_)?(?:(?:to|from|in)_)?(?:shopping_)?(?:cart|basket|bag)(?:_(?:items?|lines?|quantities))?$/,
    /^(?:cart|basket|bag)_(?:add|remove|update|modify|change|clear|empty|cancel)(?:_items)?$/,
    /^(?:apply|remove|set)_(?:coupon|discount|promo)(?:_code)?$/,
  ],
  checkout: [
    /^(?:proceed|go|navigate|continue|start|begin|open|create|launch|initiate|view|show)_(?:to_)?checkout$/,
    /^checkout(?:_(?:start|open|begin|navigate))?$/,
  ],
  policies: [
    /^(?:search|find|get|read|view|show|list|lookup|fetch)_(?:store|shop|shipping|returns?|refund)_(?:polic(?:y|ies)|faqs?)(?:_and_faqs)?$/,
    /^(?:store|shop|shipping|returns?|refund)_(?:polic(?:y|ies)|faqs?)_(?:get|read|search|find|lookup)$/,
  ],
  orders: [
    /^(?:manage|get|read|view|show|list|track|find|lookup|cancel|return|refund|exchange)_(?:customer_)?orders?(?:_(?:status|tracking|history|returns?))?$/,
    /^(?:request|start|create|initiate)_(?:order|product)_(?:return|refund|exchange)$/,
    /^(?:track|get|read|view)_shipment(?:_status)?$/,
    /^order_(?:tracking|status|history|lookup)$/,
  ],
};

const workflowsNamed = (name: string | null) => {
  if (!name) return [];
  const original = normalized(name);
  const names = [
    original,
    original.replace(
      /^(?:shopify|woocommerce|webmcp|commerce|store|shop|api)_/,
      "",
    ),
  ];
  return workflows.filter((workflow) =>
    namePatterns[workflow].some((pattern) =>
      names.some((name) => pattern.test(name)),
    ),
  );
};

const purposePatterns: Record<StoreWorkflow, RegExp> = {
  catalogSearch:
    /^(?:search|find|browse|list|filter|query) (?:the |this |our |a |an |current |store |shop |store s |shop s |online )*(?:products?|catalog(?:ue)?|collections?|store catalog|shop catalog)\b/,
  productDetails:
    /^(?:get|read|fetch|view|show|inspect|describe|lookup|retrieve) (?:the |this |a |an |current |selected )*product(?: details?| information| info)?\b/,
  variants:
    /^(?:show|select|choose|set|find|get|list|resolve|change|update) (?:the |this |a |an |available |selected |product )*variants?\b/,
  cartRead:
    /^(?:get|read|view|show|inspect|fetch|retrieve|list) (?:the |this |a |current |shopping )*(?:cart|basket|bag)(?: contents?| items?| summary| state)?\b/,
  cartUpdate:
    /^(?:add|remove|update|modify|change|set|manage|clear|empty|cancel|delete|adjust) (?:the |this |a |all |shopping |products? |items? |line items? |to |from |in )*(?:cart|basket|bag)\b/,
  checkout:
    /^(?:proceed|go|navigate|continue|start|begin|open|create|launch|initiate|view|show) (?:to |the |a |store )*checkout\b/,
  policies:
    /^(?:search|find|get|read|view|show|list|lookup|fetch) (?:the |this |our |a )*(?:store|shop|shipping|return|refund) (?:polic(?:y|ies)|faqs?)\b/,
  orders:
    /^(?:manage|get|read|view|show|list|track|find|lookup|cancel|return|refund|exchange) (?:the |this |a |an |your |my |customer |existing )*orders?(?: status| tracking| history)?\b/,
};
export const workflowsForTool = (tool: Tool): StoreWorkflow[] => {
  const named = workflowsNamed(tool.name);
  if (named.length) return named;
  // Only the opening purpose can classify an unfamiliar name. Cross-references,
  // prohibitions and examples elsewhere in a description are not capabilities.
  const purpose = words((tool.description ?? "").split(/[.!?;\n]/, 1)[0] ?? "");
  return workflows.filter((workflow) =>
    purposePatterns[workflow].test(purpose),
  );
};
const usable = (tool: Tool) =>
  Boolean(tool.name?.trim() && tool.description?.trim()) &&
  ["declared", "form"].includes(tool.execution) &&
  tool.schemaState !== "unresolved" &&
  !tool.issues.some((issue) =>
    ["missingName", "missingDescription", "unresolvedDefinition"].includes(
      issue,
    ),
  );

const workflowsForForm = (form: FormEvidence): StoreWorkflow[] => {
  const intent = classifyStoreForm(form);
  if (
    intent === "search" &&
    /\b(?:policies|policy|faq|faqs)\b/.test(contextOf(form))
  )
    return ["policies"];
  switch (intent) {
    case "search":
      return ["catalogSearch"];
    case "product":
      return ["productDetails"];
    case "variant":
      return ["variants"];
    case "cart":
      return ["cartUpdate"];
    case "coupon":
      return ["cartUpdate"];
    case "checkout":
      return ["checkout"];
    case "orderTracking":
    case "returns":
      return ["orders"];
    default:
      return [];
  }
};

/** Source workflow evidence only: no response quality, payment execution or business verification. */
export const inspectStoreCoverage = ({
  url,
  tools,
  forms,
  pages,
}: Evidence): StoreCoverage => {
  const observed = [
    ...new Set([
      ...(pages
        ? pages
            .filter((page) => page.status === "scanned")
            .map((page) => page.url)
        : [url]),
      ...forms.map((form) => form.pageUrl),
      ...tools.map((tool) => tool.pageUrl),
    ]),
  ];
  const signals: StoreCoverage["signals"] = [];
  const signal = (
    kind: StoreCoverage["signals"][number]["kind"],
    url: string,
  ) => {
    if (!signals.some((signal) => signal.kind === kind && signal.url === url))
      signals.push({ kind, url });
  };
  for (const page of observed) {
    const path = pathname(page);
    if (
      /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(?:products?\/[^/]+|collections?\/[^/]+\/products?\/[^/]+)(?:\/|$)/.test(
        path,
      )
    )
      signal("productPage", page);
    else if (
      /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(?:collections?|catalog|shop|product-category)(?:\/|$)/.test(
        path,
      ) ||
      /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?products?\/?$/.test(path)
    )
      signal("catalogPage", page);
  }
  for (const form of forms)
    if (cartAction(form.action)) signal("cartForm", form.pageUrl);
  for (const tool of tools)
    if (workflowsNamed(tool.name).length)
      signal("commerceTool", tool.sourceUrl);
  const matchedTools = tools.map((tool) => ({
    tool,
    workflows: workflowsForTool(tool),
  }));
  const matchedForms = forms.map((form) => ({
    form,
    workflows: workflowsForForm(form),
  }));
  return {
    context: signals.length ? "storefront" : "unconfirmed",
    signals,
    workflows: workflows.map((id) => {
      const matching = matchedTools
        .filter((entry) => entry.workflows.includes(id))
        .map(({ tool }) => tool);
      const formIds = [
        ...new Set(
          matchedForms
            .filter((entry) => entry.workflows.includes(id))
            .map(({ form }) => form.id),
        ),
      ];
      const references = new Map<
        string,
        { name: string; sourceUrl: string; pageUrl: string }
      >();
      for (const tool of matching)
        if (tool.name) {
          const reference = {
            name: tool.name,
            sourceUrl: tool.sourceUrl,
            pageUrl: tool.pageUrl,
          };
          references.set(JSON.stringify(reference), reference);
        }
      return {
        id,
        status: matching.some(usable)
          ? "toolFound"
          : matching.length
            ? "review"
            : formIds.length
              ? "formOnly"
              : "notObserved",
        tools: [...references.values()],
        formIds,
      };
    }),
  };
};
