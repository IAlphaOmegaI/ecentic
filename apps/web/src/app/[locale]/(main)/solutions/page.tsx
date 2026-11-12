import { ArrowRightIcon } from "@zenncore/icons";
import { getMessages } from "next-intl/server";
import { SectionGutter } from "@/app/[locale]/(main)/dashboard/_components/grid";
import { MarketingPage, marketingMetadata } from "@/components/marketing/page";
import {
  MarketingActions,
  MarketingBand,
  MarketingHeading,
} from "@/components/marketing/primitives";
import { Plus } from "@/components/plus";
import { Link } from "@/i18n/navigation";
import { SolutionFeatureBand } from "./_components/feature-band";
import {
  SolutionsAudience,
  SolutionsWorkflows,
} from "./_components/index-explorer";
import { SectorChatPreview } from "./_components/sector-chat-preview";

const businesses = [
  "brands",
  "retailers-and-marketplaces",
  "agencies-and-partners",
  "enterprise",
] as const;

export const generateMetadata = async () => {
  const { enterpriseSolutions } = await getMessages();
  return marketingMetadata(enterpriseSolutions.index.meta, "/solutions");
};

export default async () => {
  const {
    enterpriseSolutions,
    solutionsIndexPage,
    reviewSolutionsChannels: review,
  } = await getMessages();
  const content = enterpriseSolutions.index;
  const sections: readonly MarketingPage.Section[] = content.sections;
  const business = sections.find((section) => section.id === "business");
  const sectors = sections.find((section) => section.id === "sectors");
  const workflows = sections.filter(
    (section) => section.id !== "business" && section.id !== "sectors",
  );
  const audiences = businesses.map((key) => {
    const item = business?.items?.find(
      (item) => item.href === `/solutions/${key}`,
    );
    return {
      id: key,
      title: item?.title ?? enterpriseSolutions.business[key].eyebrow,
      headline: item?.body ?? enterpriseSolutions.business[key].title,
      description: enterpriseSolutions.business[key].description,
      href: `/solutions/${key}`,
      label: item?.label ?? enterpriseSolutions.business[key].title,
    };
  });

  return (
    <MarketingPage
      content={{ ...content, sections: [] }}
      path="/solutions"
      heroArtwork="commerce"
    >
      <MarketingBand
        id="business"
        className="[&>.marketing-rail>.marketing-guides]:hidden"
      >
        <MarketingHeading
          title={business?.title ?? content.title}
          description={solutionsIndexPage.businessDescription}
        />
        <SolutionsAudience
          items={audiences}
          label={business?.title ?? content.title}
        />
      </MarketingBand>
      <SectionGutter />
      <SolutionFeatureBand id="workflows">
        <MarketingHeading
          title={solutionsIndexPage.workflowsTitle}
          description={solutionsIndexPage.workflowsDescription}
        />
        <SolutionsWorkflows
          sections={workflows}
          label={solutionsIndexPage.workflowLabel}
        />
      </SolutionFeatureBand>
      <SectionGutter />
      {sectors && (
        <MarketingBand
          id={sectors.id}
          className="[&>.marketing-rail>.marketing-guides]:hidden"
        >
          <MarketingHeading
            title={sectors.title}
            description={solutionsIndexPage.sectorsDescription}
          />
          <div className="relative grid grid-cols-2 gap-px border-accent-foreground border-t bg-accent-foreground max-md:grid-cols-1">
            {sectors.items?.map((sector, index) => (
              <Link
                key={sector.href}
                href={sector.href ?? "/solutions/sectors"}
                className="group relative flex min-w-0 flex-col bg-background px-8 py-8 transition-colors duration-160 hover:bg-background-dimmed focus-visible:z-10 focus-visible:bg-background-dimmed focus-visible:-outline-offset-4 max-sm:px-4"
              >
                {index % 2 === 0 && (
                  <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 max-md:hidden" />
                )}
                <div className="flex items-start justify-between gap-6">
                  <h3 className="text-xl! leading-snug! group-hover:text-primary-text group-focus-visible:text-primary-text">
                    {sector.title}
                  </h3>
                  <ArrowRightIcon
                    aria-hidden
                    className="mt-2 size-4 shrink-0 text-primary-text"
                  />
                </div>
                <p className="mt-2 text-foreground-dimmed text-sm leading-relaxed">
                  {sector.body}
                </p>
                {review.sectors[index] && (
                  <SectorChatPreview
                    prompt={sector.label ?? sector.title}
                    example={review.sectors[index]}
                    copy={review}
                  />
                )}
              </Link>
            ))}
          </div>
          <div className="border-accent-foreground border-t px-8 py-8 max-sm:px-4 [&>.marketing-actions]:mt-0">
            <p className="mb-4 max-w-[86ch] text-foreground-dimmed text-sm leading-relaxed">
              {review.previewNote}
            </p>
            <p className="mb-6 flex flex-wrap gap-x-6 gap-y-2 text-primary-text text-sm">
              <a
                href="https://blog.google/products/ads-commerce/agentic-commerce-ai-tools-protocol-retailers-platforms/"
                className="underline underline-offset-4"
              >
                {review.googleSource}
              </a>
              <a
                href="https://help.openai.com/en/articles/11128490-improved-shopping-results-from-chatgpt-search"
                className="underline underline-offset-4"
              >
                {review.openaiSource}
              </a>
            </p>
            <MarketingActions actions={sectors.links ?? []} />
          </div>
        </MarketingBand>
      )}
    </MarketingPage>
  );
};
