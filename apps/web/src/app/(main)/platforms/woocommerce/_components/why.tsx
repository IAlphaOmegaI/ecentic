import { FaceSearchIcon } from "@zenncore/icons";
import { IndexSection } from "@/app/(main)/_components/index-section";

const audiences = [
  {
    title: "Researching AI workflows",
    description:
      "WooCommerce operators evaluating what AI should actually do for product pages.",
  },
  {
    title: "Staying on WooCommerce",
    description:
      "Teams that want better product visibility without changing ecommerce platforms.",
  },
  {
    title: "Insight tied to updates",
    description:
      "Merchants who need competitor analysis connected directly to listing changes.",
  },
  {
    title: "Diagnosis to publishing",
    description:
      "Buyers checking whether a workflow can move from analysis all the way to the live store.",
  },
] as const;

const body = [
  "AI for WooCommerce stores is not only about faster content creation. WooCommerce catalogs change quickly, are managed by lean operators, and depend on clean product data to compete well.",
  "That creates a practical need for a dedicated optimization loop. Merchants want to know which products are easiest to improve, which competitor keeps winning, and which listing details matter most before they spend time rewriting dozens of pages.",
] as const;

export const Why = () => (
  <IndexSection
    number="01"
    icon={FaceSearchIcon}
    title="Why WooCommerce merchants need a focused loop."
    description="WooCommerce operators usually need catalog-level insight, not just faster copy output."
    body={body}
    label="Who this page is built for"
    items={audiences}
  />
);
