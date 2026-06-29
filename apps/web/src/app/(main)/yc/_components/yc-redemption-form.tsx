import { DealRedemptionForm } from "../../_components/deal-redemption-form";

const batches = [
  "Fall 2025",
  "Summer 2025",
  "Spring 2025",
  "Winter 2025",
  "Summer 2024",
  "Winter 2024",
  "Earlier",
  "Other",
];

export const YcRedemptionForm = () => (
  <DealRedemptionForm
    merchant="ycombinator"
    batchLabel="YC batch"
    batchPlaceholder="Select your batch"
    batches={batches}
    cta="Redeem my YC deal"
  />
);
