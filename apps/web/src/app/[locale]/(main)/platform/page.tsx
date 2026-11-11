import { getLocale, getMessages } from "next-intl/server";
import { SectionGutter } from "@/app/[locale]/(main)/dashboard/_components/grid";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import { PublishedFiles } from "@/components/marketing/interactive/published-files";
import { MarketingPage, marketingMetadata } from "@/components/marketing/page";
import {
  MarketingActions,
  MarketingBand,
  MarketingFeatureBand,
  MarketingScreenshot,
} from "@/components/marketing/primitives";
import { PlatformEndpointDirectory } from "./_components/endpoint-directory";
import { ExplodedFigure } from "./_components/exploded-figure";
import { PlatformExplorer } from "./_components/platform-explorer";

export const generateMetadata = async () => {
  const { enterprisePlatform } = await getMessages();
  return marketingMetadata(enterprisePlatform.overview.meta, "/platform");
};

export default async () => {
  const locale = await getLocale();
  const { enterprisePlatform, hairlinePlatform, interactiveFiles } =
    await getMessages();
  const content = enterprisePlatform.overview;
  const sections: readonly MarketingPage.Section[] = content.sections;
  const stages = sections.filter((section) => section.items?.length);
  const control = sections.find((section) => section.id === "control");
  const developers = sections.find((section) => section.id === "developers");

  return (
    <MarketingPage
      content={{ ...content, sections: [] }}
      path="/platform"
      heroIllustration={<ExplodedFigure label={hairlinePlatform.label} />}
    >
      <MarketingFeatureBand id="explore-platform">
        <PlatformExplorer sections={stages} label={content.eyebrow} />
      </MarketingFeatureBand>
      <SectionGutter />
      <MarketingBand className="[&>.marketing-rail>.marketing-guides]:hidden [&>.marketing-rail]:bg-background-dimmed">
        <div className="relative px-7 py-10 max-sm:px-4 max-sm:py-6 [&>.marketing-screenshot]:mt-0">
          <MarketingScreenshot
            src={
              locale === "es"
                ? "/screenshots/enterprise-dashboard-sample-es.png"
                : "/screenshots/enterprise-dashboard-sample.png"
            }
            alt={enterprisePlatform.screenshot.alt}
            caption={enterprisePlatform.screenshot.caption}
          />
        </div>
      </MarketingBand>
      <SectionGutter />
      {control && (
        <MarketingBand
          id={control.id}
          className="[&>.marketing-rail>.marketing-guides]:hidden [&>.marketing-rail]:bg-primary-text"
        >
          <div className="relative grid min-h-[440px] grid-cols-[7fr_5fr] overflow-hidden max-md:grid-cols-1">
            <div className="relative z-10 flex flex-col justify-center px-7 py-16 max-sm:px-4 max-sm:py-10">
              <h2 className="text-background-rich">{control.title}</h2>
              {control.paragraphs?.map((paragraph) => (
                <p
                  key={paragraph}
                  className="mt-6 max-w-[48ch] text-background-rich/85 text-lg leading-relaxed"
                >
                  {paragraph}
                </p>
              ))}
            </div>
            <div
              aria-hidden="true"
              inert
              className="relative min-h-[300px] text-background-rich/70 max-md:-mt-16 max-md:h-[300px] max-md:min-h-0"
            >
              <EvolvingAscii artwork="bag" cycle={["bag", "cart"]} />
            </div>
          </div>
        </MarketingBand>
      )}
      <SectionGutter />
      {developers && (
        <MarketingBand
          id={developers.id}
          className="[&>.marketing-rail>.marketing-guides]:hidden"
        >
          <div className="grid grid-cols-2 max-md:grid-cols-1">
            <div className="relative min-w-0 px-7 py-14 max-sm:px-4 max-sm:py-10">
              <h2>{developers.title}</h2>
              <p className="mt-6 max-w-[50ch] text-foreground-dimmed text-lg leading-relaxed">
                {developers.description}
              </p>
              <MarketingActions actions={developers.links ?? []} />
            </div>
            <PlatformEndpointDirectory
              copy={interactiveFiles}
              note={developers.note}
            />
          </div>
          <PublishedFiles />
        </MarketingBand>
      )}
    </MarketingPage>
  );
};
