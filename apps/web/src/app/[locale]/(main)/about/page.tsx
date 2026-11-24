import { getMessages } from "next-intl/server";
import { GrantSupportLogos } from "@/components/marketing/grant-support-logos";
import { MarketingPage, marketingMetadata } from "@/components/marketing/page";
import { MarketingBand } from "@/components/marketing/primitives";
import { AboutBody } from "./_components/body";

export const generateMetadata = async () => {
  const { enterpriseCompany } = await getMessages();
  return marketingMetadata(enterpriseCompany.about.meta, "/about");
};

export default async () => {
  const { enterpriseCompany } = await getMessages();
  const content = enterpriseCompany.about;
  const sections = content.sections.map((section) => {
    switch (section.id) {
      case "why":
        return { ...section, paragraphs: [] };
      case "how":
      case "before":
      case "recognition":
        return { ...section, items: [] };
      default:
        return section;
    }
  });

  return (
    <MarketingPage
      content={{ ...content, sections }}
      path="/about"
      sectionTones={{ how: "light", programs: "muted" }}
      sectionChildren={{
        why: <AboutBody.Origin sections={content.sections} />,
        how: <AboutBody.Principles sections={content.sections} />,
        team: <AboutBody.Team people={content.people} />,
        before: <AboutBody.Background sections={content.sections} />,
        programs: <AboutBody.Programs programs={content.programs} />,
        recognition: <AboutBody.Recognition sections={content.sections} />,
      }}
    >
      <MarketingBand
        id="grant2026-support"
        lang="sq"
        aria-label="GRANT2026"
        className="bg-background-rich [&>.marketing-rail>.marketing-guides]:hidden"
      >
        <div className="space-y-8 px-8 py-12 max-sm:px-4 max-sm:py-8">
          <GrantSupportLogos />
          {/* The grant acknowledgement must remain verbatim in Albanian in every locale. */}
          <div className="max-w-[80ch] space-y-4">
            <p>
              Kjo platformë u ndërtua në kuadër të projektit 'Motori i Simulimit
              të Agjentëve AI për Tregtinë Elektronike' me mbështetjen e Startup
              Albania-s dhe Ministrisë së Ekonomisë dhe Inovacionit.
            </p>
            <p className="text-foreground-dimmed text-sm">
              Mendimet dhe opinionet e shprehura i përkasin autorëve dhe nuk
              përkojnë domosdoshmërisht me qëndrimet e Startup Albania-s dhe
              Ministrisë së Ekonomisë dhe Inovacionit.
            </p>
          </div>
        </div>
      </MarketingBand>
    </MarketingPage>
  );
};
