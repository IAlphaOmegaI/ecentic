import { getMessages } from "next-intl/server";
import { MarketingLead } from "@/components/marketing/lead";
import { MarketingPage, marketingMetadata } from "@/components/marketing/page";

export const generateMetadata = async () => {
  const { enterpriseCompany } = await getMessages();
  return marketingMetadata(enterpriseCompany.partners.meta, "/partners");
};

export default async () => {
  const { enterpriseCompany } = await getMessages();
  const content = enterpriseCompany.partners;

  return (
    <MarketingPage
      content={content}
      path="/partners"
      sectionChildren={{
        application: (
          <div className="marketing-cell relative min-w-0 px-7 py-14 max-sm:px-4 max-sm:py-10 [&>h2+p]:mt-5 [&>h3+p]:mt-5 [&>p]:max-w-[70ch]">
            <MarketingLead
              kind="partner"
              topic="partnership"
              title={content.formTitle}
            />
          </div>
        ),
      }}
    />
  );
};
