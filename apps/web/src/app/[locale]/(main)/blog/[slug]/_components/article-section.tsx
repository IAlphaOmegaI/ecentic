import { cn } from "@zenncore/utils";
import type { ReactNode } from "react";

export const ArticleSection = ({
  id,
  title,
  summary = false,
  children,
}: ArticleSection.Props) => (
  <section
    id={id}
    className={cn(
      "scroll-mt-28 [&+section]:mt-12",
      summary &&
        "border-accent-foreground border-y bg-background-dimmed p-6 max-sm:px-4",
    )}
  >
    {title && (
      <h2 className="mb-6 text-3xl xl:text-4xl leading-tight tracking-tight">
        {title}
      </h2>
    )}
    <div className="text-base text-foreground-dimmed leading-relaxed [overflow-wrap:anywhere] [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-primary-text [&_a:focus-visible]:outline-offset-4 [&_a:hover]:decoration-2 [&_a]:underline-offset-4 [&_p]:leading-relaxed">
      {children}
    </div>
  </section>
);

export namespace ArticleSection {
  export type Props = {
    id: string;
    title?: string;
    summary?: boolean;
    children: ReactNode;
  };
}

/** Receives only the existing blog splitter's sanitized, table-wrapped output. */
export const ArticleHtml = ({ html }: { html: string }) => (
  <div
    className="blog-content [&_h2]:text-(length:--text-3xl) [&_h3]:text-(length:--text-2xl) [&_h4]:text-(length:--text-xl) [&_figcaption]:text-(length:--text-sm) [&_pre]:text-(length:--text-sm) min-w-0 max-w-full [&>:first-child]:mt-0 [&_.blog-table-scroll:focus-visible]:outline-2 [&_.blog-table-scroll:focus-visible]:outline-primary-text [&_.blog-table-scroll:focus-visible]:outline-offset-4 [&_.blog-table-scroll>table]:m-0 [&_.blog-table-scroll>table]:w-max [&_.blog-table-scroll>table]:min-w-full [&_.blog-table-scroll>table]:max-w-none [&_.blog-table-scroll]:my-8 [&_.blog-table-scroll]:max-w-full [&_.blog-table-scroll]:overflow-x-auto [&_:is(th,td)]:border [&_:is(th,td)]:border-accent-foreground [&_:is(th,td)]:px-4 [&_:is(th,td)]:py-2 [&_:is(th,td)]:text-left [&_:is(th,td)]:[overflow-wrap:anywhere] [&_:not(pre)>code]:border [&_:not(pre)>code]:border-accent-foreground [&_:not(pre)>code]:bg-background-dimmed [&_:not(pre)>code]:px-1 [&_:not(pre)>code]:text-foreground [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-primary-text [&_a:focus-visible]:outline-offset-4 [&_a:hover]:decoration-2 [&_a]:text-primary-text [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:my-8 [&_blockquote]:border-accent-foreground [&_blockquote]:border-l-4 [&_blockquote]:pl-6 [&_blockquote]:italic [&_code]:font-mono [&_code]:text-sm [&_figcaption]:mt-2 [&_figcaption]:text-center [&_figure]:my-8 [&_h2]:mt-12 [&_h2]:mb-6 [&_h2]:scroll-mt-28 [&_h2]:font-heading [&_h2]:font-medium [&_h2]:text-foreground [&_h2]:leading-tight [&_h3]:mt-8 [&_h3]:mb-4 [&_h3]:scroll-mt-28 [&_h3]:font-heading [&_h3]:font-medium [&_h3]:text-foreground [&_h3]:leading-tight [&_h4]:mt-6 [&_h4]:mb-2 [&_h4]:scroll-mt-28 [&_h4]:font-heading [&_h4]:font-medium [&_h4]:text-foreground [&_hr]:my-10 [&_hr]:border-0 [&_hr]:border-accent-foreground [&_hr]:border-t [&_img]:my-8 [&_img]:h-auto [&_img]:max-w-full [&_li]:my-2 [&_ol]:my-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-6 [&_pre]:my-8 [&_pre]:min-w-0 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:border [&_pre]:border-accent-foreground [&_pre]:bg-background-dimmed [&_pre]:p-4 [&_pre]:text-foreground [&_table]:my-6 [&_table]:w-full [&_table]:max-w-full [&_table]:border-collapse [&_table]:text-base [&_th]:bg-background-dimmed [&_th]:font-semibold [&_th]:text-foreground [&_ul]:my-6 [&_ul]:list-disc [&_ul]:pl-6"
    // biome-ignore lint/security/noDangerouslySetInnerHtml: Preserves the HTML returned by splitBlogHtmlByH2, including its sanitizer and table wrappers.
    dangerouslySetInnerHTML={{ __html: html }}
  />
);
