import type { ProductInsight } from "./outbound-product-insight";
import {
  type ShoppingFinding,
  shoppingCopy,
} from "./outbound-shopping-research";

export const DEFAULT_FINDING_COPY = {
  barcodeObservation:
    "your store has a barcode for it, but the barcode isn't in the data on the product page",
  barcodeConsequence:
    "it's harder for the AI to tell your listing is the same product it sees at other stores, so it may point people somewhere else",
  barcodeAskAbout: "where to buy it",
  reviewsObservation:
    "it shows {reviewCount} reviews on the page, but the rating isn't in the data AI shopping tools read",
  reviewsConsequence:
    "an AI assistant comparing options may treat it as unrated",
  reviewsAskAbout: "for a {category}",
  noBarcodeObservation:
    "there's no barcode for it on the page or in your store's product data",
  noBarcodeConsequence:
    "AI shopping tools use barcodes to tell products apart, so it's harder for them to be sure which one yours is",
  noBarcodeAskAbout: "for a {category}",
  noProductObservation:
    "the page doesn't carry the product's name, price or stock in the data AI shopping tools read",
  noProductConsequence: "AI assistants have less to go on",
  noProductAskAbout: "for a {category}",
  publishedProductObservation: "the page highlights {productFeature}",
  publishedProductConsequence:
    "I'd check whether that detail carries through into its recommendations",
  publishedProductAskAbout: "for a {category} with {productFeature}",
};

export type FindingCopy = typeof DEFAULT_FINDING_COPY;
export const FINDING_COPY_FIELDS = Object.keys(
  DEFAULT_FINDING_COPY,
) as (keyof FindingCopy)[];

export const usesFindingFormula = (settings: { bodyTemplate: string }) =>
  /\{(?:consequence|askAbout)\}/.test(settings.bodyTemplate);

/** Match complete controlled paragraphs, so retaining a phrase cannot conceal a stronger claim. */
export const preservesControlledParagraphs = (
  body: string,
  original: string,
  phrases: string[],
) => {
  const paragraphs = (value: string) =>
    value
      .replaceAll("\r\n", "\n")
      .split(/\n[ \t]*\n/)
      .map((paragraph) => paragraph.trim())
      .filter((paragraph) =>
        phrases.some((phrase) => paragraph.includes(phrase)),
      );
  return (
    phrases.every((phrase) => phrase && original.includes(phrase)) &&
    JSON.stringify(paragraphs(body)) === JSON.stringify(paragraphs(original))
  );
};

export const findingCopy = (
  prospect: {
    gap: string;
    reviewCount?: string;
    productCategory?: string;
    productInsight?: ProductInsight | null;
    shoppingResearchId?: string;
    shoppingFinding?: ShoppingFinding | null;
  },
  settings: FindingCopy,
) => {
  if (prospect.gap === "shopping-research") return shoppingCopy(prospect);
  const prefix = {
    "barcode-missing-from-page-data": "barcode",
    "rating-missing-from-page-data": "reviews",
    "barcode-not-observed": "noBarcode",
    "product-data-not-observed": "noProduct",
    "product-published-data": "publishedProduct",
  }[prospect.gap] as
    | "barcode"
    | "reviews"
    | "noBarcode"
    | "noProduct"
    | "publishedProduct"
    | undefined;
  if (!prefix) return null;
  const fill = (value: string) =>
    value
      .replaceAll("{reviewCount}", prospect.reviewCount || "{reviewCount}")
      .replaceAll(
        "{productFeature}",
        prospect.productInsight?.feature || "{productFeature}",
      )
      .replaceAll("{category}", prospect.productCategory || "{category}");
  return {
    finding: fill(settings[`${prefix}Observation`]),
    consequence: fill(settings[`${prefix}Consequence`]),
    askAbout: fill(settings[`${prefix}AskAbout`]),
  };
};
