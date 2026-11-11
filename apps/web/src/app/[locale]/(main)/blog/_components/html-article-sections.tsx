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
                className="blog-content [&_h2]:text-(length:--text-2xl) [&_h3]:text-(length:--text-xl) [&_h4]:text-(length:--text-lg) [&_figcaption]:text-(length:--text-sm) [&_pre]:text-(length:--text-sm) min-w-0 max-w-full text-[1.0625rem] text-foreground-dimmed leading-[1.75] [&>:first-child]:mt-0 [&_.blog-table-scroll:focus-visible]:outline-2 [&_.blog-table-scroll:focus-visible]:outline-primary-text [&_.blog-table-scroll:focus-visible]:outline-offset-4 [&_.blog-table-scroll>table]:m-0 [&_.blog-table-scroll>table]:w-max [&_.blog-table-scroll>table]:min-w-full [&_.blog-table-scroll>table]:max-w-none [&_.blog-table-scroll]:my-6 [&_.blog-table-scroll]:max-w-full [&_.blog-table-scroll]:overflow-x-auto [&_:is(th,td)]:border [&_:is(th,td)]:border-accent-foreground [&_:is(th,td)]:px-3 [&_:is(th,td)]:py-2 [&_:is(th,td)]:text-left [&_:is(th,td)]:[overflow-wrap:anywhere] [&_:not(pre)>code]:border [&_:not(pre)>code]:border-accent-foreground [&_:not(pre)>code]:bg-background-dimmed [&_:not(pre)>code]:px-[0.35rem] [&_:not(pre)>code]:py-[0.15rem] [&_:not(pre)>code]:text-foreground [&_a:hover]:decoration-2 [&_a]:text-primary-text [&_a]:underline [&_a]:underline-offset-2 [&_blockquote]:my-6 [&_blockquote]:border-accent-foreground [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_blockquote]:text-foreground-dimmed [&_blockquote]:italic [&_code]:font-mono [&_code]:text-[0.9em] [&_figcaption]:mt-2 [&_figcaption]:text-center [&_figcaption]:text-foreground-dimmed [&_figure]:my-6 [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:font-heading [&_h2]:font-medium [&_h2]:text-foreground [&_h2]:leading-[1.3] [&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:font-heading [&_h3]:font-medium [&_h3]:text-foreground [&_h4]:mt-6 [&_h4]:mb-2 [&_h4]:font-heading [&_h4]:font-medium [&_h4]:text-foreground [&_hr]:my-10 [&_hr]:border-0 [&_hr]:border-accent-foreground [&_hr]:border-t [&_img]:my-6 [&_img]:h-auto [&_img]:max-w-full [&_li]:my-2 [&_ol]:my-5 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-5 [&_pre]:my-6 [&_pre]:min-w-0 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:border [&_pre]:border-accent-foreground [&_pre]:bg-background-dimmed [&_pre]:p-4 [&_pre]:text-foreground [&_table]:my-6 [&_table]:w-full [&_table]:max-w-full [&_table]:border-collapse [&_table]:text-[0.95rem] [&_th]:bg-background-dimmed [&_th]:font-semibold [&_th]:text-foreground [&_ul]:my-5 [&_ul]:list-disc [&_ul]:pl-6"
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
