import { getMessages } from "next-intl/server";
import { StoreCheck } from "@/components/marketing/interactive/store-check";
import { MarketingPage, marketingMetadata } from "@/components/marketing/page";
import { SectionGutter } from "../dashboard/_components/grid";
import { ToolsDirectory } from "./_components/tools-directory";

export const generateMetadata = async () => {
  const { enterpriseCompany } = await getMessages();
  return marketingMetadata(enterpriseCompany.tools.meta, "/tools");
};

export default async () => {
  const { enterpriseCompany, toolsPage } = await getMessages();
  const content = enterpriseCompany.tools;

  return (
    <MarketingPage
      heroChildren={
        <StoreCheck
          secondaryAction={content.actions.find(
            (action) => action.href !== "/sign-up",
          )}
        />
      }
      content={{ ...content, actions: [], sections: [] }}
      path="/tools"
      heroArtwork="console"
    >
      <SectionGutter />
      {content.sections.map((section) => (
        <ToolsDirectory key={section.id} section={section} copy={toolsPage} />
      ))}
      <SectionGutter />
    </MarketingPage>
  );
};
