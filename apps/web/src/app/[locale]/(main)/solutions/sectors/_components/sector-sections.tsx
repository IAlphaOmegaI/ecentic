import { getMessages, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import type { MarketingPage } from "@/components/marketing/page";
import {
  MarketingBand,
  MarketingHeading,
} from "@/components/marketing/primitives";
import { Plus } from "@/components/plus";
import { type Sector, sectorShelves } from "@/content/sectors";
import { SolutionFeatureBand } from "../../_components/feature-band";
import { SectorConversation } from "./sector-conversation";

export const SectorQuestions = async ({
  section,
  sector,
  children,
}: SectorSections.Props) => {
  const {
    enterpriseSolutions,
    interactiveShelf,
    round14Sectors,
    round16Shopping,
  } = await getMessages();
  const translate = await getTranslations("round14Sectors");
  const attributes =
    enterpriseSolutions.sectors[sector].sections.find(
      (entry) => entry.id === "attributes",
    )?.items ?? [];
  return (
    <MarketingBand
      id={section.id}
      className="[&>.marketing-rail>.marketing-guides]:hidden"
    >
      <MarketingHeading
        eyebrow={section.eyebrow}
        title={section.title}
        description={round14Sectors.introduction}
      />
      <SectorConversation
        sector={sector}
        questions={section.items ?? []}
        attributes={attributes}
        scenarios={sectorShelves[sector]}
        records={interactiveShelf.sectors[sector].scenarios}
        responses={sectorShelves[sector].map((scenario, index) =>
          translate("assistantFinding", {
            product:
              interactiveShelf.sectors[sector].scenarios[index]?.leftTitle ??
              "",
            fields: scenario.missing
              .map((position) => attributes[position]?.title)
              .filter(Boolean)
              .join(" · "),
          }),
        )}
        copy={round14Sectors}
        language={round16Shopping}
      />
      {children}
    </MarketingBand>
  );
};

export const SectorAttributes = async ({
  section,
  children,
}: SectorSections.Props) => {
  const { round14Sectors } = await getMessages();
  return (
    <SolutionFeatureBand
      id={section.id}
      className="[&>.marketing-rail>.marketing-guides]:hidden"
    >
      <MarketingHeading
        eyebrow={section.eyebrow}
        title={section.title}
        description={section.description ?? round14Sectors.attributesIntro}
      />
      <aside
        data-sector-qualification
        className="marketing-surface relative grid gap-4 border-accent-foreground border-y bg-background-rich px-4 py-6 sm:px-8 md:grid-cols-[1fr_2fr] md:gap-8"
      >
        <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
        <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
        <h3 className="font-heading text-foreground-rich text-xl">
          {round14Sectors.qualification}
        </h3>
        <p className="max-w-[70ch] text-foreground-dimmed text-sm leading-relaxed">
          {section.note}
        </p>
      </aside>
      {children}
    </SolutionFeatureBand>
  );
};

namespace SectorSections {
  export type Props = {
    section: MarketingPage.Section;
    sector: Sector;
    children?: ReactNode;
  };
}
