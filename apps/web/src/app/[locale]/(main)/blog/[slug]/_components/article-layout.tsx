import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import type { AppConfig } from "next-intl";
import type { ReactNode } from "react";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import { MarketingLightBand } from "@/components/marketing/light-band";
import { MarketingShell } from "@/components/marketing/page";
import { Plus } from "@/components/plus";
import { Link } from "@/i18n/navigation";
import { TagList } from "../../_components/tag-list";
import { ArticleContents } from "./article-contents";

export const ArticleLayout = ({
  category,
  title,
  description,
  meta,
  thumbnail,
  contents,
  keywords,
  copy,
  actions,
  children,
}: ArticleLayout.Props) => (
  <MarketingShell>
    <header
      id="article-top"
      className="scroll-mt-24 border-accent-foreground border-b"
    >
      <div className="relative mx-auto w-[min(1186px,calc(100%-56px))] border-accent-foreground border-x px-8 pt-16 pb-12 max-sm:w-[calc(100%-32px)] max-sm:px-4 max-sm:pt-12 max-sm:pb-8 lg:px-12">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/blog"
            className="inline-flex min-h-10 items-center gap-2 text-foreground-dimmed text-sm hover:text-primary-text hover:underline hover:underline-offset-4"
          >
            <ArrowRightIcon className="size-4 rotate-180" />
            {actions.secondary}
          </Link>
          <span className="text-primary-text text-sm">{category}</span>
        </div>
        <h1 className="max-w-[1000px] text-[clamp(2.5rem,5vw,4.5rem)] leading-[1.04] tracking-[-0.045em]">
          {title}
        </h1>
        <p className="mt-6 max-w-[760px] text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
          {description}
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-foreground-dimmed text-sm">
          <span className="font-medium text-foreground">{copy.byline}</span>
          {meta}
        </div>
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
        <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      </div>
    </header>

    <div className="border-accent-foreground border-b">
      <div className="mx-auto grid w-[min(1186px,calc(100%-56px))] border-accent-foreground border-x max-sm:w-[calc(100%-32px)] lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="min-w-0 border-accent-foreground border-b bg-background-dimmed px-8 max-sm:px-4 lg:border-r lg:border-b-0 lg:py-12">
          <div className="lg:sticky lg:top-28 lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto lg:pr-2">
            <ArticleContents entries={contents} copy={copy} />
          </div>
        </aside>
        <article className="min-w-0 px-8 py-12 max-sm:px-4 max-sm:py-8 lg:px-12">
          <div className="mx-auto max-w-[720px]">
            {thumbnail && (
              <Image
                src={thumbnail}
                alt={title}
                width={1200}
                height={800}
                sizes="(min-width: 1024px) 720px, 100vw"
                unoptimized
                className="mb-10 h-auto w-full border border-accent-foreground"
              />
            )}
            {children}
            {keywords.length > 0 && (
              <div className="mt-12 border-accent-foreground border-t pt-8">
                <p className="mb-4 text-foreground-dimmed text-sm">
                  {copy.topics}
                </p>
                <TagList keywords={keywords} />
              </div>
            )}
          </div>
        </article>
      </div>
    </div>

    <MarketingLightBand>
      <div className="relative grid min-w-0 bg-linear-to-br from-primary/6 via-transparent to-transparent md:grid-cols-[minmax(0,1fr)_320px]">
        <div className="px-8 py-12 max-sm:px-4 max-sm:py-8 lg:px-12">
          <h2 className="max-w-[600px] text-3xl leading-tight">
            {actions.note}
          </h2>
          <div className="mt-8 flex flex-wrap gap-4">
            <Button color="neutral" render={<Link href="/blog" />}>
              <ArrowRightIcon className="size-4 rotate-180" />
              {actions.secondary}
            </Button>
            <Button color="primary" render={<Link href="/sign-up" />}>
              {actions.primary}
              <ArrowRightIcon className="size-4" />
            </Button>
          </div>
        </div>
        <div className="relative min-h-52 border-accent-foreground border-t text-primary md:border-t-0 md:border-l">
          <div className="absolute inset-4">
            <EvolvingAscii artwork="commerce" />
          </div>
        </div>
      </div>
    </MarketingLightBand>
  </MarketingShell>
);

export namespace ArticleLayout {
  export type Props = {
    category: string;
    title: string;
    description: string;
    meta: ReactNode;
    thumbnail?: string | null;
    contents: ArticleContents.Entry[];
    keywords: readonly string[];
    copy: AppConfig["Messages"]["blogArticlePage"];
    actions: { primary: string; secondary: string; note: string };
    children: ReactNode;
  };
}
