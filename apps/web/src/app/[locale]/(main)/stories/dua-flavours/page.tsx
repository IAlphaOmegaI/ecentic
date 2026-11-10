import Image from "next/image";
import { getMessages } from "next-intl/server";
import { MarketingPage, marketingMetadata } from "@/components/marketing/page";
import DuaFlavours from "@/public/partners/dua-flavours.png";

export const generateMetadata = async () => {
  const { enterpriseCompany } = await getMessages();
  return marketingMetadata(
    enterpriseCompany.duaFlavours.meta,
    "/stories/dua-flavours",
  );
};

export default async () => {
  const { enterpriseCompany } = await getMessages();
  return (
    <MarketingPage
      content={enterpriseCompany.duaFlavours}
      path="/stories/dua-flavours"
      heroChildren={
        <Image
          src={DuaFlavours}
          alt="DUA Flavours"
          className="mt-12 h-16 w-auto max-w-full object-contain object-left"
        />
      }
    />
  );
};
