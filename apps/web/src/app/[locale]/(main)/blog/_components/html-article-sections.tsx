import type { BlogHtmlSection } from "@/lib/blog-html";
import { EditorialSplitSection } from "./editorial-page";
import { TagList } from "./tag-list";

export const HtmlArticleSections = ({
  sections,
  keywords,
}: HtmlArticleSections.Props) => (
  <>
    {sections.map((section, index) => {
      const isLast = index === sections.length - 1;

      return (
        <EditorialSplitSection
          key={`${section.number}-${section.title}`}
          left={
            <>
              <span className="font-normal text-2xl text-primary">
                {section.number}
              </span>
              <h2 className="text-4xl text-foreground leading-snug">
                {section.title}
              </h2>
            </>
          }
          right={
            <div className="flex flex-col gap-8">
              <div
                className="blog-content"
                // biome-ignore lint/security/noDangerouslySetInnerHtml: CMS / translated blog HTML is trusted server content
                dangerouslySetInnerHTML={{ __html: section.html }}
              />
              {isLast && keywords && keywords.length > 0 && (
                <TagList keywords={keywords} />
              )}
            </div>
          }
        />
      );
    })}
  </>
);

export namespace HtmlArticleSections {
  export type Props = {
    sections: readonly BlogHtmlSection[];
    keywords?: readonly string[];
  };
}
