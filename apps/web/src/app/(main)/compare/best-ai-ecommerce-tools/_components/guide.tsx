import { SquareChartIcon } from "@zenncore/icons";
import { IndexSection } from "@/app/(main)/_components/index-section";

const categories = [
  {
    title: "Content generation",
    description: "Product descriptions and catalog content at scale.",
  },
  {
    title: "Platform-native AI",
    description:
      "Built-in assistance for merchants staying close to their stack.",
  },
  {
    title: "Personalization & merchandising",
    description: "Onsite experiences, segmentation, and conversion.",
  },
  {
    title: "Search & discovery",
    description: "Product relevance and navigation infrastructure.",
  },
  {
    title: "Agent-commerce optimization",
    description: "AI shopping visibility and product selection.",
  },
] as const;

const body = [
  "A merchant choosing between a content generator, a personalization platform, a search product, and an agent-commerce workflow can easily end up with the wrong shortlist if everything is forced into one generic feature table.",
  "The better question is: what job are you hiring the tool to do right now? Producing content faster, personalizing the storefront, and winning AI-mediated product selection are three different jobs with three different shortlists.",
] as const;

export const Guide = () => (
  <IndexSection
    number="01"
    icon={SquareChartIcon}
    title="How to use this guide."
    description="Comparing categories first makes the final vendor decision faster and less likely to end up on the wrong shortlist."
    body={body}
    label="The five categories in this guide"
    items={categories}
  />
);
