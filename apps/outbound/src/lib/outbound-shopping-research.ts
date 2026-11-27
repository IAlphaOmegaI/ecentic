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
const digest = z.string().regex(/^[a-f0-9]{64}$/);

export const shoppingQueryIntentSchema = z.enum([
  "exact-product",
  "unbranded-specific",
  "unbranded-broad",
]);
export type ShoppingQueryIntent = z.infer<typeof shoppingQueryIntentSchema>;

export const shoppingQueryBasisSchema = z
  .object({
    category: text(150),
    attribute: text(300),
    excerpts: z
      .array(
        z
          .object({
            id: text(80),
            sourceId: text(80),
            // Excerpt IDs include the original whitespace in their hash.
            quote: z.string().min(1).max(2000),
          })
          .strict(),
      )
      .min(1)
      .max(12),
    promptHash: digest,
  })
  .strict();
export type ShoppingQueryBasis = z.infer<typeof shoppingQueryBasisSchema>;

export const shoppingCaptureCompletenessSchema = z
  .object({
    status: z.enum(["complete", "truncated", "blocked", "empty", "uncertain"]),
    reason: text(1500).nullable(),
  })
  .strict();
export type ShoppingCaptureCompleteness = z.infer<
  typeof shoppingCaptureCompletenessSchema
>;

/** Decoded card labels are replayed from the full raw answer by the server. */
export const shoppingCardProofSchema = z
  .object({
    format: z.literal("scrapellm-product-cards-v1"),
    answerHash: digest,
    cardId: text(80),
    sectionId: text(80),
    start: z.number().int().min(0),
    end: z.number().int().min(1),
    rawHash: digest,
    title: text(300),
    seller: text(300),
  })
  .strict();
export type ShoppingCardProof = z.infer<typeof shoppingCardProofSchema>;
export const shoppingCardQuote = (
  card: Pick<ShoppingCardProof, "title" | "seller">,
) => `Product: ${card.title}\nSeller: ${card.seller}`;

export const shoppingBrandProofSchema = z
  .object({
    version: z.literal("answer-brands-v1"),
    answerHash: digest,
    context: z.enum(["card-title", "answer-text"]),
    start: z.number().int().min(0),
    end: z.number().int().min(1),
    rawHash: digest,
    cardId: text(80).optional(),
    title: text(2000),
  })
  .strict();
export type ShoppingBrandProof = z.infer<typeof shoppingBrandProofSchema>;
export const shoppingBrandProjectionSchema = z
  .object({
    version: z.literal("answer-brands-v1"),
    brands: z
      .array(
        z
          .object({
            name: text(100),
            excerptIds: identifiers,
            position: z.number().int().min(1).nullable(),
          })
          .strict(),
      )
      .min(2)
      .max(3),
  })
  .strict();

const researchSourceSchema = z
  .object({
    id: text(80),
    kind: z.enum(["product", "ucp", "competitor", "checkout", "search"]),
    url,
    checkedAt: z.string().datetime(),
    capture: z.enum(["http", "browser", "provider"]),
    content: text(18000),
    artifact: text(2000),
  })
  .strict();

export const shoppingCaptureHistorySchema = z
  .object({
    version: z.literal("capture-history-v1"),
    auditOnly: z.literal(true),
    query: text(1000),
    queryHash: digest,
    intent: shoppingQueryIntentSchema.optional(),
    basis: shoppingQueryBasisSchema.optional(),
    sourceId: text(80),
    answerHash: digest,
    linksHash: digest,
    executedAt: z.string().datetime(),
    sources: z.array(researchSourceSchema).min(2).max(12),
    raw: z
      .array(
        z
          .object({
            url: text(2000),
            status: z.number().int(),
            sha256: digest,
            receivedAt: z.string().datetime(),
          })
          .strict(),
      )
      .min(1)
      .max(20),
  })
  .strict();

