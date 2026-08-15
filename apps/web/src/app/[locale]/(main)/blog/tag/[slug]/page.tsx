import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { localizePath } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { createMetadata } from "@/lib/seo";
import * as Blog from "@/server/app/blog";
import {
  EditorialFooter,
  EditorialLayout,
  EditorialSplitSection,
} from "../../_components/editorial-page";

const formatBlogDate = (value: Date | string, locale: Locale) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
};

type TagPageProps = {
  params: Promise<{ slug: string }>;
};

export const generateMetadata = async ({
  params,
}: TagPageProps): Promise<Metadata> => {
  const { slug } = await params;
  const locale = await getLocale();
  const translate = await getTranslations({ locale, namespace: "blog.tag" });

  return createMetadata({
    title: translate("metaTitle", { slug }),
    description: translate("metaDescription", { slug }),
    path: localizePath(`/blog/tag/${slug}`, locale),
  });
};

export default async ({ params }: TagPageProps) => {
  const { slug } = await params;
  const locale = await getLocale();
  const translate = await getTranslations("blog");

  // Slugs are shared across locales, so the Spanish row is the same article in
  // Spanish. Fall back to English whenever a translation has not landed yet —
  // an English card beats an empty tag page.
  const [englishPosts, spanishPosts] = await Promise.all([
    Blog.listPublishedByTag(slug, "en"),
    locale === "es" ? Blog.listPublishedByTag(slug, "es") : Promise.resolve([]),
  ]);

  const spanishBySlug = new Map(
    spanishPosts.map((post) => [post.slug, post] as const),
  );

  const articles = englishPosts.map(
    (post) => (locale === "es" && spanishBySlug.get(post.slug)) || post,
  );

  if (articles.length === 0) notFound();

  return (
    <EditorialLayout
      eyebrow={translate("tag.eyebrow")}
      title={`#${slug}`}
      meta={<p>{translate("tag.count", { count: articles.length })}</p>}
      description={translate("tag.description", { slug })}
    >
      {articles.map((article, index) => (
        <EditorialSplitSection
          key={article.slug}
          thumbnail={article.thumbnailUrl || undefined}
          left={
            <>
              <span className="font-normal text-2xl text-white">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="mt-auto flex flex-col gap-2">
                <p className="text-white">
                  {formatBlogDate(article.publishedAt, locale)}
                </p>
                <p className="text-sm text-white/60">
                  {translate("tag.readSuffix", { readTime: article.readTime })}
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
                  {article.description}
                </p>
              </div>
              <Button
                color="primary"
                className="self-start"
                render={<Link href={`/blog/${article.slug}`} prefetch={true} />}
              >
                {translate("tag.action.primary")}
                <ArrowRightIcon className="size-4" />
              </Button>
            </div>
          }
        />
      ))}

      <EditorialFooter
        primary={{ href: "/sign-up", label: translate("action.tertiary") }}
        secondary={{ href: "/blog", label: translate("action.allArticles") }}
        note={translate("tag.note")}
      />
    </EditorialLayout>
  );
};
