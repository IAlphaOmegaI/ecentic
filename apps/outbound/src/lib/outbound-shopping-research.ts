import { getDomain } from "tldts";
import { z } from "zod";
import { evidenceDateUsable } from "./outbound-evidence";

export const DEFAULT_RESEARCH_INSTRUCTIONS =
  "Research each lead separately using real shopper questions, the merchant's UCP profile, comparable competitor products and the observed shopping or checkout path. Record the actual surface, query, market, locale, time and sources. Separate a simulation from a live shopping result. Unknown or blocked checks remain unknown. Use one specific, supported observation in a conversational email; never fall back to an ingredient compliment or a hypothetical 'I would check'. Do not invent purchases, relationships, personal experiences, missing UCP, lost sales or AI invisibility.";
const text = (maximum: number) => z.string().trim().min(1).max(maximum);
const url = z.url().refine((value) => {
  const parsed = new URL(value);
  return parsed.protocol === "https:" && !parsed.username && !parsed.password;
}, "Use a public HTTPS source URL.");
const identifiers = z.array(text(80)).min(1).max(12);
export const shoppingFindingSchema = z.object({
  kind: z.enum([
    "query-comparison",
    "checkout-handoff",
    "ucp-gap",
    "product-data-gap",
    "product-observation",
  ]),
  observation: text(1200),
  consequence: text(600),
  askAbout: text(300),
  scope: text(1500),
  checkedAt: z.string().datetime(),
});
export type ShoppingFinding = z.infer<typeof shoppingFindingSchema>;
export const shoppingResearchSchema = z
  .object({
    product: z.object({ name: text(300), url }),
    sources: z
      .array(
        z
          .object({
            id: text(80),
            kind: z.enum([
              "product",
              "ucp",
              "competitor",
              "checkout",
              "search",
            ]),
            url,
            checkedAt: z.string().datetime(),
            capture: z.enum(["http", "browser", "provider"]),
            content: text(18000),
            artifact: text(2000),
          })
          .strict(),
      )
      .min(2)
      .max(12),
    queries: z
      .array(
        z
          .object({
            query: text(1000),
            surface: text(150),
            market: text(100),
            interfaceLocale: text(100),
            signedOut: z.boolean().nullable(),
            executedAt: z.string().datetime(),
            status: z.enum(["observed", "blocked", "unavailable"]),
            sourceIds: identifiers,
            coverage: text(1500),
          })
          .strict(),
      )
      .min(1)
      .max(5),
    ucp: z
      .object({
        url,
        status: z.enum(["present", "notObserved", "blocked", "unknown"]),
        httpStatus: z.number().int().min(100).max(599).nullable(),
        capabilities: z.array(text(300)).max(50),
        sourceIds: identifiers,
      })
      .strict(),
    checkout: z
      .object({
        status: z.enum(["observed", "notTested", "blocked", "unknown"]),
        sourceIds: z.array(text(80)).max(12),
        notes: text(1500),
      })
      .strict(),
    competitors: z
      .array(
        z
          .object({
            name: text(200),
            product: text(300),
            url,
            sourceIds: identifiers,
            comparison: text(1500),
          })
          .strict(),
      )
      .max(5),
    selected: shoppingFindingSchema
      .omit({ checkedAt: true })
      .extend({
        queryIndex: z.number().int().min(0).max(4),
        sourceIds: identifiers,
        quotes: z
          .array(z.object({ sourceId: text(80), quote: text(2000) }).strict())
          .min(1)
          .max(12),
      })
      .strict(),
  })
  .strict();
export type ShoppingResearch = z.infer<typeof shoppingResearchSchema>;
export const normalizeResearchText = (value: string) =>
  value.replace(/\s+/g, " ").trim();