/** Presence is a server result over the full answer and cited links, never model output. */
export const shoppingDiscoverySchema = z
  .object({
    queryIndex: z.number().int().min(0).max(4),
    sourceId: text(80),
    answerHash: digest,
    linksHash: digest,
    checkedAt: z.string().datetime(),
    completeness: shoppingCaptureCompletenessSchema,
    merchantPresent: z.boolean().nullable(),
    merchantPosition: z.number().int().min(1).max(1000).nullable(),
    totalListed: z.number().int().min(0).max(1000).nullable(),
    order: z.enum(["ranked", "unranked"]).optional(),
    assessmentVersion: z.literal("discovery-v2").optional(),
    brandProjection: shoppingBrandProjectionSchema.optional(),
    noGapProof: z
      .object({
        version: z.literal("repeated-presence-v1"),
        previousAnswerHash: digest,
        previousLinksHash: digest,
        previousQueryHash: digest,
      })
      .strict()
      .optional(),
    listed: z
      .array(
        z
          .object({
            name: text(300),
            kind: z.enum(["brand", "retailer", "marketplace", "product"]),
            position: z.number().int().min(1).max(1000).nullable(),
            price: text(100).nullable(),
            excerptIds: identifiers,
            seller: text(300).optional(),
            cardId: text(80).optional(),
          })
          .strict(),
      )
      .max(50),
    description: text(1500).nullable(),
    matchedAliases: z.array(text(300)).max(50),
    presenceMethod: z.enum(["server-v1", "server-v2"]),
    correctness: z.enum(["correct", "discrepancy", "uncertain"]).optional(),
    correctnessExcerptIds: z.array(text(80)).max(12).optional(),
    correctnessProof: z
      .object({
        answerQuoteId: text(80),
        productQuoteId: text(80),
        answerText: text(1500),
        pageText: text(1500),
      })
      .strict()
      .optional(),
  })
  .strict();
export type ShoppingDiscovery = z.infer<typeof shoppingDiscoverySchema>;

/** Receipts store observed facts only; relevance and narrative belong to writing. */
export const shoppingClaimSchema = z
  .object({
    id: text(80),
    type: z.literal("observed"),
    kind: z.enum([
      "query",
      "name",
      "brand",
      "price",
      "position",
      "count",
      "merchant-presence",
      "description",
      "product-attribute",
    ]),
    value: text(1500),
    sourceIds: identifiers,
    excerptIds: identifiers,
    queryIndex: z.number().int().min(0).max(4).nullable(),
    qualifiers: z.array(text(300)).max(12),
  })
  .strict();
export type ShoppingClaim = z.infer<typeof shoppingClaimSchema>;

export const shoppingOfferProofSchema = z
  .object({
    quoteId: text(80),
    offer: z.string().min(1).max(600),
    variant: text(100),
    price: text(40),
    currency: z.enum(["USD", "CAD", "AUD", "NZD", "GBP", "EUR"]),
    currencyAnchor: text(40),
    condition: z.enum(["one-time", "subscription", "member"]),
    conditionAnchor: text(80),
    marketAnchor: text(80).nullable(),
  })
  .strict();

