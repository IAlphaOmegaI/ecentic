import { getLocale, getMessages } from "next-intl/server";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import { MarketingLightBand } from "@/components/marketing/light-band";
import { MarketingPage, marketingMetadata } from "@/components/marketing/page";
import { SectionGutter } from "../dashboard/_components/grid";
import { ChangelogArchive } from "./_components/changelog-archive";

export const generateMetadata = async () => {
  const { enterpriseCompany } = await getMessages();
  return marketingMetadata(enterpriseCompany.changelog.meta, "/changelog");
};

export default async () => {
  const locale = await getLocale();
  const { enterpriseCompany, changelogPage } = await getMessages();
  const content = enterpriseCompany.changelog;
  const dateFormat = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
  const monthFormat = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    timeZone: "UTC",
  });
  const months = [
    ...new Set(content.entries.map((entry) => entry.date.slice(0, 7))),
  ];
  const groups = months.map((month) => ({
    key: month,
    label: monthFormat.format(new Date(`${month}-01T00:00:00Z`)),
    entries: content.entries
      .filter((entry) => entry.date.startsWith(month))
      .map((entry) => ({
        ...entry,
        formattedDate: dateFormat.format(new Date(`${entry.date}T00:00:00Z`)),
      })),
  }));

  return (
    <MarketingPage
      content={{ ...content, sections: [] }}
      path="/changelog"
      heroArtwork="console"
    >
      <SectionGutter />
      <MarketingLightBand id="updates">
        <div className="grid min-w-0 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <aside className="relative min-w-0 border-accent-foreground border-b bg-background-dimmed md:border-r md:border-b-0">
            <div className="p-4 sm:p-8 md:sticky md:top-24">
              <h2>{content.sections[0].title}</h2>
              <p className="mt-4 max-w-[36ch] text-foreground-dimmed">
                {content.sections[0].description}
              </p>
              <div className="mt-8 hidden h-48 text-foreground-dimmed/60 md:block">
                <EvolvingAscii artwork="console" />
              </div>
            </div>
          </aside>
          <ChangelogArchive groups={groups} copy={changelogPage} />
        </div>
      </MarketingLightBand>
    </MarketingPage>
  );
};