/** A storefront may select its default Shopify variant without leaving the requested product. */
export const productCaptureUrlMatches = (
  requested: string,
  observed: string,
) => {
  if (
    !URL.canParse(requested) ||
    !URL.canParse(observed) ||
    !url.safeParse(requested).success ||
    !url.safeParse(observed).success
  )
    return false;
  if (requested === observed) return true;
  const target = new URL(requested);
  const final = new URL(observed);
  return (
    target.origin === final.origin &&
    target.pathname === final.pathname &&
    !target.port &&
    !target.search &&
    !target.hash &&
    !final.hash &&
    /^\?variant=\d{1,25}$/.test(final.search)
  );
};
export const validateShoppingResearch = (
  receipt: ShoppingResearch,
  days: number,
  now = Date.now(),
  options: {
    allowStaleEvidence?: boolean;
    allowProductObservations?: boolean;
  } = {},
): string | null => {
  if (
    receipt.selected.kind === "product-observation" &&
    !options.allowProductObservations
  )
    return "Product observations are not enabled in the Playbook.";
  const merchant = getDomain(new URL(receipt.product.url).hostname, {
    allowPrivateDomains: true,
  });
  if (
    !merchant ||
    getDomain(new URL(receipt.ucp.url).hostname, {
      allowPrivateDomains: true,
    }) !== merchant
  )
    return "The UCP check must belong to the researched merchant.";
  const sources = new Map(receipt.sources.map((source) => [source.id, source]));
  if (sources.size !== receipt.sources.length)
    return "Shopping research source IDs must be unique.";
  const references = [
    ...receipt.queries.flatMap((query) => query.sourceIds),
    ...receipt.ucp.sourceIds,
    ...receipt.checkout.sourceIds,
    ...receipt.competitors.flatMap((competitor) => competitor.sourceIds),
    ...receipt.selected.sourceIds,
  ];
  if (references.some((id) => !sources.has(id)))
    return "Shopping research references an unknown source.";
  const timestamps = [
    ...receipt.sources.map((source) => source.checkedAt),
    ...receipt.queries.map((query) => query.executedAt),
  ];
  if (
    timestamps.some(
      (value) =>
        !evidenceDateUsable(value, { verificationDays: days, ...options }, now),
    )
  )
    return "Shopping research has expired or future-dated evidence.";
  const product = receipt.sources.find(
    (source) =>
      source.kind === "product" &&
      productCaptureUrlMatches(receipt.product.url, source.url) &&
      normalizeResearchText(source.content).includes(receipt.product.name),
  );
  if (!product)
    return "Shopping research needs the named product's own source.";
  if (
    receipt.selected.kind !== "product-observation" &&
    receipt.sources.some(
      (source) =>
        source.kind === "product" &&
        source.capture === "browser" &&
        source.url !== receipt.product.url &&
        productCaptureUrlMatches(receipt.product.url, source.url),
    )
  )
    return "An automatically selected product variant supports only a neutral observation, not a price or product discrepancy.";
  const query = receipt.queries[receipt.selected.queryIndex];
  if (
    !query ||
    query.status !== "observed" ||
    !query.sourceIds.some((id) => sources.get(id)?.kind === "search")
  )
    return "Shopping research needs an actually observed shopper query.";
  if (
    !receipt.ucp.sourceIds.some(
      (id) =>
        sources.get(id)?.kind === "ucp" &&
        sources.get(id)?.url === receipt.ucp.url,
    )
  )
    return "The UCP check needs its own captured response.";
  if (
    receipt.ucp.status === "present" &&
    (receipt.ucp.httpStatus !== 200 || !receipt.ucp.capabilities.length)
  )
    return "A present UCP profile needs a successful response and observed capabilities.";
  if (
    receipt.selected.kind === "ucp-gap" &&
    (receipt.ucp.status !== "notObserved" || receipt.ucp.httpStatus !== 404)
  )
    return "A UCP gap cannot be inferred from a present, blocked or unknown profile.";
  if (
    receipt.selected.kind === "checkout-handoff" &&
    receipt.checkout.status !== "observed"
  )
    return "A checkout finding needs an observed checkout path.";
  if (
    receipt.checkout.status === "observed" &&
    !receipt.checkout.sourceIds.some((id) => {
      const source = sources.get(id);
      return (
        source?.kind === "checkout" &&
        ["browser", "provider"].includes(source.capture)
      );
    })
  )
    return "Observed checkout steps need an actual checkout capture.";
  if (
    receipt.selected.kind === "query-comparison" &&
    !receipt.competitors.length
  )
    return "A comparison needs an identified competing product.";
  if (
    receipt.competitors.some(
      (competitor) =>
        !competitor.sourceIds.some((id) => {
          const source = sources.get(id);
          const content = normalizeResearchText(
            source?.content ?? "",
          ).toLowerCase();
          const productNames = competitor.product
            .toLowerCase()
            .split(/\s+[—–-]\s+/)
            .filter(Boolean);
          return Boolean(
            source &&
              productNames.every((name) => content.includes(name)) &&
              ((source.kind === "competitor" &&
                source.url === competitor.url) ||
                (source.kind === "search" &&
                  content.includes(competitor.name.toLowerCase()) &&
                  receipt.queries.some(
                    (query) =>
                      query.status === "observed" &&
                      query.sourceIds.includes(id),
                  ))),
          );
        }),
    )
  )
    return "A competitor needs its own product source or an actual query result naming that product.";
  if (
    ["product-data-gap", "product-observation"].includes(
      receipt.selected.kind,
    ) &&
    !receipt.sources.some(
      (source) =>
        source.kind === "product" &&
        productCaptureUrlMatches(receipt.product.url, source.url) &&
        source.capture === "browser",
    )
  )
    return "A product-data contrast requires a rendered product capture.";
  if (
    receipt.selected.sourceIds.some(
      (id) => !receipt.selected.quotes.some((quote) => quote.sourceId === id),
    )
  )
    return "Every selected source must have an exact supporting quote.";
  if (
    receipt.selected.quotes.some(
      (quote) =>
        !receipt.selected.sourceIds.includes(quote.sourceId) ||
        !normalizeResearchText(
          sources.get(quote.sourceId)?.content ?? "",
        ).includes(normalizeResearchText(quote.quote)),
    )
  )
    return "A shopping research quote does not match its source.";
  const copy = `${receipt.selected.observation} ${receipt.selected.consequence} ${receipt.selected.askAbout}`;
  if (
    receipt.selected.kind === "product-observation" &&
    (/\b(?:missing|mismatch(?:ed)?|incorrect|inaccurate|wrong|broken|omitted|outdated|invisible|lost sales|losing sales|conversion|revenue|ranking|checkout failure)\b/i.test(
      copy,
    ) ||
      receipt.competitors.length > 0 ||
      !receipt.selected.sourceIds.some((id) => {
        const source = sources.get(id);
        return (
          source?.kind === "product" &&
          productCaptureUrlMatches(receipt.product.url, source.url) &&
          source.capture === "browser"
        );
      }) ||
      !receipt.selected.sourceIds.some(
        (id) => sources.get(id)?.kind === "search",
      ))
  )
    return "A product observation must stay neutral and cite the actual product and shopper answer without alleging a problem or business impact.";
  if (
    /\b(?:I|we)(?:'d| would)\s+(?:check|test|look)\b|\bmy (?:girlfriend|wife|husband|partner)\b|\b(?:I|we) (?:bought|purchased|ordered)\b|\bI (?:use|wear|tried) your\b/i.test(
      copy,
    )
  )
    return "Use the observed finding without hypothetical checks or invented personal experience.";
  if (
    /\b(?:invisible|lost sales|losing sales|guaranteed|checkout is broken|cannot buy|can't buy)\b/i.test(
      copy,
    )
  )
    return "The selected finding makes an unsupported general outcome claim.";
  if (
    receipt.ucp.status === "present" &&
    /\b(?:no|missing|without)\s+(?:a\s+|your\s+)?UCP|UCP.{0,30}\b(?:missing|absent)\b/i.test(
      copy,
    )
  )
    return "The captured UCP profile is present.";
  if (
    query.market === "unknown" &&
    /\b(?:in the US|US shoppers|American shoppers|United States)\b/i.test(copy)
  )
    return "The observed query did not establish a US market.";
  return null;
};
export const shoppingFinding = (receipt: ShoppingResearch): ShoppingFinding =>
  shoppingFindingSchema.parse({
    ...receipt.selected,
    checkedAt: [
      ...receipt.sources.map((source) => source.checkedAt),
      ...receipt.queries.map((query) => query.executedAt),
    ].sort()[0],
  });

export const shoppingCopy = (prospect: {
  shoppingResearchId?: string;
  shoppingFinding?: ShoppingFinding | null;
}) =>
  prospect.shoppingResearchId && prospect.shoppingFinding
    ? {
        finding: prospect.shoppingFinding.observation,
        consequence: prospect.shoppingFinding.consequence,
        askAbout: prospect.shoppingFinding.askAbout,
      }
    : null;
