import { getMessages } from "next-intl/server";
import { MarketingPage, marketingMetadata } from "@/components/marketing/page";

export const generateMetadata = async () => {
  const { enterpriseCompany } = await getMessages();
  return marketingMetadata(enterpriseCompany.contact.meta, "/contact");
};

export default async () => {
  const { enterpriseCompany } = await getMessages();
  return <MarketingPage content={enterpriseCompany.contact} path="/contact" />;
};
