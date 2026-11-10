import { getMessages } from "next-intl/server";
import { MarketingPage, marketingMetadata } from "@/components/marketing/page";

export const generateMetadata = async () => {
  const { enterpriseCompany } = await getMessages();
  return marketingMetadata(enterpriseCompany.tools.meta, "/tools");
};

export default async () => {
  const { enterpriseCompany } = await getMessages();
  return <MarketingPage content={enterpriseCompany.tools} path="/tools" />;
};
