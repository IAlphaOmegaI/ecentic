import { assertMerchant } from "./guard";

/** Redact before both persistence and model use. Known order references come from this return only. */
export const redactComment = (
  store: string,
  value: string,
  orderReferences: readonly string[] = [],
): string => {
  assertMerchant(store);
  const redacted = value
    .slice(0, 16_000)
    .replace(
      /[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9.-]*[A-Z0-9])?\.[A-Z]{2,}/gi,
      "[email]",
    )
    .replace(
      /\b(?:order|invoice|confirmation|receipt|tracking)\s*(?:number|no\.?|id|reference|ref\.?)?\s*[:#-]?\s*[A-Z0-9][A-Z0-9_-]*\d[A-Z0-9_-]*/gi,
      "[order]",
    )
    .replace(/#[A-Z0-9]*\d[A-Z0-9_-]*/gi, "[order]")
    .replace(
      /(?:\+?\d[\d ()\u00a0.-]{5,}\d)(?:\s*(?:ext\.?|x)\s*\d{1,6})?/gi,
      (match) => (match.replace(/\D/g, "").length >= 7 ? "[phone]" : match),
    )
    .replace(
      /\b(?:my name is|customer name|full name)\s*[:=]?\s*[^.,;\n]{1,100}/gi,
      "[name]",
    )
    .replace(
      /\b\d{1,6}\s+(?:[A-Z0-9.'-]+\s+){1,6}(?:street|st\.?|avenue|ave\.?|road|rd\.?|lane|ln\.?|drive|dr\.?|boulevard|blvd\.?)(?:\s+(?:apt|unit|suite)\.?\s*[A-Z0-9-]+)?\b/gi,
      "[address]",
    );
  return orderReferences
    .filter((reference) => reference.length >= 3)
    .reduce((comment, reference) => {
      const escaped = reference.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return comment.replace(
        new RegExp(`(?<![a-zA-Z0-9])${escaped}(?![a-zA-Z0-9])`, "gi"),
        "[order]",
      );
    }, redacted)
    .slice(0, 4000);
};
