import { createHash } from "node:crypto";
import { resultify } from "@zenncore/utils";
import { type DefaultTreeAdapterTypes, parse } from "parse5";
import * as HTTP from "@/server/utils/http";
import { classifyPageAccess } from "./evidence/bot-challenge";
import { extractProducts, jsonLdBlocks } from "./evidence/product-schema";
import { parseRobots } from "./evidence/robots";

type Node = DefaultTreeAdapterTypes.Node;
type Element = DefaultTreeAdapterTypes.Element;
type Json = Record<string, unknown>;

export type ProductCheck = {
  url: string;
  product: string;
  gap:
    | "barcode-missing-from-page-data"
    | "barcode-not-observed"
    | "rating-missing-from-page-data"
    | "product-data-not-observed"
    | "";
  finding: string;
  evidence: string;
  checkedAt: string;
  status: "verified" | "hold";
  reason: string | null;
  sha256: string;
  reviewCount: string;
  productCategory: string;
  findingReviewed: false;
};

export const PRODUCT_CHECKER_VERSION = "outbound-product-check-v2";

const hold = (
  url: string,
  reason: string,
  checkedAt: string,
  product = "",
): ProductCheck => ({
  url,
  product,
  gap: "",
  finding: "",
  evidence: "",
  checkedAt,
  status: "hold",
  reason,
  sha256: "",
  reviewCount: "",
  productCategory: "",
  findingReviewed: false,
});

const elements = (node: Node): Element[] => [
  ...("tagName" in node ? [node] : []),
  ...("childNodes" in node ? node.childNodes.flatMap(elements) : []),
];

const content = (node: Node): string =>
  "value" in node
    ? node.value
    : "childNodes" in node
      ? node.childNodes.map(content).join("")
      : "";
const attribute = (node: Element, name: string) =>
  node.attrs.find((entry) => entry.name === name)?.value ?? "";
const normalized = (value: string) =>
  value.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
const objects = (value: unknown, depth = 0): Json[] => {
  if (depth > 12 || typeof value !== "object" || value === null) return [];
  if (Array.isArray(value))
    return value.flatMap((entry) => objects(entry, depth + 1));
  const record = value as Json;
  return [
    record,
    ...Object.values(record).flatMap((entry) => objects(entry, depth + 1)),
  ];
};
const valueAt = (value: Json, key: string) => value[key];
const stringAt = (value: Json, key: string) =>
  typeof valueAt(value, key) === "string" ? String(valueAt(value, key)) : "";

/** Accept the GTIN lengths and check digit, not any eight-to-fourteen digits. */
export const isValidBarcode = (value: string) =>
  /^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(value) &&
  !/^0+$/.test(value) &&
  [...value].reduce(
    (sum, digit, index) =>
      sum + Number(digit) * ((value.length - index) % 2 === 0 ? 3 : 1),
    0,
  ) %
    10 ===
    0;

const productRecords = (body: string) =>
  jsonLdBlocks(body).flatMap((block) => {
    const parsed = resultify(() => JSON.parse(block) as unknown);
    return parsed.success
      ? objects(parsed.data).filter((record) => {
          const types = valueAt(record, "@type");
          return (Array.isArray(types) ? types : [types]).some(
            (type) =>
              typeof type === "string" &&
              /^(?:https?:\/\/schema\.org\/)?Product(?:Group)?\/?$/i.test(type),
          );
        })
      : [];
  });

const excludedBarcodeProduct = (name: string, category: string) =>
  /\b(gift\s*(card|voucher)|hand\s*made|custom(?:[-\s]made)?|bespoke|jewell?ery|personali[sz]ed|bundles?|digital|made[-\s]to[-\s]order|samples?)\b/i.test(
    `${name} ${category}`,
  );

