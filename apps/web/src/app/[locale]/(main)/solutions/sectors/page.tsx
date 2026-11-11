import { getMessages } from "next-intl/server";
import { SectionGutter } from "@/app/[locale]/(main)/dashboard/_components/grid";
import {
  MarketingPage,
  MarketingSection,
  marketingMetadata,
} from "@/components/marketing/page";
import { MarketingHeading } from "@/components/marketing/primitives";
import { SolutionFeatureBand } from "../_components/feature-band";
import { IndexExplorer } from "./_components/index-explorer";

export const generateMetadata = async () => {
  const { enterpriseSolutions } = await getMessages();
  return marketingMetadata(
    enterpriseSolutions.sectorIndex.meta,
    "/solutions/sectors",
  );
};

export default async () => {
  const { enterpriseSolutions, sectorsIndexPage } = await getMessages();
  const content = enterpriseSolutions.sectorIndex;
  const directory = content.sections.find(
    (section) => section.id === "sectors",
  );
  const sectors = Object.entries(enterpriseSolutions.sectors).flatMap(
    ([slug, sector]) => {
      const item = directory?.items?.find(
        (entry) => entry.href === `/solutions/sectors/${slug}`,
      );
      const attributes = sector.sections.find(
        (section) => section.id === "attributes",
      );
      if (!item || !attributes?.items) return [];

      return [
        {
          title: item.title,
          href: item.href,
          question: item.label,
          description: item.body,
          attributes: attributes.items,
          note: attributes.note ?? "",
        },
      ];
    },
  );

  return (
    <MarketingPage
      content={{ ...content, sections: [] }}
      path="/solutions/sectors"
      heroArtwork="bag"
    >
      <SolutionFeatureBand
        id="sectors"
        className="[&>.marketing-rail>.marketing-guides]:hidden"
      >
        <MarketingHeading
          title={directory?.title ?? content.title}
          description={sectorsIndexPage.description}
          className="py-12 max-sm:py-8"
        />
        <IndexExplorer
          title={directory?.title ?? content.title}
          sectors={sectors}
          copy={sectorsIndexPage}
        />
      </SolutionFeatureBand>
      <SectionGutter />
      {content.sections
        .filter((section) => section.id !== "sectors")
        .map((section) => (
          <MarketingSection key={section.id} section={section} />
        ))}
    </MarketingPage>
  );
};
