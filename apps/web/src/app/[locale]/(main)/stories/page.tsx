import { getMessages } from "next-intl/server";
import { MarketingPage, marketingMetadata } from "@/components/marketing/page";

export const generateMetadata = async () => {
  const { enterpriseCompany } = await getMessages();
  return marketingMetadata(enterpriseCompany.stories.meta, "/stories");
};

export default async () => {
  const { enterpriseCompany } = await getMessages();
  return <MarketingPage content={enterpriseCompany.stories} path="/stories" />;
};
