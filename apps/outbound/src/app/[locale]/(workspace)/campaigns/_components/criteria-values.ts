import type { CampaignCriteria } from "@/lib/outbound-campaigns";

export const campaignCriteriaFormValues = (criteria: CampaignCriteria) =>
  Object.fromEntries(
    Object.entries(criteria).map(([key, value]) => [
      key,
      key === "platforms"
        ? criteria.platforms.includes("shopify") &&
          criteria.platforms.includes("woocommerce")
          ? "shopify,woocommerce"
          : criteria.platforms[0]
        : Array.isArray(value)
          ? value.join(
              ["countries", "keywords", "excludedKeywords"].includes(key)
                ? ", "
                : "\n",
            )
          : value === null
            ? ""
            : String(value),
    ]),
  );
