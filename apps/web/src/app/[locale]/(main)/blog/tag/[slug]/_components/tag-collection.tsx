import { ArrowRightIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import type { getMessages } from "next-intl/server";
import { Plus } from "@/components/plus";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { blogImage } from "@/lib/blog-image";
import type * as Blog from "@/server/app/blog";

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

const TagArticleMeta = ({
  article,
  locale,
}: {
  article: Blog.Type;
  locale: Locale;
}) => (
  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-foreground-dimmed text-sm">
    <time dateTime={new Date(article.publishedAt).toISOString()}>
      {formatBlogDate(article.publishedAt, locale)}
    </time>
    <span>{article.readTime}</span>
  </div>
);

export const TagCollection = ({
  articles,
  relatedTopics,
  locale,
  copy,
  readLabel,
}: TagCollection.Props) => {
  const [featured, ...remaining] = articles;
  if (!featured) return null;
  const hasReadingRail =
    featured.takeaways.length > 0 || relatedTopics.length > 0;

  return (
    <section className="border-accent-foreground border-b">
      <div
        className={cn(
          "relative mx-auto grid w-[min(1186px,calc(100%-56px))] grid-cols-1 gap-px border-accent-foreground border-x bg-accent-foreground max-sm:w-[calc(100%-32px)]",
          hasReadingRail && "lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]",
        )}
      >
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />

        <div className="min-w-0 bg-background">
          <article aria-labelledby="tag-featured-title">
            <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-6 md:px-8">
              <p className="font-medium text-primary text-sm">
                {copy.latestArticle}
              </p>
              <TagArticleMeta article={featured} locale={locale} />
            </div>

            {featured.thumbnailUrl && (
              <div className="relative aspect-video overflow-hidden bg-background-dimmed">
                <Image
                  src={blogImage(featured.thumbnailUrl)}
                  alt=""
                  fill
                  unoptimized
                  sizes="(min-width: 1024px) 790px, 100vw"
                  className="object-cover"
                />
              </div>
            )}

            <div className="flex flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
              <h2
                id="tag-featured-title"
                className="text-3xl leading-tight md:text-4xl"
              >
                <Link
                  href={`/blog/${featured.slug}`}
                  className="transition-colors duration-160 hover:text-primary-text"
                >
                  {featured.title}
                </Link>
              </h2>
              <p className="max-w-2xl text-base text-foreground-dimmed leading-relaxed md:text-lg">
                {featured.description}
              </p>
              <div>
                <Button
                  color="primary"
                  render={<Link href={`/blog/${featured.slug}`} />}
                >
                  {readLabel}
                  <ArrowRightIcon className="size-4" />
                </Button>
              </div>
            </div>
          </article>

          {remaining.length > 0 && (
            <section
              aria-labelledby="tag-more-title"
              className="border-accent-foreground border-t"
            >
              <h2
                id="tag-more-title"
                className="px-4 pt-8 pb-4 text-2xl md:px-8"
              >
                {copy.moreArticles}
              </h2>
              {remaining.map((article) => (
                <article
                  key={article.slug}
                  className="border-accent-foreground border-b last:border-b-0"
                >
                  <Link
                    href={`/blog/${article.slug}`}
                    className="group grid gap-4 px-4 py-8 transition-colors duration-160 hover:bg-background-dimmed focus-visible:bg-background-dimmed focus-visible:outline-offset-[-4px] md:px-8"
                  >
                    <TagArticleMeta article={article} locale={locale} />
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="text-2xl leading-tight transition-colors duration-160 group-hover:text-primary-text group-focus-visible:text-primary-text md:text-3xl">
                        {article.title}
                      </h3>
                      <ArrowRightIcon className="mt-2 size-4 shrink-0 text-primary" />
                    </div>
                    <p className="max-w-2xl text-foreground-dimmed leading-relaxed">
                      {article.description}
                    </p>
                  </Link>
                </article>
              ))}
            </section>
          )}
        </div>

        {hasReadingRail && (
          <aside className="min-w-0 bg-background">
            <div className="border-accent-foreground bg-background-dimmed lg:sticky lg:top-24 lg:border-b">
              {featured.takeaways.length > 0 && (
                <section className="border-accent-foreground px-4 py-8 md:px-8 md:py-10">
                  <h2 className="mb-6 text-2xl">{copy.takeaways}</h2>
                  <ul className="flex flex-col gap-6">
                    {featured.takeaways.slice(0, 3).map((takeaway) => (
                      <li
                        key={takeaway}
                        className="border-accent-foreground border-l-2 pl-4 text-foreground-dimmed leading-relaxed"
                      >
                        {takeaway}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {relatedTopics.length > 0 && (
                <nav
                  aria-labelledby="tag-topics-title"
                  className={cn(
                    "border-accent-foreground",
                    featured.takeaways.length > 0 && "border-t",
                  )}
                >
                  <div className="px-4 pt-8 pb-6 md:px-8 md:pt-10">
                    <h2 id="tag-topics-title" className="text-2xl">
                      {copy.relatedTopics}
                    </h2>
                    <p className="mt-4 text-foreground-dimmed text-sm leading-relaxed">
                      {copy.relatedDescription}
                    </p>
                  </div>
                  <ul>
                    {relatedTopics.map((topic) => (
                      <li
                        key={topic.slug}
                        className="border-accent-foreground border-t"
                      >
                        <Link
                          href={`/blog/tag/${topic.slug}`}
                          className="flex min-h-16 items-center justify-between gap-4 px-4 py-4 text-foreground transition-colors duration-160 hover:bg-background hover:text-primary-text focus-visible:bg-background focus-visible:text-primary-text focus-visible:outline-offset-[-4px] md:px-8"
                        >
                          <span>{topic.label}</span>
                          <ArrowRightIcon className="size-4 shrink-0" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              )}
            </div>
          </aside>
        )}
      </div>
    </section>
  );
};

export namespace TagCollection {
  export type Props = {
    articles: Blog.Type[];
    relatedTopics: { slug: string; label: string }[];
    locale: Locale;
    copy: Awaited<ReturnType<typeof getMessages>>["blogTagPage"];
    readLabel: string;
  };
}