/** Raw HTML can propose a gap. Only a separate rendered capture can establish page-data absence. */
export const inspectProductPage = ({
  url,
  body,
  status,
  headers = new Headers(),
  checkedAt = new Date().toISOString(),
  renderedBody,
  renderedReviewText,
}: {
  url: string;
  body: string;
  status: number;
  headers?: Headers;
  checkedAt?: string;
  /** A separately captured rendered document; never substitute the raw response. */
  renderedBody?: string;
  /** Visible text captured from this product's linked review widget, not the whole page. */
  renderedReviewText?: string;
}): ProductCheck => {
  if (classifyPageAccess({ status, body, headers }).kind !== "ok")
    return hold(url, "The product page was blocked or unavailable.", checkedAt);
  if (status !== 200 || !body.trim())
    return hold(
      url,
      "The product page did not return a complete usable document.",
      checkedAt,
    );
  if (
    /template-password|<form[^>]+(?:action=["'][^"']*\/login|id=["']login)/i.test(
      body,
    )
  )
    return hold(url, "The store requires a password or login.", checkedAt);

  if (
    renderedBody !== undefined &&
    (!renderedBody.trim() ||
      classifyPageAccess({ status, body: renderedBody, headers }).kind !== "ok")
  )
    return hold(
      url,
      "The rendered product page was blocked or unavailable.",
      checkedAt,
    );
  const rendered =
    renderedBody === undefined ? [] : elements(parse(renderedBody));
  const document = elements(parse(body));
  const heading = document.find((node) => node.tagName === "h1");
  const name = heading ? content(heading).trim().replace(/\s+/g, " ") : "";
  const blocks = [body, renderedBody ?? ""].flatMap(jsonLdBlocks);
  if (
    blocks.some(
      (block) => !resultify(() => JSON.parse(block) as unknown).success,
    )
  )
    return hold(
      url,
      "Some page data could not be parsed. A missing-field claim would be unreliable.",
      checkedAt,
      name,
    );

  const products = extractProducts(body, url);
  const renderedProducts =
    renderedBody === undefined ? [] : extractProducts(renderedBody, url);
  const records = [
    ...productRecords(body),
    ...productRecords(renderedBody ?? ""),
  ];
  const allProductData = records.flatMap((record) => objects(record));
  const barcodePublished =
    [...products, ...renderedProducts].some((entry) => entry.gtin) ||
    allProductData.some((record) =>
      Object.keys(record).some((key) => /^gtin(?:8|12|13|14)?$/i.test(key)),
    );
  const ratingPublished = allProductData.some(
    (record) =>
      valueAt(record, "aggregateRating") !== undefined ||
      valueAt(record, "review") !== undefined,
  );
  const matching = products.filter(
    (product) =>
      name && product.name && normalized(product.name) === normalized(name),
  );
  const main =
    matching.length === 1
      ? matching[0]
      : products.length === 1 && !name
        ? products[0]
        : null;
  const product = main?.name ?? name;
  if (!product)
    return hold(url, "A named product could not be established.", checkedAt);
  const renderedHeading = rendered.find((node) => node.tagName === "h1");
  if (
    renderedHeading &&
    normalized(content(renderedHeading)) !== normalized(product)
  )
    return hold(
      url,
      "The rendered page names a different product.",
      checkedAt,
      product,
    );
  const categories = [
    ...new Set(
      records
        .filter(
          (record) =>
            normalized(stringAt(record, "name")) === normalized(product),
        )
        .map((record) => stringAt(record, "category"))
        .filter(Boolean),
    ),
  ];
  const productCategory = categories.length === 1 ? (categories[0] ?? "") : "";
  const barcodeExcluded = excludedBarcodeProduct(product, productCategory);
  if (products.length && !main)
    return hold(
      url,
      "The page's product data could not be tied unambiguously to its main product.",
      checkedAt,
      product,
    );
  // The shared JSON-LD parser does not fully model microdata. Hold rather than
  // claim its fields are missing; a future parser can add coverage explicitly.
  const microdata = [...document, ...rendered].some((node) =>
    attribute(node, "itemtype")
      .split(/\s+/)
      .some((type) => /schema\.org\/Product(?:Group)?\/?$/i.test(type)),
  );
  if (microdata)
    return hold(
      url,
      "Product microdata is present and needs a manual field check.",
      checkedAt,
      product,
    );

  const embeddedBlocks = [...document, ...rendered]
    .filter(
      (node) =>
        node.tagName === "script" &&
        attribute(node, "type") === "application/json",
    )
    .map((node) => resultify(() => JSON.parse(content(node)) as unknown));
  if (embeddedBlocks.some((block) => !block.success))
    return hold(
      url,
      "Some embedded page data could not be parsed reliably.",
      checkedAt,
      product,
    );
  const embedded = embeddedBlocks
    .flatMap((block) => (block.success ? objects(block.data) : []))
    .filter((record) =>
      [stringAt(record, "title"), stringAt(record, "name")].some(
        (title) => title && normalized(title) === normalized(product),
      ),
    );
  const barcodeValues = embedded
    .flatMap((record) => {
      const variants = valueAt(record, "variants");
      return [
        record,
        ...(Array.isArray(variants)
          ? variants.filter(
              (variant): variant is Json =>
                typeof variant === "object" &&
                variant !== null &&
                !Array.isArray(variant),
            )
          : []),
      ].map((entry) => String(valueAt(entry, "barcode") ?? ""));
    })
    .filter(Boolean);
  const barcodes = barcodeValues.filter(isValidBarcode);
  const ids = embedded
    .map((record) => String(valueAt(record, "id") ?? ""))
    .filter(Boolean);
  const reviewElements = (renderedBody === undefined ? document : rendered)
    .filter(
      (node) =>
        ids.includes(attribute(node, "data-product-id")) ||
        ids.includes(attribute(node, "data-productid")),
    )
    .flatMap(elements);
  const reviews = reviewElements
    .flatMap((node) =>
      ["data-number-of-reviews", "data-raters", "data-oke-reviews-count"].map(
        (key) => Number(attribute(node, key)),
      ),
    )
    .filter((value) => Number.isInteger(value) && value > 0 && value < 200000);
  const reviewCount =
    [...new Set(reviews)].length === 1 ? String(reviews[0]) : "";
  const visibleReviewCount = Boolean(
    reviewCount &&
      renderedReviewText &&
      new RegExp(`\\b${reviewCount}\\s+(?:reviews?|ratings?)\\b`, "i").test(
        renderedReviewText.replace(/(?<=\d),(?=\d)/g, ""),
      ),
  );
  const productMeta = document.some(
    (node) =>
      node.tagName === "meta" &&
      attribute(node, "property") === "og:type" &&
      /product/i.test(attribute(node, "content")),
  );

  const finding = (() => {
    switch (true) {
      case main !== null &&
        main !== undefined &&
        !barcodePublished &&
        !barcodeExcluded &&
        barcodes.length > 0:
        return {
          gap: "barcode-missing-from-page-data" as const,
          finding:
            "your store has a barcode for it, but the barcode isn't in the data on the product page",
          evidence: `Product-specific embedded barcode: ${barcodes[0]}. Parsed product markup: ${main.snippet}`,
          manualReason:
            "Confirm the same product is sold by another retailer before using the cross-store consequence.",
        };
      case main !== null &&
        main !== undefined &&
        !ratingPublished &&
        reviews.length > 0:
        return {
          gap: "rating-missing-from-page-data" as const,
          finding: reviewCount
            ? `it shows ${reviewCount} reviews on the page, but the rating isn't in the data AI shopping tools read`
            : "the product review widgets disagree about the number of reviews",
          evidence: `Product-linked widget reports ${reviews.join(", ")} reviews. Visible rendered review count: ${visibleReviewCount ? "confirmed" : "unconfirmed"}. Parsed product markup: ${main.snippet}`,
          manualReason: visibleReviewCount
            ? null
            : "The visible review count must be confirmed on the rendered page for this same product.",
        };
      case main !== null &&
        main !== undefined &&
        !barcodePublished &&
        !barcodeExcluded &&
        barcodeValues.length === 0:
        return {
          gap: "barcode-not-observed" as const,
          finding:
            "no barcode was found in the product page or the matching embedded product data checked",
          evidence: `No recognized barcode in the scoped product markup or matching embedded product object. Parsed product markup: ${main.snippet}`,
          manualReason:
            "Confirm this is a packaged good expected to carry a barcode and check the store's complete product data. This finding needs review.",
        };
      case products.length === 0 &&
        renderedProducts.length === 0 &&
        records.length === 0 &&
        productMeta:
        return {
          gap: "product-data-not-observed" as const,
          finding: "No product markup was found in the raw product page.",
          evidence: `The main heading names ${product}; og:type identifies a product. No JSON-LD Product or ProductGroup and no Product microdata were found.`,
          manualReason: null,
        };
      default:
        return null;
    }
  })();
  if (!finding)
    return hold(
      url,
      barcodeValues.some((value) => !isValidBarcode(value))
        ? "An embedded barcode has an invalid length or check digit. Review it; do not claim there is no barcode."
        : "No checkable product-page gap was found.",
      checkedAt,
      product,
    );
  return {
    url,
    product,
    gap: finding.gap,
    finding: finding.finding,
    evidence: `${finding.evidence}\nChecker: ${PRODUCT_CHECKER_VERSION}; raw observed at ${checkedAt}; rendered verification: ${renderedBody === undefined ? "missing" : "complete"}.`,
    checkedAt,
    status:
      renderedBody === undefined || finding.manualReason ? "hold" : "verified",
    reason:
      renderedBody === undefined
        ? "A candidate gap was found in raw HTML. Check the rendered product page before approving a missing-field claim."
        : finding.manualReason,
    sha256: createHash("sha256").update(body).digest("hex"),
    reviewCount,
    productCategory,
    findingReviewed: false,
  };
};

