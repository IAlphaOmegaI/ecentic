/** biome-ignore-all lint/complexity/useLiteralKeys: we need to access the properties as strings */
import { resultify } from "@zenncore/utils";
import { XMLParser } from "fast-xml-parser";

// Bounded decoder for the five predefined XML entities.
// Applied after parsing with processEntities:false so that DOCTYPE entity
// expansion attacks ("billion laughs") are never evaluated, while normal
// text like &amp; and &lt; still round-trips correctly.
// &amp; is decoded last to avoid double-decoding "&amp;lt;" → "<".
const XML_ENTITIES = [
  ["&lt;", "<"],
  ["&gt;", ">"],
  ["&quot;", '"'],
  ["&apos;", "'"],
  ["&amp;", "&"],
] as const;

const decode = (value: string) =>
  XML_ENTITIES.reduce(
    (decoded, [entity, character]) => decoded.replaceAll(entity, character),
    value,
  );

export type Item = {
  title: string;
  description?: string;
  price?: string;
  currency?: string;
  image?: string;
  url?: string;
  sku?: string;
  id?: string;
};

/**
 * Splits a price string like "29.99 USD" or "$29.99" into numeric price
 * and ISO currency code. Falls back to null currency if none detected.
 */
export const parsePrice = (
  raw: string,
): { price: string | null; currency: string | null } => {
  const trimmed = raw.trim();

  // "29.99 USD" or "29.99 EUR" — numeric followed by currency code
  const trailingCode = trimmed.match(/^([\d.,]+)\s+([A-Z]{3})$/);
  if (trailingCode)
    return {
      price: trailingCode[1] ?? null,
      currency: trailingCode[2] ?? null,
    };

  // "USD 29.99" — currency code followed by numeric
  const leadingCode = trimmed.match(/^([A-Z]{3})\s+([\d.,]+)$/);
  if (leadingCode)
    return { price: leadingCode[2] ?? null, currency: leadingCode[1] ?? null };

  // Strip any leading currency symbol and return numeric part
  const numeric = trimmed.replace(/^[^\d]*/, "");
  return { price: numeric || trimmed, currency: null };
};

export const Parser = {
  xml: (text: string): Item[] => {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      removeNSPrefix: true,
      processEntities: false,
    });

    const parsed = parser.parse(text);

    const channel = parsed?.rss?.channel ?? parsed?.feed ?? parsed;

    const raw: unknown[] = (() => {
      if (Array.isArray(channel?.item)) return channel.item;

      if (channel?.item) return [channel.item];

      if (Array.isArray(channel?.entry)) return channel.entry;

      if (channel?.entry) return [channel.entry];

      return [];
    })();

    return raw.map((entry) => {
      const item = entry as Record<string, unknown>;
      const rawPrice = String(item["price"] ?? item["g:price"] ?? "");
      const itemParsed = rawPrice
        ? parsePrice(rawPrice)
        : { price: "", currency: null };
      const currency =
        String(item["currency"] ?? item["g:currency"] ?? "") ||
        itemParsed.currency ||
        undefined;

      return {
        title: decode(String(item["title"] ?? item["g:title"] ?? "Untitled")),
        description: decode(
          String(item["description"] ?? item["g:description"] ?? ""),
        ),
        price: itemParsed.price ?? undefined,
        currency,
        image: decode(
          String(
            item["image_link"] ?? item["g:image_link"] ?? item["image"] ?? "",
          ),
        ),
        url: decode(String(item["link"] ?? item["g:link"] ?? "")),
        sku: decode(String(item["id"] ?? item["g:id"] ?? item["sku"] ?? "")),
        id: decode(String(item["id"] ?? item["g:id"] ?? "")),
      };
    }) as Item[];
  },

  json: (text: string): Item[] => {
    const result = resultify(
      () =>
        JSON.parse(text) as {
          products?: Item[];
          items?: Item[];
        },
    );
    if (!result.success) return [];

    const data = Array.isArray(result.data)
      ? result.data
      : (result.data?.products ?? result.data?.items ?? []);

    if (!Array.isArray(data)) return [];

    return data.map((item) => {
      const rawPrice = String(item.price ?? "");
      const itemParsed = rawPrice
        ? parsePrice(rawPrice)
        : { price: "", currency: null };
      const currency =
        String((item as Record<string, unknown>)["currency"] ?? "") ||
        itemParsed.currency ||
        undefined;

      return {
        title: String(item.title ?? item.name ?? "Untitled"),
        description: String(item.description ?? ""),
        price: itemParsed.price ?? undefined,
        currency,
        image: String(item.image ?? item.image_url ?? item.imageUrl ?? ""),
        url: String(item.url ?? item.link ?? ""),
        sku: String(item.sku ?? item.id ?? ""),
        id: String(item.id ?? ""),
      };
    });
  },
};

export const detect = (text: string): "xml" | "json" => {
  const trimmed = text.trimStart();
  if (trimmed.startsWith("<")) return "xml";
  return "json";
};
