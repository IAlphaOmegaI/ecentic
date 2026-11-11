import { getMessages } from "next-intl/server";
import { Suspense } from "react";
import { MarketingPage, marketingMetadata } from "@/components/marketing/page";
import { EditorialArticles } from "./_components/editorial-articles";
import { ResourcesDirectory } from "./_components/resources-directory";
import { EditorialArticlesSkeleton } from "./_components/skeletons";

export const generateMetadata = async () => {
  const { enterpriseCompany } = await getMessages();
  return marketingMetadata(enterpriseCompany.resources.meta, "/resources");
};

export default async () => {
  const { enterpriseCompany, resourcesPage } = await getMessages();
  const content = enterpriseCompany.resources;

  return (
    <MarketingPage content={{ ...content, sections: [] }} path="/resources">
      <ResourcesDirectory
        sections={content.sections}
        copy={resourcesPage}
        editorial={
          <Suspense
            fallback={
              <EditorialArticlesSkeleton label={content.editorial.loading} />
            }
          >
            <EditorialArticles />
          </Suspense>
        }
      />
    </MarketingPage>
  );
};
