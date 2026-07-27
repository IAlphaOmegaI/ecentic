import { FaceSearchIcon } from "@zenncore/icons";
import { IndexSection } from "@/app/(main)/_components/index-section";

const mappings = [
  {
    title: "Content generation",
    description: "Production speed for descriptions and catalog copy.",
  },
  {
    title: "Personalization",
    description: "Onsite relevance, segmentation, and conversion.",
  },
  {
    title: "Search tools",
    description: "Discovery and navigation inside your own store.",
  },
  {
    title: "Analytics tools",
    description: "Reporting visibility across the funnel.",
  },
  {
    title: "Agent-commerce optimization",
    description:
      "Product selection when AI systems compare competing listings.",
    emphasized: true,
  },
] as const;

const body = [
  "A common mistake is to compare every AI ecommerce product as though it were a copy tool. That makes some evaluations look simpler, but it also hides the real buying decision.",
  "Buyers usually get better results when they shortlist one tool per category first, then narrow the decision based on the bottleneck that matters most this quarter.",
] as const;

export const Bottleneck = () => (
  <IndexSection
    number="03"
    icon={FaceSearchIcon}
    title="Match the category to your bottleneck."
    description="The most useful evaluation narrows to the specific operational bottleneck first, not to the longest feature checklist."
    body={body}
    label="What each category actually improves"
    items={mappings}
  />
);
