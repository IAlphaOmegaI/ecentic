import { parse } from "@formatjs/icu-messageformat-parser";
import type { TranslationUnit } from "../../src/i18n/translation/runner";

export type CatalogValue =
  | string
  | number
  | boolean
  | null
  | CatalogValue[]
  | { [key: string]: CatalogValue };

export const flattenCatalog = (
  value: CatalogValue,
  path = "",
): Record<string, string | number | boolean | null> => {
  if (Array.isArray(value)) {
    return Object.assign(
      {},
      ...value.map((entry, index) => flattenCatalog(entry, `${path}.${index}`)),
    );
  }
  if (value !== null && typeof value === "object") {
    return Object.assign(
      {},
      ...Object.entries(value).map(([key, entry]) =>
        flattenCatalog(entry, path ? `${path}.${key}` : key),
      ),
    );
  }
  return { [path]: value };
};

export const mapCatalog = (
  value: CatalogValue,
  translate: (path: string, text: string) => string,
  path = "",
): CatalogValue => {
  if (typeof value === "string") return translate(path, value);
  if (Array.isArray(value)) {
    return value.map((entry, index) =>
      mapCatalog(entry, translate, `${path}.${index}`),
    );
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        mapCatalog(entry, translate, path ? `${path}.${key}` : key),
      ]),
    );
  }
  return value;
};

/** Older overlapping fragments inherit the final catalog's current array shape. */
export const projectCatalogFragment = (
  fragment: CatalogValue,
  authoritative: CatalogValue,
): CatalogValue => {
  if (Array.isArray(fragment)) return authoritative;
  if (
    fragment !== null &&
    typeof fragment === "object" &&
    authoritative !== null &&
    typeof authoritative === "object" &&
    !Array.isArray(authoritative)
  ) {
    return Object.fromEntries(
      Object.entries(fragment).flatMap(([key, value]) =>
        key in authoritative
          ? [[key, projectCatalogFragment(value, authoritative[key] ?? null)]]
          : [],
      ),
    );
  }
  return authoritative;
};

/** Resource identity is separate from visible copy, including status lookup keys. */
export const catalogInvariantReason = (
  path: string,
  text: string,
): string | null => {
  const field = path.split(".").at(-1) ?? "";
  if (["id", "key", "href", "src", "slug", "color"].includes(field)) {
    return "Resource identifier, route or presentation token";
  }
  if (/^enterpriseLead\.options\.[^.]+\.\d+\.value$/.test(path)) {
    return "Submitted form option identifier; its adjacent label is translated";
  }
  if (
    /^(enterpriseNav\.groups\.|enterpriseHome\.channels\.items\.)/.test(path) &&
    field === "status"
  ) {
    return "Status lookup identifier; its display label is translated separately";
  }
  if (!text.trim() || !/\p{L}/u.test(text)) return "Nonverbal value";
  if (/^\{\{TODO:/.test(text)) return "Unpublished review instruction";
  if (/^(https?:\/\/|mailto:|tel:|\/|#)[^\s]+$/.test(text))
    return "URL or path";
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return "Email address";
  if (
    /^(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD|HTTPS|HTTP|JSON|JSON-LD|XML|CSV|MCP|UCP|API|REST|SSE|SKU|ID|USD)$/.test(
      text,
    )
  ) {
    return "Protocol or code identifier";
  }
  if (
    /^(curl |npx |npm |bun |pnpm |ECENTIC_API_KEY=|Authorization:|Content-Type:)/.test(
      text,
    )
  ) {
    return "Executable example";
  }
  if (
    /^(Shopify|WooCommerce|ChatGPT|Claude|Gemini|Google|Microsoft Copilot|Perplexity|Amazon|ecentic|écentic|ecentic Inc|ECENTIC SH\.P\.K\.|Compete|Scale|Dominate|Stripe|OpenAI|Anthropic|Azure|zennit|Adobe Commerce|Shopware|PrestaShop|Plytix|Wix|WIX|Nucleo|PostHog|Sentry|UploadThing|Resend|Cal\.com|Chatwoot|Upstash|Vercel|Neon|Salesforce|Semrush|Bain|MCP|UCP|GPT-4o|GPT-5\.4)$/.test(
      text,
    )
  ) {
    return "Protected product, company or plan name";
  }
  if (/^[a-zA-Z_$][\w$]*(?:_[a-zA-Z0-9]+)+$/.test(text))
    return "Code field identifier";
  if (
    /^\/?[\w@.-]+(?:\/[\w@.{}:-]+)*\.(?:json|txt|csv|xml|md|js|ts|png|webp|svg)$/.test(
      text,
    )
  ) {
    return "Filename";
  }
  if (/^[{[]/.test(text)) {
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === "object")
        return "Serialized code example";
    } catch {
      // Ordinary messages may start with an ICU argument.
    }
  }
  return null;
};

export const catalogTranslationUnit = (
  id: string,
  text: string,
): TranslationUnit => {
  const invariant = catalogInvariantReason(id, text);
  const format = (() => {
    if (invariant || !/[{}<>]/.test(text)) return "plain" as const;
    try {
      parse(text);
      return "icu" as const;
    } catch {
      return "plain" as const;
    }
  })();
  return {
    id,
    text,
    format,
    invariant: Boolean(invariant),
    translatableTerms: [
      "enterpriseHome.pricing.title",
      "enterprisePricing.title",
    ].includes(id)
      ? ["Scale"]
      : undefined,
    context: invariant
      ? invariant
      : `ecentic website resource ${id}. ${/legal\.|privacy|terms|consent/i.test(id) ? "Legal or consent copy: preserve every obligation, qualification and scope." : /title|headline|accent/.test(id) ? "Heading or headline fragment; read adjacent fields as one thought." : /action|button|label|primary|secondary/.test(id) ? "Concise interface label or action; retain what the action actually does." : /description|body|answer|paragraph|content/.test(id) ? "Explanatory prose; write idiomatically while preserving all facts and qualifiers." : "Visible interface, marketing or accessibility copy."}`,
  };
};

export const catalogBatchGroup = (id: string): string => {
  const parts = id.split(".");
  return parts[0] === "dashboard"
    ? parts.slice(0, 2).join(".")
    : (parts[0] ?? id);
};
