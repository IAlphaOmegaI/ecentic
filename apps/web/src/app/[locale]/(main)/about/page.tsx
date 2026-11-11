import { getMessages } from "next-intl/server";
import { MarketingPage, marketingMetadata } from "@/components/marketing/page";
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
      sectionChildren={{
        why: <AboutBody.Origin sections={content.sections} />,
        how: <AboutBody.Principles sections={content.sections} />,
        team: <AboutBody.Team people={content.people} />,
        before: <AboutBody.Background sections={content.sections} />,
        programs: <AboutBody.Programs programs={content.programs} />,
        recognition: <AboutBody.Recognition sections={content.sections} />,
      }}
    />
  );
};
