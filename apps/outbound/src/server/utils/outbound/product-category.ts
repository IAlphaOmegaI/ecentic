import type { ProspectInput } from "@/lib/outbound";
import { normalizeProductCategory } from "@/lib/outbound-product-category";
import { ValidationError } from "@/server/utils/error";
import type { SourceReceipt } from "./automation-qualification";

export const productCategoryCorrection = (qualification: {
  details: Partial<ProspectInput>;
  receipts: SourceReceipt[];
}) => {
  const details = qualification.details;
  const before = details.productCategory ?? "";
  const after = normalizeProductCategory(before, details.product ?? "");
  if (before === after) return null;
  const receipt = qualification.receipts.find(
    (receipt) =>
      receipt.kind === "product" &&
      receipt.url === details.productUrl &&
      receipt.checkedAt === details.evidenceCheckedAt &&
      receipt.excerpt.includes(details.product ?? ""),
  );
  if (
    !details.product ||
    !details.productUrl ||
    !after ||
    after.length > 100 ||
    !receipt
  )
    throw new ValidationError(
      "The product category correction has no matching original product receipt.",
    );
  return {
    kind: "sourced-product-category" as const,
    before,
    after,
    product: details.product,
    productUrl: details.productUrl,
    receiptSha256: receipt.sha256,
    receiptCheckedAt: receipt.checkedAt,
  };
};
