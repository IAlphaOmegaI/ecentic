import { getMessages } from "next-intl/server";
import { SectionGutter } from "@/app/[locale]/(main)/dashboard/_components/grid";
import type { MarketingBodyProps } from "@/components/marketing/body";
import { MarketingSection } from "@/components/marketing/page";
import {
  MarketingActions,
  MarketingBand,
} from "@/components/marketing/primitives";
import { Plus } from "@/components/plus";
import { SolutionFeatureBand } from "../feature-band";
import {
  AgenciesAccess,
  AgenciesChallenges,
  AgenciesTracks,
} from "./agencies-and-partners-explorer";

export const AgenciesAndPartnersBody = async ({
  sections,
  sectionChildren,
}: MarketingBodyProps) => {
  const { agenciesPage } = await getMessages();

  return (
    <>
      {sections.map((section) => {
        switch (section.id) {
          case "challenges":
            return (
              <MarketingBand
                key={section.id}
                id={section.id}
                className="[&>.marketing-rail>.marketing-guides]:hidden"
              >
                <div className="px-4 py-10 sm:px-8 sm:py-12">
                  <h2>{section.title}</h2>
                  <p className="mt-4 max-w-[60ch] text-foreground-dimmed text-lg max-sm:text-base">
                    {agenciesPage.challenges.description}
                  </p>
                </div>
                <AgenciesChallenges label={agenciesPage.challenges.details}>
                  {sectionChildren?.[section.id]}
                </AgenciesChallenges>
              </MarketingBand>
            );
          case "tracks":
            return (
              <SolutionFeatureBand
                key={section.id}
                id={section.id}
                className="[&>.marketing-rail>.marketing-guides]:hidden"
              >
                <div className="px-4 py-10 sm:px-8 sm:py-12">
                  <h2>{section.title}</h2>
                  <p className="mt-4 max-w-[60ch] text-foreground-dimmed text-lg max-sm:text-base">
                    {agenciesPage.tracks.description}
                  </p>
                </div>
                <AgenciesTracks
                  items={section.items ?? []}
                  labels={agenciesPage.tracks}
                />
                {sectionChildren?.[section.id]}
              </SolutionFeatureBand>
            );
          case "access":
            return (
              <div key={section.id}>
                <SectionGutter />
                <MarketingBand
                  id={section.id}
                  className="[&>.marketing-rail>.marketing-guides]:hidden"
                >
                  <div className="px-4 py-10 sm:px-8 sm:py-12">
                    <h2>{section.title}</h2>
                    <p className="mt-4 max-w-[66ch] text-foreground-dimmed text-lg max-sm:text-base">
                      {section.description}
                    </p>
                  </div>
                  <AgenciesAccess labels={agenciesPage.access} />
                  {section.note && (
                    <p className="border-accent-foreground border-t px-4 py-6 text-foreground-dimmed sm:px-8">
                      {section.note}
                    </p>
                  )}
                  {sectionChildren?.[section.id]}
                </MarketingBand>
              </div>
            );
          case "start":
            return (
              <MarketingBand
                key={section.id}
                id={section.id}
                className="[&>.marketing-rail>.marketing-guides]:hidden"
              >
                <div className="relative grid gap-px bg-accent-foreground md:grid-cols-[3fr_2fr]">
                  <Plus className="top-0 left-[60%] -translate-x-1/2 -translate-y-1/2 max-md:hidden" />
                  <div className="bg-background-dimmed px-4 py-10 sm:px-8 sm:py-12">
                    <h2>{section.title}</h2>
                    <p className="mt-4 max-w-[48ch] text-foreground-dimmed text-lg max-sm:text-base">
                      {agenciesPage.start.description}
                    </p>
                    <MarketingActions actions={section.links ?? []} />
                  </div>
                  <ol className="flex flex-col justify-center bg-background">
                    {agenciesPage.start.items.map((item, index) => (
                      <li
                        key={item}
                        className="flex items-center gap-6 border-accent-foreground border-b px-4 py-8 last:border-b-0 sm:px-8"
                      >
                        <span
                          aria-hidden
                          className="text-3xl text-primary-text"
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="text-lg">{item}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                {sectionChildren?.[section.id]}
              </MarketingBand>
            );
          default:
            return (
              <MarketingSection key={section.id} section={section}>
                {sectionChildren?.[section.id]}
              </MarketingSection>
            );
        }
      })}
    </>
  );
};
