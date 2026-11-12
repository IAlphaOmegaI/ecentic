import {
  BarChartIcon,
  BullseyeIcon,
  CheckBadgeIcon,
  EyeIcon,
  FileSearchIcon,
  QuoteIcon,
  SquareChartIcon,
} from "@zenncore/icons";
import { getMessages } from "next-intl/server";
import type { MarketingBodyProps } from "@/components/marketing/body";
import { AgentReplay } from "@/components/marketing/interactive/agent-replay";
import {
  type MarketingPage,
  MarketingSection,
} from "@/components/marketing/page";
import {
  MarketingActions,
  MarketingBand,
  MarketingEyebrow,
  MarketingHeading,
} from "@/components/marketing/primitives";
import { PlatformPrinciples } from "./platform-principles";
import { RiffleFigure } from "./riffle-figure";
import { SimulateRoadmap } from "./simulate-roadmap";
import { SimulateTracking } from "./simulate-tracking";
import { SimulationProcess } from "./simulation-process";

const references = [
  "simulations",
  "win-rate",
  "battlecards",
  "replay",
  "readiness",
  "listing-quality",
  "brand-visibility",
];

const SectionEnding = ({ section }: { section: MarketingPage.Section }) => (
  <>
    {section.note && (
      <p className="px-8 py-8 text-foreground-dimmed text-sm max-sm:px-4">
        {section.note}
      </p>
    )}
    {section.links && (
      <div className="px-8 pb-8 max-sm:px-4">
        <MarketingActions actions={section.links} />
      </div>
    )}
  </>
);

const RiffleIllustration = async () => {
  const { hairlineSimulate } = await getMessages();
  return <RiffleFigure label={hairlineSimulate.label} />;
};

const ProblemJourney = async ({
  items,
}: {
  items: NonNullable<MarketingPage.Section["items"]>;
}) => {
  const { reviewSimulate } = await getMessages();
  return <SimulateRoadmap items={items} labels={reviewSimulate.roadmap} />;
};

const ProcessJourney = async ({
  items,
}: {
  items: NonNullable<MarketingPage.Section["items"]>;
}) => {
  const { reviewReplay } = await getMessages();
  return <SimulationProcess items={items} labels={reviewReplay.process} />;
};

const ReferenceIcon = ({ id }: { id: string }) => {
  const icons = {
    simulations: BullseyeIcon,
    "win-rate": BarChartIcon,
    battlecards: SquareChartIcon,
    replay: QuoteIcon,
    readiness: CheckBadgeIcon,
    "listing-quality": FileSearchIcon,
    "brand-visibility": EyeIcon,
  };
  const Icon = icons[id as keyof typeof icons] ?? FileSearchIcon;
  return <Icon aria-hidden className="mb-4 size-8 text-primary-text" />;
};

export const SimulateBody = ({
  sections,
  sectionChildren,
}: MarketingBodyProps) => (
  <>
    {sections.map((section) => {
      const children = sectionChildren?.[section.id];
      switch (section.id) {
        case "problem":
          return (
            <MarketingBand
              key={section.id}
              id={section.id}
              className="[&>.marketing-rail>.marketing-guides]:hidden"
            >
              <div className="grid grid-cols-[1.1fr_1fr] max-md:grid-cols-1">
                <div className="min-w-0 bg-background">
                  <MarketingHeading
                    eyebrow={section.eyebrow}
                    title={section.title}
                    description={section.description}
                    className="pb-8 max-sm:pb-6"
                  />
                  <div className="pb-4">
                    <RiffleIllustration />
                  </div>
                </div>
                <div className="min-w-0 border-accent-foreground border-l max-md:border-t max-md:border-l-0">
                  <ProblemJourney items={section.items ?? []} />
                </div>
              </div>
              {children}
              <SectionEnding section={section} />
            </MarketingBand>
          );
        case "how-it-works":
          return (
            <MarketingBand
              key={section.id}
              id={section.id}
              className="[&>.marketing-rail>.marketing-guides]:hidden"
            >
              <MarketingHeading
                eyebrow={section.eyebrow}
                title={section.title}
                description={section.description}
              />
              <ProcessJourney items={section.items ?? []} />
              {children}
              <SectionEnding section={section} />
            </MarketingBand>
          );
        case "why-it-works":
          return (
            <PlatformPrinciples
              key={section.id}
              section={section}
              kind="simulate"
            >
              {sectionChildren?.[section.id]}
            </PlatformPrinciples>
          );
        case "what-to-track":
          return (
            <MarketingBand
              key={section.id}
              id={section.id}
              className="[&>.marketing-rail>.marketing-guides]:hidden"
            >
              <MarketingHeading
                eyebrow={section.eyebrow}
                title={section.title}
                description={section.description}
              />
              <SimulateTracking
                items={section.items ?? []}
                label={section.title}
              />
              {children}
              <SectionEnding section={section} />
            </MarketingBand>
          );
        default:
          if (references.includes(section.id))
            return (
              <MarketingBand
                key={section.id}
                id={section.id}
                className="[&>.marketing-rail>.marketing-guides]:hidden"
              >
                <div className="grid grid-cols-[1fr_2fr] gap-8 px-8 py-8 max-sm:px-4 max-md:grid-cols-1 max-md:gap-4">
                  <div>
                    <ReferenceIcon id={section.id} />
                    {section.eyebrow && (
                      <MarketingEyebrow>{section.eyebrow}</MarketingEyebrow>
                    )}
                    <h2 className="text-2xl!">{section.title}</h2>
                  </div>
                  <div className="max-w-[72ch] space-y-4 text-foreground-dimmed">
                    {section.description && <p>{section.description}</p>}
                    {section.paragraphs?.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </div>
                {children}
                {section.id === "replay" && <AgentReplay embedded />}
                <SectionEnding section={section} />
              </MarketingBand>
            );
          return (
            <MarketingSection key={section.id} section={section}>
              {children}
            </MarketingSection>
          );
      }
    })}
  </>
);
