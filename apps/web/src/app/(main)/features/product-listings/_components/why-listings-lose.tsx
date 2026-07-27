import { FaceSearchIcon } from "@zenncore/icons";
import { IndexSection } from "@/app/(main)/_components/index-section";

const principles = [
  {
    title: "State what the product is",
    description:
      "And who it is for, in language both shoppers and models parse quickly.",
  },
  {
    title: "Surface compared attributes",
    description:
      "The category-specific fields buyers and agents weigh most often.",
  },
  {
    title: "Keep descriptions decisive",
    description:
      "Focused on the decision at hand instead of filler that hides the details.",
  },
  {
    title: "Stay coherent everywhere",
    description:
      "Structured data, offer data, and on-page copy telling the same story.",
  },
] as const;

const body = [
  "AI shopping systems do not browse a page the way a human does. They compare titles, descriptions, structured attributes, price context, compatibility details, and trust signals in a compressed decision window. If one listing is clearer, more complete, and easier to compare, it wins before the shopper ever sees why.",
  "The fix is not stuffing a page with keywords. It is making product information easier to retrieve, evaluate, and trust.",
] as const;

export const WhyListingsLose = () => (
  <IndexSection
    number="01"
    icon={FaceSearchIcon}
    title="Why listings struggle in AI-mediated buying."
    description="Most catalog problems stem from the same gap: product data that was built for humans to browse, not for AI systems to compare."
    body={body}
    label="What winning listings do"
    items={principles}
  />
);
