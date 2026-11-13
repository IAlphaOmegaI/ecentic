import { DealRedemptionForm } from "../../_components/deal-redemption-form";

const cohorts = ["2025", "2024", "2023", "2022", "2021", "Earlier", "Other"];

export const TechstarsRedemptionForm = () => (
  <DealRedemptionForm merchant="techstars" batches={cohorts} />
);
