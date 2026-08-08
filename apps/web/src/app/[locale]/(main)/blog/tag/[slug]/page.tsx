import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { readingTimeMinutes } from "babylovegrowth-next-js-blog";
import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { createMetadata } from "@/lib/seo";
import * as BabyLoveGrowth from "@/server/app/babylovegrowth";
import {
  EditorialFooter,
  EditorialLayout,
  EditorialSplitSection,
} from "../../_components/editorial-page";

const formatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const formatBlogDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return formatter.format(date);
};

type TagPageProps = {
  params: Promise<{ slug: string }>;
};

export const generateMetadata = async ({
  params,
}: TagPageProps): Promise<Metadata> => {
  const { slug } = await params;
  return createMetadata({
    title: `Articles tagged “${slug}”`,
    description: `ecentic blog articles tagged ${slug}.`,
    path: `/blog/tag/${slug}`,
  });
};

export default async ({ params }: TagPageProps) => {
  const { slug } = await params;
  const articles = await BabyLoveGrowth.listArticlesByTag(slug);

  if (articles.length === 0) notFound();

  return (
    <EditorialLayout
      eyebrow="Tag"
      title={`#${slug}`}
      meta={
        <p>
          {articles.length} {articles.length === 1 ? "article" : "articles"}
        </p>
      }
      description={`Guides and notes tagged ${slug}.`}
    >
      {articles.map((article, index) => (
        <EditorialSplitSection
          key={article.slug}
          thumbnail={article.hero_image_url || undefined}
          left={
            <>
              <span className="font-normal text-2xl text-white">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="mt-auto flex flex-col gap-2">
                <p className="text-white">
                  {formatBlogDate(article.created_at)}
                </p>
                <p className="text-sm text-white/60">
                  {Math.max(1, readingTimeMinutes(article.excerpt))} min read
                </p>
              </div>
            </>
          }
          right={
            <div className="flex h-full flex-col gap-6">
              <div>
                <h2 className="max-w-3xl text-3xl text-foreground leading-tight md:text-4xl">
                  {article.title}
                </h2>
                <p className="mt-4 max-w-3xl text-base text-foreground-dimmed leading-relaxed md:text-lg">
                  {article.meta_description || article.excerpt}
                </p>
              </div>
              <Button
                color="primary"
                className="self-start"
                render={<Link href={`/blog/${article.slug}`} prefetch={true} />}
              >
                Read article
                <ArrowRightIcon className="size-4" />
              </Button>
            </div>
          }
        />
      ))}

      <EditorialFooter
        primary={{ href: "/sign-up", label: "Get started" }}
        secondary={{ href: "/blog", label: "All articles" }}
        note="More guides for merchants improving search, shopping, and AI visibility."
      />
    </EditorialLayout>
  );
};
