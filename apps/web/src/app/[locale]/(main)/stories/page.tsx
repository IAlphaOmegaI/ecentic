import Image from "next/image";
import { getMessages, getTranslations } from "next-intl/server";
import { canPublishEvidence } from "@/components/marketing/evidence-policy";
import { MarketingPage, marketingMetadata } from "@/components/marketing/page";
import { MarketingBand } from "@/components/marketing/primitives";
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
        <MarketingBand
          id="pilots"
          className="[&>.marketing-rail>.marketing-guides]:hidden"
        >
          <div className="grid min-[1000px]:grid-cols-[1fr_2fr]">
            <header className="relative flex min-w-0 flex-col items-start border-accent-foreground px-8 py-12 max-sm:px-4 max-sm:py-8 max-[1000px]:border-b min-[1000px]:border-r">
              <Image
                src={DuaFlavours}
                alt="DUA Flavours"
                className="mb-10 h-32 w-auto max-w-full object-contain object-left max-sm:mb-8 max-sm:h-28"
              />
              <h2>{pilot.title}</h2>
              <p className="mt-4 max-w-[32ch] text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
                {pilot.description}
              </p>
              {overview && (
                <dl className="mt-auto w-full pt-12">
                  {overview.rows?.slice(0, 2).map((row) => (
                    <div
                      key={row.label}
                      className="border-accent-foreground border-t py-4"
                    >
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
        </MarketingBand>
      )}
    </MarketingPage>
  );
};
