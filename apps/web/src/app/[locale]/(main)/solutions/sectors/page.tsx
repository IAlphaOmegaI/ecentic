import { getMessages } from "next-intl/server";
import { MarketingPage, marketingMetadata } from "@/components/marketing/page";

export const generateMetadata = async () => {
  const { enterpriseSolutions } = await getMessages();
  return marketingMetadata(
    enterpriseSolutions.sectorIndex.meta,
    "/solutions/sectors",
  );
};

export default async () => {
  const { enterpriseSolutions } = await getMessages();
  return (
    <MarketingPage
      content={enterpriseSolutions.sectorIndex}
      path="/solutions/sectors"
    />
  );
};
