import { getMessages } from "next-intl/server";
import { MarketingPage } from "@/components/marketing/page";

/**
 * Editorial template only. No page.tsx exposes it and no public route or sitemap
 * links to it. Publish only after every research TODO and the PDF are reviewed.
 */
export const ResearchDraft = async () => {
  const { enterpriseCompany } = await getMessages();
  return (
    <MarketingPage
      content={enterpriseCompany.researchDraft}
      path="/research/ai-shopping-simulations"
    />
  );
};
