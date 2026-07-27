import { FaceSearchIcon } from "@zenncore/icons";
import { IndexSection } from "@/app/(main)/_components/index-section";

const audiences = [
  {
    title: "Evaluating the category",
    description:
      "Teams researching AI for Shopify stores and deciding what belongs in the stack.",
  },
  {
    title: "Complementing Shopify Magic",
    description:
      "Merchants looking for an alternative or complement to native content generation.",
  },
  {
    title: "Tying changes to outcomes",
    description:
      "Operators who want listing improvements tied to measurable competitive results.",
  },
  {
    title: "Closing the publishing loop",
    description:
      "Stores that need a tighter loop between catalog insight and what actually ships.",
  },
] as const;

const body = [
  "Most Shopify teams already have the basics: a storefront, a catalog, and a merchandising workflow. The real challenge is that product visibility now depends on more than theme design or ad performance. Titles, descriptions, attributes, and competitor context all shape whether a product feels easy to recommend.",
  "The most useful AI workflow for Shopify stores goes beyond generation alone. Merchants need to know which products underperform, which competitor listing keeps winning, and which changes are worth shipping first.",
] as const;

export const Why = () => (
  <IndexSection
    number="01"
    icon={FaceSearchIcon}
    title="Why Shopify merchants outgrow native AI."
    description="Most Shopify merchants eventually hit a ceiling with native generation tools. This is what comes next."
    body={body}
    label="Who this decision point fits"
    items={audiences}
  />
);
