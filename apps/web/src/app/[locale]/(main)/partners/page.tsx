import { getMessages } from "next-intl/server";
import { SectionGutter } from "@/app/[locale]/(main)/dashboard/_components/grid";
import { AsciiAtmosphere } from "@/components/marketing/ascii-atmosphere";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import { MarketingLead } from "@/components/marketing/lead";
import {
  MarketingEdgeCrosses,
  MarketingLightBand,
} from "@/components/marketing/light-band";
import { MarketingPage, marketingMetadata } from "@/components/marketing/page";
import { MarketingBand } from "@/components/marketing/primitives";
import { Plus } from "@/components/plus";
import { PartnersPreparation } from "./_components/partners-preparation";

export const generateMetadata = async () => {
  const { enterpriseCompany } = await getMessages();
  return marketingMetadata(enterpriseCompany.partners.meta, "/partners");
};

export default async () => {
  const { enterpriseCompany, partnersPage } = await getMessages();
  const content = enterpriseCompany.partners;
  const tracks = content.sections.find((section) => section.id === "tracks");
  const process = content.sections.find((section) => section.id === "process");
  const application = content.sections.find(
    (section) => section.id === "application",
  );
  const steps = process?.items?.filter(
    (item) => item.title.trim() && item.body.trim(),
  );

  return (
    <MarketingPage
      content={{ ...content, sections: [] }}
      path="/partners"
      heroArtwork="commerce"
    >
      <MarketingBand
        id="tracks"
        className="[&>.marketing-rail>.marketing-guides]:hidden"
      >
        <div className="px-4 py-10 sm:px-8 sm:py-12">
          <h2>{tracks?.title}</h2>
          <p className="mt-4 max-w-[60ch] text-foreground-dimmed text-lg max-sm:text-base">
            {partnersPage.tracks.description}
          </p>
        </div>
        <div className="relative grid gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-[2fr_1fr]">
          <Plus className="top-0 left-2/3 -translate-x-1/2 -translate-y-1/2 max-md:hidden" />
          <div className="bg-background-dimmed">
            {tracks?.items?.map((item, index) => (
              <article
                key={item.title}
                className="grid grid-cols-[2rem_1fr] gap-4 border-accent-foreground border-b px-4 py-8 last:border-b-0 sm:gap-6 sm:px-8"
              >
                <span aria-hidden className="text-3xl text-primary-text">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <h3>{item.title}</h3>
                  <p className="mt-4 max-w-[58ch] text-foreground-dimmed">
                    {item.body}
                  </p>
                </div>
              </article>
            ))}
          </div>
          <div className="relative flex min-h-64 flex-col justify-end overflow-hidden bg-background-dimmed md:min-h-0">
            <div className="absolute inset-0 text-primary-text">
              <EvolvingAscii artwork="bag" />
            </div>
          </div>
        </div>
      </MarketingBand>
      <SectionGutter />
      <MarketingLightBand id="prepare">
        <PartnersPreparation copy={partnersPage.preparation} />
      </MarketingLightBand>
      <SectionGutter />
      <MarketingBand
        id="application"
        className="scroll-mt-24 [&>.marketing-rail>.marketing-guides]:hidden"
      >
        <div className="relative grid border-accent-foreground border-t lg:grid-cols-[2fr_3fr]">
          <MarketingEdgeCrosses />
          <Plus className="top-0 left-2/5 -translate-x-1/2 -translate-y-1/2 max-lg:hidden" />
          <div className="min-w-0 border-accent-foreground bg-linear-to-br from-primary/10 via-background-rich to-background-rich max-lg:border-b lg:border-r">
            <div className="px-4 pt-10 pb-8 sm:px-8 sm:pt-12 lg:sticky lg:top-24">
              <div>
                <h2>{application?.title}</h2>
                <p className="mt-4 max-w-[38ch] text-foreground-dimmed text-lg max-sm:text-base">
                  {application?.description}
                </p>
              </div>
              <AsciiAtmosphere className="pointer-events-none relative mx-auto mt-8 aspect-square w-full max-w-96 text-primary-text max-lg:max-w-72">
                <EvolvingAscii artwork="console" fit="contain" />
              </AsciiAtmosphere>
            </div>
          </div>
          <div className="min-w-0 bg-background-rich px-4 py-10 sm:px-8 sm:py-12 [&>.marketing-lead]:mt-0">
            <MarketingLead
              kind="partner"
              topic="partnership"
              title={content.formTitle}
            />
          </div>
        </div>
        {Boolean(steps?.length) && (
          <div
            id="process"
            className="relative border-accent-foreground border-t bg-background-rich"
          >
            <MarketingEdgeCrosses />
            <div className="border-accent-foreground border-b px-4 py-6 sm:px-8">
              <h3>{process?.title}</h3>
            </div>
            <ol className="grid lg:grid-cols-4">
              {steps?.map((item, index) => (
                <li
                  key={item.title}
                  className="min-w-0 border-accent-foreground px-4 py-8 max-lg:border-b max-lg:last:border-b-0 sm:px-8 lg:border-r lg:last:border-r-0"
                >
                  <span
                    aria-hidden
                    className="font-heading text-3xl text-primary-text"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p className="mt-4 font-medium text-foreground-rich">
                    {item.title}
                  </p>
                  <p className="mt-2 text-foreground-dimmed text-sm leading-relaxed">
                    {item.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        )}
      </MarketingBand>
    </MarketingPage>
  );
};
