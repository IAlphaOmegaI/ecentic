import { createHash } from "node:crypto";
import { defaultPlaybook, prospectSchema } from "@/lib/outbound";
import type { WriterParts } from "@/lib/outbound-composition";
import {
  type ShoppingClaim,
  shoppingResearchSchema,
} from "@/lib/outbound-shopping-research";

/** Injected judge response for lifecycle tests; it makes no claim about real copy. */
export const passingCopyJudge = async () => ({
  openingFits: {
    passed: true,
    reason: "The synthetic opening fits its product.",
  },
  resultCheckable: {
    passed: true,
    reason: "The synthetic result matches its supplied ledger.",
  },
  reasonToCare: {
    passed: true,
    reason: "The approved relevance explains the finding.",
  },
  founderTransition: {
    passed: true,
    reason: "The configured founder sentence follows the finding.",
  },
  oneChatAsk: {
    passed: true,
    reason: "Each email has only its configured conversation ask.",
  },
  naturalVoice: {
    passed: true,
    reason: "The synthetic copy uses the configured sender voice.",
  },
});

/** Synthetic copy-only facts; these are not evidence of any real search or merchant. */
export const writerFixture = (ranked = false) => {
  const checkedAt = new Date().toISOString();
  const query = "linen tote gift ideas";
  const names = ranked
    ? ["Alder", "Birch", "Cedar", "Maple", "Sample Goods", "Oak"]
    : ["Alder", "Birch"];
  const answer = names
    .map(
      (name, index) =>
        `${index + 1}. ${name}${index === 0 ? " at around $36" : ""}`,
    )
    .join("\n");
  const productText = "The Linen tote is a large and washable gift bag.";
  const digest = (value: string) =>
    createHash("sha256").update(value).digest("hex");
  const source = (
    id: string,
    content: string,
    kind: "search" | "product" | "ucp",
  ) => ({
    id,
    kind,
    url:
      kind === "ucp"
        ? "https://samplegoods.test/.well-known/ucp"
        : `https://samplegoods.test/${id}`,
    checkedAt,
    capture:
      kind === "search"
        ? ("provider" as const)
        : kind === "product"
          ? ("browser" as const)
          : ("http" as const),
    content,
    artifact: `synthetic-copy-fixture:${digest(content)}`,
  });
  const claim = (
    id: string,
    kind: ShoppingClaim["kind"],
    value: string,
    qualifiers: string[] = [],
    page = false,
  ): ShoppingClaim => ({
    id,
    type: "observed",
    kind,
    value,
    qualifiers,
    sourceIds: [page ? "product" : "answer"],
    excerptIds: [page ? "page-excerpt" : "answer-excerpt"],
    queryIndex: page ? null : 0,
  });
  const receipt = shoppingResearchSchema.parse({
    product: { name: "Linen tote", url: "https://samplegoods.test/product" },
    sources: [
      source("answer", answer, "search"),
      source("product", productText, "product"),
      source("ucp", "HTTP 404", "ucp"),
    ],
    queries: [
      {
        query,
        surface: "Google AI Mode",
        market: "unknown",
        interfaceLocale: "unknown",
        signedOut: null,
        executedAt: checkedAt,
        status: "observed",
        sourceIds: ["answer"],
        coverage: "Synthetic fixture for offline copy checks only.",
        intent: "unbranded-specific",
        basis: {
          category: "tote",
          attribute: "gift",
          excerpts: [
            { id: "page-excerpt", sourceId: "product", quote: productText },
          ],
          promptHash: digest("synthetic fixture prompt"),
        },
      },
    ],
    discovery: {
      queryIndex: 0,
      sourceId: "answer",
      answerHash: digest(answer),
      linksHash: digest("[]"),
      checkedAt,
      completeness: { status: "complete", reason: null },
      merchantPresent: ranked,
      merchantPosition: ranked ? 5 : null,
      totalListed: names.length,
      listed: names.map((name, index) => ({
        name,
        kind: "retailer",
        position: index + 1,
        price: index === 0 ? "around $36" : null,
        excerptIds: ["answer-excerpt"],
      })),
      description: null,
      matchedAliases: ranked ? ["Sample Goods"] : [],
      presenceMethod: "server-v1",
    },
    claims: [
      claim("query", "query", query),
      claim("presence", "merchant-presence", ranked ? "present" : "absent"),
      ...names.flatMap((name, index) => [
        claim(`name-${index}`, "name", name),
        claim(`position-${index}`, "position", String(index + 1)),
      ]),
      claim("count", "count", String(names.length)),
      claim("price", "price", "around $36", ["around"]),
      claim("large", "product-attribute", "large", [], true),
      claim("washable", "product-attribute", "washable", [], true),
    ],
    claimExcerpts: [
      { id: "answer-excerpt", sourceId: "answer", quote: answer },
      { id: "page-excerpt", sourceId: "product", quote: productText },
    ],
    ucp: {
      url: "https://samplegoods.test/.well-known/ucp",
      status: "notObserved",
      httpStatus: 404,
      capabilities: [],
      sourceIds: ["ucp"],
    },
    checkout: {
      status: "notTested",
      sourceIds: [],
      notes: "Synthetic copy fixture; no checkout was attempted.",
    },
    competitors: [],
    selected: {
      kind: ranked ? "discovery-outranked" : "discovery-absence",
      observation: "Synthetic ordered answer facts.",
      consequence: "Internal receipt field; never recipient copy.",
      askAbout: "the saved result",
      scope: "Synthetic copy-only fixture.",
      queryIndex: 0,
      sourceIds: ["answer"],
      quotes: [{ sourceId: "answer", quote: answer }],
    },
  });
  const relevance = ranked
    ? "The first couple of names in a list like that get the first look."
    : "That search is a chance to meet shoppers before they know your store.";
  const prospect = prospectSchema.parse({
    company: "Sample Goods",
    domain: "samplegoods.test",
    country: "US",
    name: "Jamie Smith",
    first: "Jamie",
    email: "jamie@samplegoods.test",
    title: "Head of Ecommerce",
    product: receipt.product.name,
    productUrl: receipt.product.url,
    productCategory: "linen totes",
    gap: "shopping-research",
    finding: receipt.selected.observation,
    evidence: "Synthetic copy-only fixture.",
    personalLine: "",
    assignedSenderEmail: "xhuri@joinecentic.com",
  });
  const policy = {
    ...defaultPlaybook,
    subjectTemplate: "{queryTopic}",
    bodyTemplate:
      "Hey {first}!\n\n{opening}\n\n{result} {relevance}\n\n{founderLine} {callToAction}\n\n{optout}\n\n{signature}",
    followupOneTemplate:
      "Hey {first},\n\n{followupFact} {callToAction}\n\n{optout}\n\n{signature}",
    followupTwoTemplate:
      "Hey {first},\n\nLast note from me. If it's useful, I can run that same search with you live. Takes about ten minutes. If not, no worries.\n\n{optout}\n\n{signature}",
    linkedinTemplate: "Hi {first}, {result} Would be good to connect.",
    founderLine:
      "I'm Juri. I started ecentic to help stores get picked when AI does the shopping.",
    productCheckIntro:
      "I'm Juri. I started ecentic to help stores get picked in answers like that.",
    fromName: "Juri",
    signature: "Juri",
    callToAction: "Worth a quick chat?",
    optout: '(Reply "no" and I won\'t follow up.)',
    relevanceLines: [relevance],
    requireShoppingEvidence: true,
    humanizeDrafts: true,
  };
  const parts: WriterParts = {
    subject: "linen tote gifts",
    opening: `My sister needed a tote, so I asked for "${query}".`,
    result: ranked
      ? "Sample Goods came up 5th of 6, after Alder, Birch, Cedar and Maple."
      : "It picked Alder and Birch. Sample Goods didn't come up.",
    relevance,
    followupFact: "",
  };
  return { prospect, receipt, policy, parts };
};
