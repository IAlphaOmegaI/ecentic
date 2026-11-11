import Image from "next/image";
import { getMessages } from "next-intl/server";
import { MarketingPage, marketingMetadata } from "@/components/marketing/page";
import DuaFlavours from "@/public/partners/dua-flavours.png";
import { DuaStory } from "./_components/dua-story";

export const generateMetadata = async () => {
  const { enterpriseCompany } = await getMessages();
  return marketingMetadata(
    enterpriseCompany.duaFlavours.meta,
    "/stories/dua-flavours",
  );
};

export default async () => {
  const { enterpriseCompany } = await getMessages();
  const content = enterpriseCompany.duaFlavours;

  return (
    <MarketingPage
      content={{ ...content, sections: [] }}
      path="/stories/dua-flavours"
      heroArtwork="bag"
      heroIdentity={
        <Image
          src={DuaFlavours}
          alt="DUA Flavours"
          priority
          className="h-32 w-auto max-w-full object-contain object-left max-sm:h-24"
        />
      }
    >
      <DuaStory sections={content.sections} />
    </MarketingPage>
  );
};
