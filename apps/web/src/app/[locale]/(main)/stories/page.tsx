import Image from "next/image";
import { getMessages, getTranslations } from "next-intl/server";
import { canPublishEvidence } from "@/components/marketing/evidence-policy";
import { MarketingLightBand } from "@/components/marketing/light-band";
import { MarketingPage, marketingMetadata } from "@/components/marketing/page";
import { duaEvidence } from "@/content/marketing-evidence";
import DuaFlavours from "@/public/partners/dua-flavours.png";
import { StoriesEvidence } from "./_components/stories-evidence";

export const generateMetadata = async () => {
  const { enterpriseCompany } = await getMessages();
  return marketingMetadata(enterpriseCompany.stories.meta, "/stories");
};

export default async () => {
  const [{ enterpriseCompany, enterpriseEvidence }, translate] =
    await Promise.all([
      getMessages(),
      getTranslations("enterpriseEvidence.dua"),
    ]);
  const content = enterpriseCompany.stories;
  const pilot = content.sections.find((section) => section.id === "pilots");
  const overview = enterpriseCompany.duaFlavours.sections.find(
    (section) => section.id === "at-a-glance",
  );
  const sections = enterpriseCompany.duaFlavours.sections;
  const published = canPublishEvidence(duaEvidence.status);
  const copy = enterpriseEvidence.dua;

  return (
    <MarketingPage
      content={{
        ...content,
        sections: [],
        ...(published && pilot
          ? {
              actions: [{ label: copy.action.primary, href: "#pilots" }],
            }
          : {}),
      }}
      path="/stories"
      heroArtwork="bag"
    >
      {published && pilot && (
        <MarketingLightBand id="pilots">
          <div>
            <header className="relative grid min-w-0 items-center gap-8 px-8 py-10 max-sm:px-4 max-sm:py-8 md:grid-cols-[160px_1fr] lg:grid-cols-[180px_1.2fr_1fr]">
              <Image
                src={DuaFlavours}
                alt="DUA Flavours"
                className="h-28 w-auto max-w-full object-contain object-left"
              />
              <div>
                <h2>{pilot.title}</h2>
                <p className="mt-4 max-w-[38ch] text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
                  {pilot.description}
                </p>
              </div>
              {overview && (
                <dl className="grid gap-6 max-lg:md:col-span-2 max-lg:md:grid-cols-2 lg:border-accent-foreground lg:border-l lg:pl-8">
                  {overview.rows?.slice(0, 2).map((row) => (
                    <div key={row.label}>
                      <dt className="text-foreground-dimmed text-sm">
                        {row.label}
                      </dt>
                      <dd className="mt-1 font-medium text-foreground-rich">
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </header>
            <StoriesEvidence
              title={copy.title}
              figure={translate("figure", {
                percentage: String(duaEvidence.changePercent),
              })}
              metric={copy.metric}
              period={copy.period}
              note={copy.note}
              method={
                sections.find((section) => section.id === "method")
                  ?.paragraphs?.[0] ?? copy.note
              }
              permission={copy.permission}
              confirmed={copy.confirmed}
              source={enterpriseEvidence.sources[duaEvidence.sourceKey]}
              sourceLabel={enterpriseEvidence.presentation.source}
              sections={sections
                .filter((section) =>
                  ["result", "method", "permission"].includes(section.id),
                )
                .map(({ id, title }) => ({ id, title }))}
              action={{ label: copy.action.primary, href: duaEvidence.href }}
            />
          </div>
        </MarketingLightBand>
      )}
    </MarketingPage>
  );
};