export const blockedByRobots = (body: string, path: string) => {
  const groups = parseRobots(body);
  const specific = groups.filter((group) =>
    group.agents.some(
      (agent) => agent !== "*" && "ecenticstorecheck".includes(agent),
    ),
  );
  const applicable = specific.length
    ? specific
    : groups.filter((group) => group.agents.includes("*"));
  const rules = applicable
    .flatMap((group) => [
      ...group.disallow.filter(Boolean).map((rule) => ({ rule, allow: false })),
      ...group.allow.filter(Boolean).map((rule) => ({ rule, allow: true })),
    ])
    .filter(({ rule }) =>
      new RegExp(
        `^${rule
          .split("*")
          .map((part) => part.replace(/[.+?^{}()|[\]\\]/g, "\\$&"))
          .join(".*")}`,
      ).test(path),
    )
    .sort(
      (first, second) =>
        second.rule.length - first.rule.length ||
        Number(second.allow) - Number(first.allow),
    );
  return rules[0]?.allow === false;
};

const pause = () => new Promise<void>((resolve) => setTimeout(resolve, 2000));

export const checkProduct = async ({ url }: { url: string }) => {
  const parsed = resultify(() => new URL(url));
  const now = new Date().toISOString();
  if (
    !parsed.success ||
    parsed.data.protocol !== "https:" ||
    parsed.data.username ||
    parsed.data.password ||
    parsed.data.port
  )
    return {
      success: true as const,
      data: hold(url, "Use a public HTTPS product URL.", now),
    };
  const robots = await HTTP.page(new URL("/robots.txt", parsed.data).href, {
    strictGuard: true,
    limit: 200000,
    timeout: 10000,
    accept: "text/plain",
  });
  if (!robots.success)
    return {
      success: true as const,
      data: hold(url, "The site's access rules could not be checked.", now),
    };
  if (
    robots.data.status !== 404 &&
    (robots.data.status !== 200 ||
      blockedByRobots(
        robots.data.body,
        `${parsed.data.pathname}${parsed.data.search}`,
      ))
  )
    return {
      success: true as const,
      data: hold(url, "The site's access rules do not permit this check.", now),
    };
  await pause();
  const first = await HTTP.page(url, {
    strictGuard: true,
    limit: 1500000,
    timeout: 15000,
  });
  if (!first.success)
    return {
      success: true as const,
      data: hold(url, "The product page could not be read completely.", now),
    };
  const finding = inspectProductPage({
    ...first.data,
    checkedAt: new Date().toISOString(),
  });
  if (finding.status !== "verified")
    return { success: true as const, data: finding };
  if (new URL(first.data.url).origin !== parsed.data.origin)
    return {
      success: true as const,
      data: hold(
        first.data.url,
        "The product moved to another origin. Review its canonical URL before checking again.",
        now,
      ),
    };
  await pause();
  const second = await HTTP.page(first.data.url, {
    strictGuard: true,
    limit: 1500000,
    timeout: 15000,
  });
  if (!second.success)
    return {
      success: true as const,
      data: hold(
        first.data.url,
        "The product finding could not be reverified.",
        now,
      ),
    };
  const verified = inspectProductPage({
    ...second.data,
    checkedAt: new Date().toISOString(),
  });
  if (
    new URL(second.data.url).origin !== parsed.data.origin ||
    verified.status !== "verified" ||
    verified.product !== finding.product ||
    verified.gap !== finding.gap ||
    verified.evidence !== finding.evidence
  )
    return {
      success: true as const,
      data: hold(
        first.data.url,
        "The product evidence changed on recheck.",
        now,
        finding.product,
      ),
    };
  return { success: true as const, data: verified };
};