export const shoppingFindingSchema = z.object({
  kind: z.enum([
    "query-comparison",
    "checkout-handoff",
    "ucp-gap",
    "product-data-gap",
    "product-observation",
    "discovery-absence",
    "discovery-outranked",
    "no-gap",
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
    sources: z.array(researchSourceSchema).min(2).max(12),
    captureHistory: z.array(shoppingCaptureHistorySchema).max(4).optional(),
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
            // Missing metadata stays missing on historical receipts.
            intent: shoppingQueryIntentSchema.optional(),
            basis: shoppingQueryBasisSchema.optional(),
          })
          .strict(),
      )
      .min(1)
      .max(5),
    discovery: shoppingDiscoverySchema.optional(),
    claims: z.array(shoppingClaimSchema).max(100).optional(),
    claimExcerpts: z
      .array(
        z
          .object({
            id: text(80),
            sourceId: text(80),
            quote: z.string().min(1).max(2000),
            card: shoppingCardProofSchema.optional(),
            brand: shoppingBrandProofSchema.optional(),
          })
          .strict(),
      )
      .max(100)
      .optional(),
    priceComparison: z
      .object({
        answer: shoppingOfferProofSchema,
        page: shoppingOfferProofSchema,
      })
      .strict()
      .optional(),
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

export const cleanResultBrand = (value: string) =>
  value.replace(/\s*&\s*more\s*$/i, "").trim();

/** Copy may use only the dedicated brand projection, never historical product/seller names. */
export const resultBrandNames = (receipt: ShoppingResearch): string[] =>
  receipt.discovery?.brandProjection?.brands.map((brand) => brand.name) ?? [];

export const resultBrandsProblem = (
  receipt: ShoppingResearch,
): string | null => {
  if (
    !["discovery-absence", "discovery-outranked"].includes(
      receipt.selected.kind,
    )
  )
    return null;
  const projection = receipt.discovery?.brandProjection;
  if (
    !projection ||
    !shoppingBrandProjectionSchema.safeParse(projection).success
  )
    return "The result needs two or three source-bound brand names from the saved answer.";
  const names = projection.brands.map((entry) => entry.name);
  if (
    new Set(names.map((name) => name.toLocaleLowerCase())).size !== names.length
  )
    return "The result must name two or three distinct brands.";
  for (const entry of projection.brands) {
    const excerpt = receipt.claimExcerpts?.find(
      (item) => item.id === entry.excerptIds[0],
    );
    const proof = excerpt?.brand;
    const boundary = proof?.title.slice(
      entry.name.length,
      entry.name.length + 1,
    );
    if (
      entry.name !== cleanResultBrand(entry.name) ||
      /(?:https?:|www\.|[\r\n]|[<>])/.test(entry.name) ||
      entry.excerptIds.length !== 1 ||
      !excerpt ||
      !proof ||
      excerpt.sourceId !== receipt.discovery?.sourceId ||
      proof.answerHash !== receipt.discovery.answerHash ||
      proof.end <= proof.start ||
      excerpt.quote !== proof.title ||
      !proof.title.includes(entry.name) ||
      (proof.context === "card-title" &&
        (!proof.cardId ||
          !proof.title.startsWith(entry.name) ||
          !boundary ||
          !/[\s:®™-]/.test(boundary))) ||
      (entry.position !== null &&
        (receipt.discovery.order === "unranked" ||
          !receipt.discovery.listed.some(
            (item) =>
              item.position === entry.position && item.name === entry.name,
          ))) ||
      !receipt.claims?.some(
        (claim) =>
          claim.kind === "brand" &&
          claim.value === entry.name &&
          claim.queryIndex === receipt.discovery?.queryIndex &&
          claim.excerptIds.length === 1 &&
          claim.excerptIds[0] === excerpt.id &&
          claim.sourceIds.length === 1 &&
          claim.sourceIds[0] === excerpt.sourceId &&
          !claim.qualifiers.length,
      )
    )
      return "A result brand is not an exact brand string in its bound answer evidence.";
  }
  if (
    receipt.claims?.filter((claim) => claim.kind === "brand").length !==
    names.length
  )
    return "The observed brand claims differ from the projected result brands.";
  return null;
};
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

/** Invalid limits fail closed; discovery never permits more than seven days. */
export const discoveryFreshnessLimit = (days = 7) =>
  Number.isFinite(days) ? Math.min(7, Math.max(1, Math.floor(days))) : 1;

/** Discovery is time-sensitive even when older page evidence is allowed. */
export const discoveryFreshnessProblem = (
  receipt: ShoppingResearch,
  now = Date.now(),
  days = 7,
): string | null => {
  if (
    !["discovery-absence", "discovery-outranked", "no-gap"].includes(
      receipt.selected.kind,
    )
  )
    return null;
  const query = receipt.queries[receipt.selected.queryIndex];
  const observed = Date.parse(query?.executedAt ?? "");
  const limit = discoveryFreshnessLimit(days);
  const maximum = limit * 86_400_000;
  if (!Number.isFinite(observed) || observed > now || now - observed > maximum)
    return `Needs a fresh search (older than ${limit} ${limit === 1 ? "day" : "days"} or future-dated).`;
  return null;
};

/** Structural ledger validation; automatic receipts additionally replay their raw proof. */
const discoveryLedgerProblem = (receipt: ShoppingResearch): string | null => {
  const discoveryKind = [
    "discovery-absence",
    "discovery-outranked",
    "no-gap",
  ].includes(receipt.selected.kind);
  if (!receipt.discovery && !receipt.claims && !receipt.claimExcerpts)
    return discoveryKind
      ? "The finding needs a saved discovery result and claims ledger."
      : null;
  const claims = receipt.claims;
  const excerpts = receipt.claimExcerpts;
  const discovery = receipt.discovery;
  if (!claims?.length || !excerpts?.length)
    return "The finding needs its observed claims and exact supporting excerpts.";
  if (
    new Set(claims.map((claim) => claim.id)).size !== claims.length ||
    new Set(excerpts.map((excerpt) => excerpt.id)).size !== excerpts.length
  )
    return "Claim and excerpt IDs must be unique.";
  const sourceMap = new Map(
    receipt.sources.map((source) => [source.id, source]),
  );
  const excerptMap = new Map(excerpts.map((excerpt) => [excerpt.id, excerpt]));
  if (
    excerpts.some(
      (excerpt) =>
        !sourceMap.has(excerpt.sourceId) ||
        (excerpt.brand
          ? excerpt.card !== undefined ||
            excerpt.sourceId !== discovery?.sourceId ||
            excerpt.brand.answerHash !== discovery?.answerHash ||
            excerpt.brand.end <= excerpt.brand.start ||
            excerpt.quote !== excerpt.brand.title
          : excerpt.card
            ? discovery?.order !== "unranked" ||
              receipt.selected.kind !== "discovery-absence" ||
              excerpt.sourceId !== discovery.sourceId ||
              excerpt.card.answerHash !== discovery.answerHash ||
              excerpt.card.end <= excerpt.card.start ||
              excerpt.quote !== shoppingCardQuote(excerpt.card)
            : !normalizeResearchText(
                sourceMap.get(excerpt.sourceId)?.content ?? "",
              ).includes(normalizeResearchText(excerpt.quote))),
    )
  )
    return "A claim excerpt does not match its saved source.";
  if (
    claims.some(
      (claim) =>
        claim.sourceIds.some((id) => !sourceMap.has(id)) ||
        claim.excerptIds.some(
          (id) =>
            !excerptMap.has(id) ||
            !claim.sourceIds.includes(excerptMap.get(id)?.sourceId ?? ""),
        ) ||
        claim.sourceIds.some(
          (sourceId) =>
            !claim.excerptIds.some(
              (id) => excerptMap.get(id)?.sourceId === sourceId,
            ),
        ) ||
        (claim.queryIndex !== null && !receipt.queries[claim.queryIndex]),
    )
  )
    return "A claim references an unknown or unrelated source, excerpt or query.";
  if (
    claims.some((claim) => {
      const brandExcerpts = claim.excerptIds
        .map((id) => excerptMap.get(id))
        .filter((entry) => entry?.brand);
      if (brandExcerpts.length)
        return (
          claim.kind !== "brand" ||
          brandExcerpts.length !== 1 ||
          claim.excerptIds.length !== 1 ||
          !brandExcerpts[0]?.quote.includes(claim.value) ||
          Boolean(claim.qualifiers.length)
        );
      const cardExcerpts = claim.excerptIds
        .map((id) => excerptMap.get(id))
        .filter((excerpt) => excerpt?.card);
      if (cardExcerpts.length) {
        const card = cardExcerpts[0]?.card;
        return (
          cardExcerpts.length !== 1 ||
          claim.excerptIds.length !== 1 ||
          claim.kind !== "name" ||
          claim.queryIndex !== discovery?.queryIndex ||
          !card ||
          !(
            (claim.value === card.title &&
              claim.qualifiers.length === 1 &&
              claim.qualifiers[0] === card.seller) ||
            (claim.value === card.seller && !claim.qualifiers.length)
          )
        );
      }
      const evidence = claim.excerptIds
        .map((id) => excerptMap.get(id)?.quote ?? "")
        .join("\n");
      const normalized = normalizeResearchText(evidence);
      const literal = [
        "name",
        "price",
        "description",
        "product-attribute",
      ].includes(claim.kind);
      return (
        (literal && !normalized.includes(normalizeResearchText(claim.value))) ||
        claim.qualifiers.some(
          (qualifier) => !normalized.includes(normalizeResearchText(qualifier)),
        ) ||
        (claim.kind === "query" &&
          (claim.queryIndex === null ||
            claim.value !== receipt.queries[claim.queryIndex]?.query))
      );
    })
  )
    return "An observed claim or qualifier is missing from its exact supporting evidence.";
  if (!discovery)
    return discoveryKind ? "The finding needs a saved discovery result." : null;
  const query = receipt.queries[discovery.queryIndex];
  const totalListed = discovery.totalListed;
  const merchantPosition = discovery.merchantPosition;
  const unranked = discovery.order === "unranked";
  if (
    unranked &&
    ((!discovery.noGapProof &&
      (receipt.selected.kind !== "discovery-absence" ||
        discovery.merchantPresent !== false)) ||
      merchantPosition !== null ||
      totalListed !== null ||
      discovery.description !== null ||
      discovery.correctness !== "uncertain" ||
      discovery.correctnessProof ||
      discovery.correctnessExcerptIds?.length ||
      receipt.priceComparison ||
      claims.some((claim) =>
        ["position", "count", "price"].includes(claim.kind),
      ))
  )
    return "Unranked product cards support only absence with no price, position, count or correctness claim.";
  if (
    !query ||
    discovery.queryIndex !== receipt.selected.queryIndex ||
    !query.sourceIds.includes(discovery.sourceId) ||
    sourceMap.get(discovery.sourceId)?.kind !== "search" ||
    discovery.checkedAt !== query.executedAt
  )
    return "The discovery result does not match the selected saved query.";
  if (
    discoveryKind &&
    (!query.intent?.startsWith("unbranded-") || !query.basis)
  )
    return "This finding needs a validated unbranded shopper search.";
  if (discoveryKind && discovery.completeness.status !== "complete")
    return "An incomplete or uncertain answer cannot establish absence, ranking or no gap.";
  if (
    discovery.merchantPresent === false &&
    (discovery.completeness.status !== "complete" ||
      discovery.matchedAliases.length ||
      discovery.merchantPosition !== null)
  )
    return "Absence requires a complete answer with no merchant match anywhere.";
  if (discovery.merchantPresent === true && !discovery.matchedAliases.length)
    return "A present merchant needs its server-matched name, product or domain.";
  if (discovery.merchantPresent !== true && discovery.merchantPosition !== null)
    return "An unknown or absent merchant cannot have a listed position.";
  if (
    discovery.listed.some(
      (entry, index) =>
        (unranked
          ? entry.kind !== "product" ||
            entry.position !== null ||
            entry.price !== null ||
            !entry.seller ||
            !entry.cardId ||
            entry.excerptIds.length !== 1 ||
            !entry.excerptIds.some((id) => {
              const card = excerptMap.get(id)?.card;
              return (
                card !== undefined &&
                card.cardId === entry.cardId &&
                card.title === entry.name &&
                card.seller === entry.seller
              );
            })
          : entry.kind === "product" ||
            entry.position === null ||
            entry.seller !== undefined ||
            entry.cardId !== undefined ||
            (index > 0 &&
              entry.position <=
                (discovery.listed[index - 1]?.position ?? 0))) ||
        entry.excerptIds.some(
          (id) =>
            !excerptMap.has(id) ||
            excerptMap.get(id)?.sourceId !== discovery.sourceId,
        ) ||
        !entry.excerptIds.some((id) =>
          normalizeResearchText(excerptMap.get(id)?.quote ?? "").includes(
            normalizeResearchText(entry.name),
          ),
        ) ||
        (entry.price !== null &&
          !entry.excerptIds.some((id) =>
            normalizeResearchText(excerptMap.get(id)?.quote ?? "").includes(
              normalizeResearchText(entry.price ?? ""),
            ),
          )),
    )
  )
    return "The named results must retain their supported order, names, prices and answer excerpts.";
  if (
    excerpts.some(
      (excerpt) =>
        excerpt.card &&
        !discovery.listed.some(
          (entry) =>
            entry.cardId === excerpt.card?.cardId &&
            entry.excerptIds.includes(excerpt.id),
        ),
    ) ||
    (unranked &&
      new Set(discovery.listed.map((entry) => entry.cardId)).size !==
        discovery.listed.length)
  )
    return "Every saved card must belong to exactly one named alternative.";
  if (
    totalListed !== null &&
    (totalListed < discovery.listed.length ||
      discovery.listed.some(
        (entry) => entry.position !== null && entry.position > totalListed,
      ) ||
      (merchantPosition !== null && merchantPosition > totalListed))
  )
    return "The saved result count does not match its listed positions.";
  if (discovery.correctnessExcerptIds?.some((id) => !excerptMap.has(id)))
    return "The correctness assessment references an unknown excerpt.";
  if (discovery.correctnessProof) {
    const proof = discovery.correctnessProof;
    const answerExcerpt = excerptMap.get(proof.answerQuoteId);
    const productExcerpt = excerptMap.get(proof.productQuoteId);
    if (
      answerExcerpt?.sourceId !== discovery.sourceId ||
      sourceMap.get(productExcerpt?.sourceId ?? "")?.kind !== "product" ||
      !discovery.correctnessExcerptIds?.includes(proof.answerQuoteId) ||
      !discovery.correctnessExcerptIds?.includes(proof.productQuoteId) ||
      !normalizeResearchText(answerExcerpt?.quote ?? "").includes(
        normalizeResearchText(proof.answerText),
      ) ||
      !normalizeResearchText(productExcerpt?.quote ?? "").includes(
        normalizeResearchText(proof.pageText),
      )
    )
      return "The correctness proof no longer matches its answer and product excerpts.";
  }
  if (receipt.priceComparison) {
    const comparison = receipt.priceComparison;
    if (
      [comparison.answer, comparison.page].some((offer) => {
        const excerpt = excerptMap.get(offer.quoteId);
        return (
          !excerpt?.quote.includes(offer.offer) ||
          [
            offer.variant,
            offer.price,
            offer.currencyAnchor,
            offer.conditionAnchor,
            ...(offer.marketAnchor ? [offer.marketAnchor] : []),
          ].some((anchor) => !offer.offer.includes(anchor))
        );
      }) ||
      excerptMap.get(comparison.answer.quoteId)?.sourceId !==
        discovery.sourceId ||
      sourceMap.get(excerptMap.get(comparison.page.quoteId)?.sourceId ?? "")
        ?.kind !== "product"
    )
      return "The comparable offers no longer match their exact local evidence.";
  }
  if (
    receipt.selected.kind === "discovery-absence" &&
    discovery.merchantPresent !== false
  )
    return "The merchant matched the answer or citations; absence is not supported.";
  if (
    receipt.selected.kind === "discovery-outranked" &&
    (discovery.merchantPresent !== true ||
      merchantPosition === null ||
      merchantPosition < 3 ||
      discovery.listed.filter(
        (entry) => entry.position !== null && entry.position < merchantPosition,
      ).length < 2)
  )
    return "An outranking finding needs the merchant after at least two named results.";
  if (
    receipt.selected.kind === "no-gap" &&
    !discovery.noGapProof &&
    (discovery.merchantPresent !== true ||
      discovery.merchantPosition !== 1 ||
      discovery.correctness !== "correct" ||
      !discovery.correctnessExcerptIds?.length)
  )
    return "No gap requires a complete answer with the merchant first and verified correct.";
  if (
    discovery.noGapProof &&
    (receipt.selected.kind !== "no-gap" ||
      discovery.assessmentVersion !== "discovery-v2" ||
      discovery.merchantPresent !== true ||
      discovery.merchantPosition !== null ||
      discovery.totalListed !== null ||
      discovery.order !== "unranked" ||
      discovery.correctness !== "uncertain" ||
      discovery.listed.length ||
      query.intent !== "unbranded-broad" ||
      !receipt.captureHistory?.some(
        (capture) =>
          capture.answerHash === discovery.noGapProof?.previousAnswerHash &&
          capture.linksHash === discovery.noGapProof.previousLinksHash &&
          capture.queryHash === discovery.noGapProof.previousQueryHash,
      ))
  )
    return "Repeated presence needs two bound valid searches without invented rank or correctness.";
  if (
    claims.some((claim) => {
      if (
        ["merchant-presence", "position", "count"].includes(claim.kind) &&
        claim.queryIndex !== discovery.queryIndex
      )
        return true;
      if (claim.kind === "merchant-presence")
        return (
          claim.value !==
          (discovery.merchantPresent === true
            ? "present"
            : discovery.merchantPresent === false
              ? "absent"
              : "unknown")
        );
      if (claim.kind === "position")
        return (
          !/^\d+$/.test(claim.value) ||
          ![
            discovery.merchantPosition,
            ...discovery.listed.map((entry) => entry.position),
          ].includes(Number(claim.value))
        );
      if (claim.kind === "count")
        return (
          discovery.totalListed === null ||
          claim.value !== String(discovery.totalListed)
        );
      return false;
    })
  )
    return "A derived presence, count or position claim differs from the saved discovery proof.";
  return discovery.brandProjection ? resultBrandsProblem(receipt) : null;
};

export const validateShoppingResearch = (
  receipt: ShoppingResearch,
  days: number,
  now = Date.now(),
  options: {
    allowStaleEvidence?: boolean;
    allowProductObservations?: boolean;
    discoveryFreshnessDays?: number;
  } = {},
): string | null => {
  const discoveryProblem =
    discoveryFreshnessProblem(receipt, now, options.discoveryFreshnessDays) ??
    discoveryLedgerProblem(receipt);
  if (discoveryProblem) return discoveryProblem;
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
    ![
      "product-observation",
      "discovery-absence",
      "discovery-outranked",
      "no-gap",
    ].includes(receipt.selected.kind) &&
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
    query?.status !== "observed" ||
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
    !receipt.competitors.length &&
    !(receipt.priceComparison && receipt.discovery?.merchantPresent === true)
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
    checkedAt: ["discovery-absence", "discovery-outranked", "no-gap"].includes(
      receipt.selected.kind,
    )
      ? receipt.queries[receipt.selected.queryIndex]?.executedAt
      : [
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
