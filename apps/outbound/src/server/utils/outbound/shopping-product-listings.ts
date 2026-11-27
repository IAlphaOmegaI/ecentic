import "server-only";
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { resultify } from "@zenncore/utils";
import {
  PRODUCT_LISTING_ABSENCE_VERSION,
  type ShoppingProductListings,
  type ShoppingResearch,
  shoppingProductListingsSchema,
  shoppingResearchSchema,
} from "@/lib/outbound-shopping-research";
import type { AiCapture } from "./live-shopping-contract";
import { parseShoppingAnswerCards } from "./shopping-answer-cards";
import {
  type Evidence,
  validateAutomaticResearch,
} from "./shopping-assessment";
import { replayShoppingCapture } from "./shopping-presence";

const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const NO_LINKED_PRODUCTS_REASON =
  "No gap found. The answer does not list products with product links.";
type ListingEligibility =
  | { status: "eligible"; proof: ShoppingProductListings }
  | { status: "no-gap" | "held"; reason: string };

const productUrl = (value: string) => {
  const parsed = resultify(() => new URL(value));
  if (
    !parsed.success ||
    parsed.data.protocol !== "https:" ||
    parsed.data.username ||
    parsed.data.password
  )
    return false;
  const url = parsed.data;
  if (url.hostname === "www.google.com" || url.hostname === "google.com")
    return (
      url.pathname === "/search" &&
      url.searchParams.get("ibp") === "oshop" &&
      /(?:catalogid|productDocid|headlineOfferDocid|gpcid):\d+/.test(
        url.searchParams.get("prds") ?? "",
      )
    );
  return /\/(?:products?|p)\/[^/?#]+\/?$/i.test(url.pathname);
};

/** Full saved answer only. Citation URLs, seller redirects and recipe links are not product listings. */
export const inspectAnswerProductListings = (
  answer: AiCapture,
  now = Date.now(),
): ListingEligibility => {
  const full = replayShoppingCapture(answer, now);
  if (full.completeness.status !== "complete")
    return {
      status: "held",
      reason:
        full.completeness.reason ?? "The full answer is incomplete or changed.",
    };
  const cards = parseShoppingAnswerCards(full.answerText);
  if (cards.status === "invalid")
    return { status: "held", reason: cards.reason };
  const entries: ShoppingProductListings["entries"] =
    cards.status === "parsed"
      ? cards.sections.flatMap((section) =>
          section.cards.map((card) => ({
            format: "product-card" as const,
            title: card.title,
            url: card.href,
            start: card.start,
            end: card.end,
            rawHash: card.rawHash,
          })),
        )
      : [
          ...full.answerText.matchAll(
            /\[([^\]\r\n]+)\]\((https:\/\/[^\s)]+)\)/g,
          ),
        ].flatMap((match) => {
          const start = match.index;
          const before = full.answerText.slice(
            full.answerText.lastIndexOf("\n", start - 1) + 1,
            start,
          );
          const title = (match[1] ?? "").replace(/[*_]/g, "").trim();
          const url = match[2] ?? "";
          if (
            !/^\s*(?:[-+*]|\d+[.)])\s+(?:\*\*)?$/.test(before) ||
            !title ||
            title.length > 600 ||
            /^(?:here|shop|products?|read more|learn more)$/i.test(title) ||
            !productUrl(url)
          )
            return [];
          return [
            {
              format: "markdown-product-link" as const,
              title,
              url,
              start,
              end: start + match[0].length,
              rawHash: digest(match[0]),
            },
          ];
        });
  if (!entries.length)
    return { status: "no-gap", reason: NO_LINKED_PRODUCTS_REASON };
  return {
    status: "eligible",
    proof: shoppingProductListingsSchema.parse({
      version: PRODUCT_LISTING_ABSENCE_VERSION,
      sourceId: answer.source.id,
      answerHash: full.answerHash,
      linksHash: full.linksHash,
      entries: entries.slice(0, 20),
    }),
  };
};

/** Explicit current gate for an existing immutable receipt; it never rewrites its historical outcome. */
export const currentAbsenceEligibility = (
  evidence: Evidence,
  receipt: ShoppingResearch,
  now = Date.now(),
): ListingEligibility | { status: "not-applicable" } => {
  const problem = validateAutomaticResearch(evidence, receipt, 7, {}, now);
  if (problem) return { status: "held", reason: problem };
  return receipt.selected.kind === "discovery-absence"
    ? inspectAnswerProductListings(evidence.answer, now)
    : { status: "not-applicable" };
};

export const projectProductListingProof = (
  evidence: Evidence,
  receipt: ShoppingResearch,
  now = Date.now(),
) => {
  const checked = currentAbsenceEligibility(evidence, receipt, now);
  if (checked.status !== "eligible") return checked;
  return {
    status: "eligible" as const,
    proof: checked.proof,
    receipt: shoppingResearchSchema.parse({
      ...receipt,
      discovery: { ...receipt.discovery, productListings: checked.proof },
    }),
  };
};

/** Absence of the additive proof keeps old receipt replay unchanged. */
export const validateProductListingProof = (
  evidence: Evidence,
  receipt: ShoppingResearch,
  now = Date.now(),
): string | null => {
  const saved = receipt.discovery?.productListings;
  if (!saved) return null;
  if (receipt.selected.kind !== "discovery-absence")
    return "Linked-product absence proof belongs only to an absence finding.";
  const replayed = inspectAnswerProductListings(evidence.answer, now);
  return replayed.status !== "eligible"
    ? replayed.reason
    : isDeepStrictEqual(saved, replayed.proof)
      ? null
      : "The linked-product proof changed from the complete saved answer.";
};
