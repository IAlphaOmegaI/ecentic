import { getLocale, getMessages } from "next-intl/server";
import { SectionGutter } from "@/app/[locale]/(main)/dashboard/_components/grid";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import { PublishedFiles } from "@/components/marketing/interactive/published-files";
import { MarketingLightBand } from "@/components/marketing/light-band";
import { MarketingPage, marketingMetadata } from "@/components/marketing/page";
import {
  MarketingActions,
  MarketingBand,
  MarketingScreenshot,
} from "@/components/marketing/primitives";
import { ExplodedFigure } from "./_components/exploded-figure";
import { PlatformExplorer } from "./_components/platform-explorer";

const endpoints = [
  "/llms.txt",
  "/openapi.json",
  "/.well-known/api-catalog",
  "/.well-known/oauth-authorization-server",
  "/ucp/agent-profile",
  "/mcp",
] as const;

export const generateMetadata = async () => {
  const { enterprisePlatform } = await getMessages();
  return marketingMetadata(enterprisePlatform.overview.meta, "/platform");
};

export default async () => {
  const locale = await getLocale();
  const { enterprisePlatform, hairlinePlatform } = await getMessages();
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
      <MarketingLightBand id="explore-platform">
        <PlatformExplorer sections={stages} label={content.eyebrow} />
      </MarketingLightBand>
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
            <div className="flex min-w-0 flex-col justify-center border-accent-foreground border-l bg-background-dimmed px-7 py-14 max-sm:px-4 max-sm:py-10 max-md:border-t max-md:border-l-0">
              <p className="text-foreground-rich text-xl">ecentic.ai</p>
              <ul className="mt-6 ml-2 border-primary-text/25 border-l font-mono text-[13px] max-sm:text-xs">
                {endpoints.map((endpoint) => (
                  <li
                    key={endpoint}
                    className="relative py-2 pl-6 before:absolute before:top-5 before:left-0 before:w-4 before:border-primary-text/25 before:border-t"
                  >
                    <a
                      href={endpoint}
                      className="break-all text-primary-text decoration-primary-text/40 underline-offset-4 hover:underline"
                    >
                      {endpoint}
                    </a>
                  </li>
                ))}
              </ul>
              <code className="mt-8 block border-accent-foreground border-t pt-6 font-mono text-[13px] text-foreground-rich">
                npx @ecentic/cli
              </code>
              {developers.note && (
                <p className="mt-4 max-w-[50ch] text-foreground-dimmed text-sm leading-relaxed">
                  {developers.note}
                </p>
              )}
            </div>
          </div>
          <PublishedFiles />
        </MarketingBand>
      )}
    </MarketingPage>
  );
};
